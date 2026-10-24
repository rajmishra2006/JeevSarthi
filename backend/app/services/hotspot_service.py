from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import HistoricalIncident, Emergency

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def analyze_historical_hotspots(
    db: Session,
    area_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    days_back: int = 30
) -> Dict[str, Any]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
    
    query = db.query(HistoricalIncident).filter(HistoricalIncident.occurred_at >= cutoff)
    if area_filter:
        query = query.filter(HistoricalIncident.area == area_filter)
    if severity_filter:
        query = query.filter(HistoricalIncident.severity == severity_filter)
    if type_filter:
        query = query.filter(HistoricalIncident.incident_type == type_filter)

    records = query.all()
    total_count = len(records)

    hourly_dist = {h: 0 for h in range(24)}
    day_dist = {d: 0 for d in DAYS_OF_WEEK}
    area_groups = defaultdict(lambda: {
        "total": 0, "critical": 0, "high": 0, "normal": 0,
        "types": defaultdict(int), "hours": defaultdict(int)
    })

    for r in records:
        occ = r.occurred_at
        h = occ.hour
        hourly_dist[h] += 1
        day_name = occ.strftime("%A")
        if day_name in day_dist:
            day_dist[day_name] += 1

        ag = area_groups[r.area]
        ag["total"] += 1
        if r.severity.lower() == "critical":
            ag["critical"] += 1
        elif r.severity.lower() == "high":
            ag["high"] += 1
        else:
            ag["normal"] += 1
        ag["types"][r.incident_type] += 1
        ag["hours"][h] += 1

    patterns = []
    standby_bases = {
        "North Zone": "Rohini Sector 14 Emergency Post",
        "South Zone": "AIIMS Trauma Triangle Hub",
        "Central Zone": "Connaught Place Rapid Response Point",
        "East Zone": "Mayur Vihar Phase 1 Hub",
        "West Zone": "Dwarka Sector 10 Response Bay"
    }

    for area_name, ag in area_groups.items():
        # Top 3 emergency types
        sorted_types = sorted(ag["types"].items(), key=lambda x: x[1], reverse=True)
        top_types = [t[0] for t in sorted_types[:3]]

        # Peak hours
        sorted_hours = sorted(ag["hours"].items(), key=lambda x: x[1], reverse=True)
        peak_hours = [h[0] for h in sorted_hours[:3]]

        # Baseline demand rate per hour across window
        hourly_rate = round(ag["total"] / (days_back * 24.0), 3)

        risk_level = "High Emergency Density" if ag["critical"] >= 8 or ag["total"] >= 25 else "Moderate Frequency"

        patterns.append({
            "area": area_name,
            "total_historical_incidents": ag["total"],
            "critical_count": ag["critical"],
            "high_count": ag["high"],
            "normal_count": ag["normal"],
            "top_emergency_types": top_types,
            "peak_hours": peak_hours,
            "estimated_hourly_demand": hourly_rate,
            "risk_level": risk_level,
            "suggested_standby_base": standby_bases.get(area_name, "Central Rapid Standby")
        })

    patterns.sort(key=lambda p: p["total_historical_incidents"], reverse=True)

    methodology = (
        f"Analyzed {total_count} historical incidents over a {days_back}-day window using rolling frequency distribution "
        f"and Poisson-rate expectation. Note: This analysis is based on simulated benchmark records for hackathon demonstration. "
        f"High historical volume reflects call frequency and does not imply innate geographical hazard."
    )

    return {
        "date_range_start": cutoff,
        "date_range_end": datetime.now(timezone.utc),
        "total_records_analyzed": total_count,
        "is_simulated_dataset": True,
        "patterns": patterns,
        "hourly_distribution": hourly_dist,
        "day_of_week_distribution": day_dist,
        "methodology_note": methodology
    }
