from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.models import Ambulance, Emergency, utc_now
from app.core.config import settings

STANDARD_ZONES = ["North Zone", "South Zone", "Central Zone", "East Zone", "West Zone"]

def calculate_fleet_coverage(
    db: Session,
    eta_threshold_minutes: int = 10
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(minutes=settings.STALE_LOCATION_THRESHOLD_MINUTES)

    ambulances = db.query(Ambulance).all()
    emergencies = db.query(Emergency).filter(Emergency.status.in_(["Reported", "Verified"])).all()

    # Aggregate by area
    area_map = {z: {
        "area": z,
        "total_ambulances": 0,
        "available_ambulances": 0,
        "assigned_ambulances": 0,
        "out_of_service": 0,
        "stale_location_count": 0,
        "unassigned_emergencies": 0
    } for z in STANDARD_ZONES}

    total_available = 0
    total_ambulances = len(ambulances)

    for amb in ambulances:
        z = amb.area if amb.area in area_map else "Central Zone"
        area_map[z]["total_ambulances"] += 1
        status_lower = amb.status.lower()

        if status_lower == "available":
            area_map[z]["available_ambulances"] += 1
            total_available += 1
        elif status_lower in ["assigned", "en route", "busy"]:
            area_map[z]["assigned_ambulances"] += 1
        elif status_lower == "out of service":
            area_map[z]["out_of_service"] += 1

        last_upd = amb.last_location_update
        if last_upd.tzinfo is None:
            last_upd = last_upd.replace(tzinfo=timezone.utc)
        if last_upd < stale_cutoff:
            area_map[z]["stale_location_count"] += 1

    for em in emergencies:
        z = em.area if em.area in area_map else "Central Zone"
        area_map[z]["unassigned_emergencies"] += 1

    area_details = []
    critical_gap_areas = []

    for z in STANDARD_ZONES:
        data = area_map[z]
        avail = data["available_ambulances"]
        unassigned = data["unassigned_emergencies"]

        # Determine status
        if avail == 0:
            status = "Critical Gap: Zero Available"
            is_gap = True
            critical_gap_areas.append(z)
        elif avail <= 1 and unassigned > 0:
            status = "Warning: Constrained Coverage"
            is_gap = True
            critical_gap_areas.append(z)
        elif avail == 1:
            status = "Caution: Single Unit Standby"
            is_gap = False
        else:
            status = "Adequate Coverage"
            is_gap = False

        area_details.append({
            "area": z,
            "total_ambulances": data["total_ambulances"],
            "available_ambulances": avail,
            "assigned_ambulances": data["assigned_ambulances"],
            "out_of_service": data["out_of_service"],
            "stale_location_count": data["stale_location_count"],
            "unassigned_emergencies": unassigned,
            "coverage_status": status,
            "is_gap": is_gap
        })

    system_warning = None
    if critical_gap_areas:
        system_warning = f"Alert: High risk in {', '.join(critical_gap_areas)}. Immediate repositioning or inter-zone mutual aid recommended."

    return {
        "eta_threshold_minutes": eta_threshold_minutes,
        "areas": area_details,
        "total_available": total_available,
        "total_ambulances": total_ambulances,
        "critical_gap_areas": critical_gap_areas,
        "system_warning": system_warning,
        "calculation_timestamp": now
    }
