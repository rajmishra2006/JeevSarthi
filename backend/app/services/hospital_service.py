from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.models import Hospital, Emergency
from app.services.routing_service import calculate_route
from app.core.config import settings

async def get_hospital_recommendations(
    db: Session,
    incident_id: str
) -> Dict[str, Any]:
    emergency = db.query(Emergency).filter(Emergency.incident_id == incident_id).first()
    if not emergency:
        raise ValueError(f"Incident {incident_id} not found.")

    hospitals = db.query(Hospital).all()
    recommendations = []

    req_type = emergency.incident_type.lower()

    for hosp in hospitals:
        # Check capability/specialty match
        supported = [s.strip().lower() for s in hosp.supported_emergency_types.split(",")]
        # Fuzzy match keyword
        match = any(word in [w for s in supported for w in s.split()] for word in req_type.split()) or "general" in supported

        route_info = await calculate_route(
            emergency.latitude, emergency.longitude,
            hosp.latitude, hosp.longitude,
            settings.OSRM_URL
        )

        distance_km = route_info["distance_km"]
        eta_min = route_info["estimated_time_min"]

        # Capacity display formatting
        if hosp.capacity_status == "Capacity Unknown":
            capacity_display = "Capacity Unknown (Direct facility confirmation required)"
        else:
            sim_tag = " [SIMULATED DATA]" if hosp.is_capacity_simulated else " [VERIFIED EHR FEED]"
            capacity_display = f"{hosp.capacity_status} ({hosp.available_icu_beds} ICU, {hosp.available_general_beds} General beds){sim_tag}"

        # Explanation
        if match:
            reason = f"Equipped for {emergency.incident_type}. Facilities: {hosp.capabilities}. {distance_km} km away (~{eta_min} min)."
        else:
            reason = f"General tertiary facility ({distance_km} km, ~{eta_min} min). Specialty center transfer may be required."

        # Scoring
        score = 0.0
        if match:
            score += 50.0
        # Distance penalty
        score += max(0.0, 40.0 - (distance_km * 2.5))
        if hosp.capacity_status == "Available":
            score += 10.0
        elif hosp.capacity_status == "Constrained":
            score += 4.0

        recommendations.append({
            "hospital": hosp,
            "distance_km": distance_km,
            "estimated_time_min": eta_min,
            "capability_match": match,
            "specialty_match_reason": f"Specialty facilities: {hosp.capabilities}",
            "capacity_display": capacity_display,
            "is_recommended": False,
            "score": score,
            "routing_provider": route_info["provider"],
            "explanation": reason
        })

    # Sort descending by score
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    if recommendations:
        recommendations[0]["is_recommended"] = True

    return {
        "incident_id": emergency.incident_id,
        "incident_type": emergency.incident_type,
        "recommendations": recommendations
    }
