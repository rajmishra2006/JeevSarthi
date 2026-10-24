from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.models import Emergency, Ambulance, Assignment, IncidentHistory, utc_now
from app.services.routing_service import calculate_route, haversine_distance
from app.core.config import settings

CAPABILITY_HIERARCHY = {
    "BLS": ["BLS", "ALS", "ICU"],
    "ALS": ["ALS", "ICU"],
    "ICU": ["ICU"],
    "NEONATAL": ["NEONATAL", "ICU"],
    "TRANSPORT": ["BLS", "ALS", "ICU", "TRANSPORT"]
}

def check_capability_match(ambulance_caps: str, required_cap: str) -> tuple[bool, str]:
    caps_upper = [c.strip().upper() for c in ambulance_caps.split(",") if c.strip()]
    req_upper = required_cap.strip().upper()

    allowed = CAPABILITY_HIERARCHY.get(req_upper, [req_upper])
    matches = any(a in caps_upper for a in allowed)

    if matches:
        return True, f"Unit supports required capability ({required_cap}) with fleet certification: {ambulance_caps}"
    else:
        return False, f"Unit lacks required capability ({required_cap}). Carries: {ambulance_caps}"

async def get_dispatch_recommendations(
    db: Session,
    incident_id: str
) -> Dict[str, Any]:
    emergency = db.query(Emergency).filter(Emergency.incident_id == incident_id).first()
    if not emergency:
        raise ValueError(f"Emergency incident {incident_id} not found.")

    ambulances = db.query(Ambulance).all()
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(minutes=settings.STALE_LOCATION_THRESHOLD_MINUTES)

    recommendations = []
    for amb in ambulances:
        # Check availability
        is_available = (amb.status.lower() == "available")
        is_eligible = is_available

        # Check location freshness
        last_update = amb.last_location_update
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        is_stale = (last_update < stale_cutoff)

        # Check capability
        cap_match, cap_reason = check_capability_match(amb.capabilities, emergency.required_capability)
        if not cap_match:
            is_eligible = False

        # Route / Distance calculation
        route_info = await calculate_route(
            amb.latitude, amb.longitude,
            emergency.latitude, emergency.longitude,
            settings.OSRM_URL
        )

        distance_km = route_info["distance_km"]
        eta_min = route_info["estimated_time_min"]

        # Scoring Algorithm (0 - 100)
        # Eligibility multiplier
        if not is_available:
            score = 5.0 # ineligible
        elif not cap_match:
            score = 15.0 # lacks capability
        else:
            # Base score: closer is higher
            # Distance penalty: 0-15km scales from 50 to 0
            dist_score = max(0.0, 50.0 - (distance_km * 3.0))
            # ETA penalty: 0-30min scales from 40 to 0
            eta_score = max(0.0, 40.0 - (eta_min * 1.2))
            freshness_score = 10.0 if not is_stale else 0.0
            score = round(dist_score + eta_score + freshness_score, 1)

        # Build clear explanation
        if not is_available:
            explanation = f"Ineligible: Currently '{amb.status}' in {amb.area} (cannot be dispatched)."
        elif not cap_match:
            explanation = f"Ineligible: {cap_reason}"
        else:
            fresh_note = " [Warning: GPS data >15m stale]" if is_stale else ""
            explanation = f"Recommended: {amb.ambulance_id} ({amb.model}) is Available in {amb.area}, {distance_km} km away (~{eta_min} min ETA). {cap_reason}.{fresh_note}"

        recommendations.append({
            "ambulance_id": amb.ambulance_id,
            "vehicle_number": amb.vehicle_number,
            "model": amb.model,
            "status": amb.status,
            "area": amb.area,
            "capabilities": amb.capabilities,
            "distance_km": distance_km,
            "estimated_time_min": eta_min,
            "capability_match": cap_match,
            "capability_match_reason": cap_reason,
            "score": score,
            "recommendation_rank": 0, # Will assign after sort
            "is_eligible": is_eligible,
            "is_stale_location": is_stale,
            "routing_provider": route_info["provider"],
            "explanation": explanation
        })

    # Sort: Eligible first, then descending by score, then ascending by distance
    recommendations.sort(key=lambda x: (x["is_eligible"], x["score"], -x["distance_km"]), reverse=True)

    for idx, rec in enumerate(recommendations):
        rec["recommendation_rank"] = idx + 1

    eligible_count = sum(1 for r in recommendations if r["is_eligible"])
    fallback_advice = None
    if eligible_count == 0:
        fallback_advice = "No suitable and available ambulances meet the equipment and proximity requirements in this zone. Immediate recommended action: Request mutual-aid dispatch from neighboring zones or reallocate standby units."

    return {
        "incident_id": emergency.incident_id,
        "incident_type": emergency.incident_type,
        "severity": emergency.severity,
        "required_capability": emergency.required_capability,
        "recommendations": recommendations,
        "has_eligible_ambulance": (eligible_count > 0),
        "fallback_advice": fallback_advice
    }

def assign_ambulance_to_incident(
    db: Session,
    incident_id: str,
    ambulance_id: str,
    recommended_by: str = "Smart Engine",
    dispatch_reason: str = "Optimal capability match and shortest ETA"
) -> Dict[str, Any]:
    """
    Atomic transaction check:
    - Verify incident exists and is not already resolved or assigned.
    - Verify ambulance exists, is not out of service, and is AVAILABLE.
    - If conflict, rollback and raise explicit error.
    """
    emergency = db.query(Emergency).filter(Emergency.incident_id == incident_id).with_for_update().first()
    if not emergency:
        raise ValueError(f"Incident {incident_id} not found.")

    if emergency.status in ["Resolved", "Cancelled"]:
        raise ValueError(f"Incident {incident_id} is already {emergency.status} and cannot be assigned.")

    ambulance = db.query(Ambulance).filter(Ambulance.ambulance_id == ambulance_id).with_for_update().first()
    if not ambulance:
        raise ValueError(f"Ambulance {ambulance_id} not found.")

    if ambulance.status.lower() == "out of service":
        raise ValueError(f"Cannot dispatch ambulance {ambulance_id}: Unit is currently OUT OF SERVICE for maintenance.")

    if ambulance.status.lower() != "available":
        raise ValueError(f"Assignment Conflict: Ambulance {ambulance_id} is already '{ambulance.status}' (assigned to incident: {ambulance.current_incident_id or 'another operation'}).")

    # Double check if another ambulance was already assigned
    if emergency.assigned_ambulance_id and emergency.assigned_ambulance_id != ambulance_id:
        prev_amb = db.query(Ambulance).filter(Ambulance.ambulance_id == emergency.assigned_ambulance_id).first()
        if prev_amb and prev_amb.status in ["Assigned", "En Route"]:
            prev_amb.status = "Available"
            prev_amb.current_incident_id = None

    # Perform safe atomic assignment
    old_emergency_status = emergency.status
    emergency.status = "Assigned"
    emergency.assigned_ambulance_id = ambulance.ambulance_id
    emergency.updated_at = utc_now()

    ambulance.status = "Assigned"
    ambulance.current_incident_id = emergency.incident_id
    ambulance.last_status_update = utc_now()

    # Create assignment record
    assignment = Assignment(
        incident_id=emergency.incident_id,
        ambulance_id=ambulance.ambulance_id,
        assigned_at=utc_now(),
        status="Active",
        recommended_by=recommended_by,
        dispatch_reason=dispatch_reason
    )
    db.add(assignment)

    # Log incident status history
    history = IncidentHistory(
        incident_id=emergency.incident_id,
        previous_status=old_emergency_status,
        new_status="Assigned",
        changed_at=utc_now(),
        notes=f"Dispatched ambulance {ambulance.ambulance_id} ({ambulance.model}). Reason: {dispatch_reason}",
        changed_by="Dispatcher"
    )
    db.add(history)

    db.commit()
    db.refresh(emergency)
    db.refresh(ambulance)

    return {
        "success": True,
        "message": f"Ambulance {ambulance.ambulance_id} successfully assigned to incident {emergency.incident_id}.",
        "incident_id": emergency.incident_id,
        "ambulance_id": ambulance.ambulance_id,
        "status": emergency.status
    }
