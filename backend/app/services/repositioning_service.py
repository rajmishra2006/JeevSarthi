from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import Ambulance, Emergency, RepositioningRecommendation, utc_now
from app.services.routing_service import calculate_route, haversine_distance
from app.core.config import settings

# Strategic standby coordinates for each zone (e.g. Central Delhi / Connaught Place, AIIMS / South, Rohini / North, Mayur Vihar / East, Dwarka / West)
ZONE_STANDBY_HUBS = {
    "North Zone": {"lat": 28.7041, "lng": 77.1025, "name": "Rohini Sector 14 Emergency Post"},
    "South Zone": {"lat": 28.5672, "lng": 77.2100, "name": "AIIMS Trauma Triangle Standby"},
    "Central Zone": {"lat": 28.6304, "lng": 77.2177, "name": "Connaught Place Rapid Response Point"},
    "East Zone": {"lat": 28.6280, "lng": 77.2950, "name": "Mayur Vihar Phase 1 Hub"},
    "West Zone": {"lat": 28.5921, "lng": 77.0460, "name": "Dwarka Sector 10 Response Bay"}
}

async def generate_repositioning_recommendations(db: Session) -> List[Dict[str, Any]]:
    """
    Analyzes zone imbalances and generates explainable standby recommendations.
    Only recommends available, non-busy ambulances from surplus zones to deficit zones.
    """
    ambulances = db.query(Ambulance).all()
    emergencies = db.query(Emergency).filter(Emergency.status.in_(["Reported", "Verified"])).all()

    zone_avail: Dict[str, List[Ambulance]] = {z: [] for z in ZONE_STANDBY_HUBS}
    zone_demands: Dict[str, int] = {z: 0 for z in ZONE_STANDBY_HUBS}

    for a in ambulances:
        if a.area in zone_avail and a.status.lower() == "available":
            zone_avail[a.area].append(a)

    for e in emergencies:
        if e.area in zone_demands:
            zone_demands[e.area] += 1

    deficit_zones = [z for z, units in zone_avail.items() if len(units) == 0 or (len(units) == 1 and zone_demands[z] > 0)]
    surplus_zones = [z for z, units in zone_avail.items() if len(units) >= 2]

    recommendations = []

    for target_z in deficit_zones:
        if not surplus_zones:
            break
        # Pick surplus zone with highest available count
        surplus_zones.sort(key=lambda sz: len(zone_avail[sz]), reverse=True)
        origin_z = surplus_zones[0]
        donor_units = zone_avail[origin_z]

        if not donor_units:
            continue

        hub = ZONE_STANDBY_HUBS[target_z]
        # Find donor ambulance closest to target hub
        best_amb = min(donor_units, key=lambda a: haversine_distance(a.latitude, a.longitude, hub["lat"], hub["lng"]))

        # Check if an active recommendation already exists for this unit
        existing = db.query(RepositioningRecommendation).filter(
            RepositioningRecommendation.ambulance_id == best_amb.ambulance_id,
            RepositioningRecommendation.status.in_(["Suggested", "Approved", "En Route to Standby"])
        ).first()

        if existing:
            continue

        # Calculate route to standby hub
        route_info = await calculate_route(
            best_amb.latitude, best_amb.longitude,
            hub["lat"], hub["lng"],
            settings.OSRM_URL
        )

        reason = (
            f"Coverage deficit detected: {target_z} has {len(zone_avail[target_z])} available ambulances with "
            f"{zone_demands[target_z]} unassigned emergency call(s). Transferring unit {best_amb.ambulance_id} "
            f"from surplus area {origin_z} (which retains {len(donor_units) - 1} standby units) to {hub['name']} "
            f"restores emergency readiness within ~{route_info['estimated_time_min']} minutes."
        )

        rec = RepositioningRecommendation(
            ambulance_id=best_amb.ambulance_id,
            origin_area=origin_z,
            target_area=target_z,
            target_lat=hub["lat"],
            target_lng=hub["lng"],
            reason=reason,
            priority="High" if len(zone_avail[target_z]) == 0 else "Medium",
            status="Suggested",
            distance_km=route_info["distance_km"],
            estimated_time_min=route_info["estimated_time_min"],
            created_at=utc_now()
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

        recommendations.append(rec)
        # remove best_amb from local donor list to avoid double-assignment
        donor_units.remove(best_amb)
        if len(donor_units) < 2:
            surplus_zones.remove(origin_z)

    # Return all active recommendations
    all_recs = db.query(RepositioningRecommendation).order_by(RepositioningRecommendation.created_at.desc()).all()
    return all_recs

def process_repositioning_action(
    db: Session,
    recommendation_id: int,
    action: str
) -> Dict[str, Any]:
    rec = db.query(RepositioningRecommendation).filter(RepositioningRecommendation.id == recommendation_id).first()
    if not rec:
        raise ValueError(f"Repositioning recommendation {recommendation_id} not found.")

    amb = db.query(Ambulance).filter(Ambulance.ambulance_id == rec.ambulance_id).first()
    if not amb:
        raise ValueError(f"Ambulance {rec.ambulance_id} not found.")

    action_lower = action.lower()

    if action_lower == "approve":
        # Eligibility check
        if amb.status.lower() != "available":
            raise ValueError(f"Cannot approve repositioning: Ambulance {amb.ambulance_id} is currently '{amb.status}' (must be Available).")
        if amb.current_incident_id:
            raise ValueError(f"Cannot approve repositioning: Ambulance {amb.ambulance_id} is assigned to active emergency {amb.current_incident_id}.")

        rec.status = "Approved"
        amb.status = "En Route" # Moving to standby
        amb.crew_notes = f"Repositioning to {rec.target_area} standby hub ({rec.reason[:50]}...)"
        amb.last_status_update = utc_now()

    elif action_lower == "mark_arrived":
        rec.status = "Arrived at Standby"
        amb.status = "Available"
        amb.area = rec.target_area
        amb.latitude = rec.target_lat
        amb.longitude = rec.target_lng
        amb.crew_notes = f"Stationed at {rec.target_area} standby hub."
        amb.last_location_update = utc_now()
        amb.last_status_update = utc_now()

    elif action_lower in ["reject", "cancel"]:
        rec.status = "Cancelled" if action_lower == "cancel" else "Rejected"
        if amb.status == "En Route" and not amb.current_incident_id:
            amb.status = "Available"
            amb.crew_notes = "Repositioning cancelled. Resumed local standby."

    else:
        raise ValueError(f"Unsupported action: {action}. Valid actions: approve, reject, cancel, mark_arrived.")

    rec.updated_at = utc_now()
    db.commit()
    db.refresh(rec)
    return {
        "success": True,
        "message": f"Repositioning {rec.id} updated to {rec.status}.",
        "recommendation": rec
    }
