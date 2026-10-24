import csv
import io
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    Emergency, Ambulance, Hospital, Assignment, IncidentHistory,
    AmbulanceLocationHistory, RepositioningRecommendation, HistoricalIncident,
    SimulationState, utc_now
)
from app.schemas.schemas import (
    EmergencyCreate, EmergencyUpdate, EmergencyResponse, EmergencyStatusChange,
    AmbulanceCreate, AmbulanceUpdate, AmbulanceResponse, AmbulanceStatusChange,
    AmbulanceLocationUpdate, DispatchRecommendationResponse, DispatchAssignRequest,
    HospitalResponse, HospitalRecommendationResponse, PatientTrackingResponse,
    CoverageResponse, RepositioningResponse, RepositioningActionRequest,
    HotspotAnalysisResponse, DashboardMetricsResponse, SimulationStatusResponse
)
from app.services.routing_service import calculate_route
from app.services.dispatch_engine import get_dispatch_recommendations, assign_ambulance_to_incident
from app.services.coverage_service import calculate_fleet_coverage
from app.services.repositioning_service import generate_repositioning_recommendations, process_repositioning_action
from app.services.hospital_service import get_hospital_recommendations
from app.services.hotspot_service import analyze_historical_hotspots
from app.services.simulation_service import advance_simulation, reset_simulation, STEP_DESCRIPTIONS

api_router = APIRouter()

# --- Health Check ---
@api_router.get("/health")
def health_check(db: Session = Depends(get_db)):
    amb_count = db.query(Ambulance).count()
    em_count = db.query(Emergency).count()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "database": "connected",
        "counts": {
            "ambulances": amb_count,
            "emergencies": em_count
        },
        "timestamp": utc_now()
    }

# --- Overview Dashboard ---
@api_router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    total_active = db.query(Emergency).filter(Emergency.status.in_(["Reported", "Verified", "Assigned", "En Route", "Arrived"])).count()
    critical_count = db.query(Emergency).filter(Emergency.status.in_(["Reported", "Verified", "Assigned", "En Route", "Arrived"]), Emergency.severity == "Critical").count()
    high_count = db.query(Emergency).filter(Emergency.status.in_(["Reported", "Verified", "Assigned", "En Route", "Arrived"]), Emergency.severity == "High").count()
    unassigned_count = db.query(Emergency).filter(Emergency.status.in_(["Reported", "Verified"])).count()

    avail_amb = db.query(Ambulance).filter(Ambulance.status == "Available").count()
    assigned_amb = db.query(Ambulance).filter(Ambulance.status == "Assigned").count()
    enroute_amb = db.query(Ambulance).filter(Ambulance.status == "En Route").count()
    out_service_amb = db.query(Ambulance).filter(Ambulance.status == "Out of Service").count()

    # Response time stats from historical completed records
    hist_times = [r[0] for r in db.query(HistoricalIncident.response_time_seconds).filter(HistoricalIncident.response_time_seconds > 0).all()]
    avg_resp = round(sum(hist_times) / len(hist_times), 1) if hist_times else None
    med_resp = None
    if hist_times:
        sorted_times = sorted(hist_times)
        mid = len(sorted_times) // 2
        med_resp = sorted_times[mid] if len(sorted_times) % 2 != 0 else (sorted_times[mid-1] + sorted_times[mid]) / 2.0

    # Recent activities
    recent_history = db.query(IncidentHistory).order_by(IncidentHistory.changed_at.desc()).limit(8).all()
    recent_activity = [
        {
            "id": h.id,
            "incident_id": h.incident_id,
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "notes": h.notes,
            "changed_at": h.changed_at,
            "changed_by": h.changed_by
        }
        for h in recent_history
    ]

    # Latest dispatch decisions
    recent_assignments = db.query(Assignment).order_by(Assignment.assigned_at.desc()).limit(5).all()
    latest_dispatches = [
        {
            "id": a.id,
            "incident_id": a.incident_id,
            "ambulance_id": a.ambulance_id,
            "assigned_at": a.assigned_at,
            "status": a.status,
            "recommended_by": a.recommended_by,
            "dispatch_reason": a.dispatch_reason
        }
        for a in recent_assignments
    ]

    coverage_info = calculate_fleet_coverage(db)

    return {
        "total_active_emergencies": total_active,
        "critical_emergencies": critical_count,
        "high_priority_emergencies": high_count,
        "unassigned_incidents": unassigned_count,
        "available_ambulances": avail_amb,
        "assigned_ambulances": assigned_amb,
        "en_route_ambulances": enroute_amb,
        "out_of_service_ambulances": out_service_amb,
        "coverage_warnings_count": len(coverage_info["critical_gap_areas"]),
        "average_response_time_seconds": avg_resp,
        "median_response_time_seconds": med_resp,
        "valid_response_records_count": len(hist_times),
        "excluded_records_count": 0,
        "recent_activity": recent_activity,
        "latest_dispatch_decisions": latest_dispatches,
        "area_coverage_summary": coverage_info["areas"],
        "last_updated": utc_now()
    }

# --- Emergency Endpoints ---
@api_router.get("/emergencies", response_model=List[EmergencyResponse])
def list_emergencies(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    area: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Emergency)
    if status:
        query = query.filter(Emergency.status == status)
    if severity:
        query = query.filter(Emergency.severity == severity)
    if area:
        query = query.filter(Emergency.area == area)

    items = query.order_by(Emergency.reported_at.desc()).all()
    results = []
    for em in items:
        resp = EmergencyResponse.model_validate(em)
        hist = db.query(IncidentHistory).filter(IncidentHistory.incident_id == em.incident_id).order_by(IncidentHistory.changed_at.desc()).all()
        resp.history = hist
        results.append(resp)
    return results

@api_router.post("/emergencies", response_model=EmergencyResponse, status_code=status.HTTP_201_CREATED)
def create_emergency(payload: EmergencyCreate, db: Session = Depends(get_db)):
    # Generate sequential incident ID e.g. INC-2026-004
    count = db.query(Emergency).count() + 1
    incident_id = f"INC-2026-{count:03d}"

    # Ensure uniqueness
    while db.query(Emergency).filter(Emergency.incident_id == incident_id).first():
        count += 1
        incident_id = f"INC-2026-{count:03d}"

    em = Emergency(
        incident_id=incident_id,
        incident_type=payload.incident_type,
        severity=payload.severity,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_name=payload.location_name,
        area=payload.area,
        required_capability=payload.required_capability,
        patient_count=payload.patient_count,
        data_source=payload.data_source,
        is_verified=payload.is_verified,
        status="Verified" if payload.is_verified else "Reported",
        tracking_token=uuid.uuid4().hex,
        reported_at=utc_now()
    )
    db.add(em)
    db.flush()

    # Log creation in history
    hist = IncidentHistory(
        incident_id=em.incident_id,
        previous_status="Created",
        new_status=em.status,
        changed_at=utc_now(),
        notes=f"Emergency call logged: {payload.incident_type} in {payload.location_name}.",
        changed_by="Intake Operator"
    )
    db.add(hist)
    db.commit()
    db.refresh(em)

    resp = EmergencyResponse.model_validate(em)
    resp.history = [hist]
    return resp

@api_router.get("/emergencies/{incident_id}", response_model=EmergencyResponse)
def get_emergency(incident_id: str, db: Session = Depends(get_db)):
    em = db.query(Emergency).filter(Emergency.incident_id == incident_id).first()
    if not em:
        raise HTTPException(status_code=404, detail=f"Emergency {incident_id} not found.")
    resp = EmergencyResponse.model_validate(em)
    resp.history = db.query(IncidentHistory).filter(IncidentHistory.incident_id == em.incident_id).order_by(IncidentHistory.changed_at.desc()).all()
    return resp

@api_router.put("/emergencies/{incident_id}", response_model=EmergencyResponse)
def update_emergency(incident_id: str, payload: EmergencyUpdate, db: Session = Depends(get_db)):
    em = db.query(Emergency).filter(Emergency.incident_id == incident_id).first()
    if not em:
        raise HTTPException(status_code=404, detail=f"Emergency {incident_id} not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(em, field, val)
    em.updated_at = utc_now()

    db.commit()
    db.refresh(em)
    resp = EmergencyResponse.model_validate(em)
    resp.history = db.query(IncidentHistory).filter(IncidentHistory.incident_id == em.incident_id).order_by(IncidentHistory.changed_at.desc()).all()
    return resp

@api_router.post("/emergencies/{incident_id}/status", response_model=EmergencyResponse)
def change_emergency_status(incident_id: str, payload: EmergencyStatusChange, db: Session = Depends(get_db)):
    valid_transitions = {
        "Reported": ["Verified", "Cancelled"],
        "Verified": ["Assigned", "Cancelled"],
        "Assigned": ["En Route", "Verified", "Cancelled"],
        "En Route": ["Arrived", "Assigned", "Cancelled"],
        "Arrived": ["Resolved"],
        "Resolved": [],
        "Cancelled": []
    }

    em = db.query(Emergency).filter(Emergency.incident_id == incident_id).first()
    if not em:
        raise HTTPException(status_code=404, detail=f"Emergency {incident_id} not found.")

    old_status = em.status
    target = payload.new_status

    allowed = valid_transitions.get(old_status, [])
    # Allow idempotent or valid forward transition
    if target != old_status and target not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lifecycle transition from '{old_status}' to '{target}'. Permitted: {', '.join(allowed) or 'None (terminal state)'}."
        )

    em.status = target
    em.updated_at = utc_now()

    # If resolved, free up ambulance
    if target in ["Resolved", "Cancelled"] and em.assigned_ambulance_id:
        amb = db.query(Ambulance).filter(Ambulance.ambulance_id == em.assigned_ambulance_id).first()
        if amb:
            amb.status = "Available"
            amb.current_incident_id = None
            amb.crew_notes = f"Incident {em.incident_id} resolved. Returned to standby."
            amb.last_status_update = utc_now()

    hist = IncidentHistory(
        incident_id=em.incident_id,
        previous_status=old_status,
        new_status=target,
        changed_at=utc_now(),
        notes=payload.notes or f"Status updated from {old_status} to {target}",
        changed_by=payload.changed_by or "Dispatcher"
    )
    db.add(hist)
    db.commit()
    db.refresh(em)

    resp = EmergencyResponse.model_validate(em)
    resp.history = db.query(IncidentHistory).filter(IncidentHistory.incident_id == em.incident_id).order_by(IncidentHistory.changed_at.desc()).all()
    return resp

@api_router.post("/emergencies/{incident_id}/revoke-token")
def revoke_tracking_token(incident_id: str, db: Session = Depends(get_db)):
    em = db.query(Emergency).filter(Emergency.incident_id == incident_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Incident not found.")
    new_token = uuid.uuid4().hex
    em.tracking_token = new_token
    em.updated_at = utc_now()
    db.commit()
    return {"incident_id": em.incident_id, "new_tracking_token": new_token, "message": "Access token revoked and regenerated successfully."}

# --- Ambulance Endpoints ---
@api_router.get("/ambulances", response_model=List[AmbulanceResponse])
def list_ambulances(
    status: Optional[str] = None,
    area: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Ambulance)
    if status:
        query = query.filter(Ambulance.status == status)
    if area:
        query = query.filter(Ambulance.area == area)

    ambulances = query.all()
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(minutes=settings.STALE_LOCATION_THRESHOLD_MINUTES)

    results = []
    for a in ambulances:
        resp = AmbulanceResponse.model_validate(a)
        upd = a.last_location_update
        if upd.tzinfo is None:
            upd = upd.replace(tzinfo=timezone.utc)
        resp.is_stale = (upd < stale_cutoff)
        results.append(resp)
    return results

@api_router.post("/ambulances", response_model=AmbulanceResponse, status_code=status.HTTP_201_CREATED)
def create_ambulance(payload: AmbulanceCreate, db: Session = Depends(get_db)):
    if db.query(Ambulance).filter(Ambulance.ambulance_id == payload.ambulance_id).first():
        raise HTTPException(status_code=400, detail=f"Ambulance ID '{payload.ambulance_id}' already exists.")

    amb = Ambulance(
        ambulance_id=payload.ambulance_id,
        vehicle_number=payload.vehicle_number,
        model=payload.model,
        latitude=payload.latitude,
        longitude=payload.longitude,
        area=payload.area,
        capabilities=payload.capabilities,
        equipment_list=payload.equipment_list,
        status=payload.status,
        crew_notes=payload.crew_notes,
        is_simulated_gps=payload.is_simulated_gps,
        last_location_update=utc_now(),
        last_status_update=utc_now()
    )
    db.add(amb)
    db.commit()
    db.refresh(amb)
    return AmbulanceResponse.model_validate(amb)

@api_router.get("/ambulances/{ambulance_id}", response_model=AmbulanceResponse)
def get_ambulance(ambulance_id: str, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.ambulance_id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail=f"Ambulance {ambulance_id} not found.")
    resp = AmbulanceResponse.model_validate(amb)
    upd = amb.last_location_update
    if upd.tzinfo is None:
        upd = upd.replace(tzinfo=timezone.utc)
    resp.is_stale = (upd < datetime.now(timezone.utc) - timedelta(minutes=settings.STALE_LOCATION_THRESHOLD_MINUTES))
    return resp

@api_router.put("/ambulances/{ambulance_id}", response_model=AmbulanceResponse)
def update_ambulance(ambulance_id: str, payload: AmbulanceUpdate, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.ambulance_id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail=f"Ambulance {ambulance_id} not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(amb, field, val)
    amb.updated_at = utc_now()
    db.commit()
    db.refresh(amb)
    return AmbulanceResponse.model_validate(amb)

@api_router.post("/ambulances/{ambulance_id}/status", response_model=AmbulanceResponse)
def change_ambulance_status(ambulance_id: str, payload: AmbulanceStatusChange, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.ambulance_id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail=f"Ambulance {ambulance_id} not found.")

    if payload.status == "Out of Service" and amb.current_incident_id:
        raise HTTPException(status_code=400, detail=f"Cannot mark ambulance Out of Service while assigned to active incident {amb.current_incident_id}.")

    amb.status = payload.status
    if payload.notes:
        amb.crew_notes = payload.notes
    amb.last_status_update = utc_now()
    amb.updated_at = utc_now()

    db.commit()
    db.refresh(amb)
    return AmbulanceResponse.model_validate(amb)

@api_router.post("/ambulances/{ambulance_id}/location", response_model=AmbulanceResponse)
def update_ambulance_location(ambulance_id: str, payload: AmbulanceLocationUpdate, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.ambulance_id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail=f"Ambulance {ambulance_id} not found.")

    amb.latitude = payload.latitude
    amb.longitude = payload.longitude
    amb.last_location_update = utc_now()
    amb.updated_at = utc_now()

    # Log location in history
    hist = AmbulanceLocationHistory(
        ambulance_id=amb.ambulance_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        timestamp=utc_now(),
        speed_kmh=payload.speed_kmh or 0.0,
        source=payload.source or "Simulated GPS"
    )
    db.add(hist)
    db.commit()
    db.refresh(amb)
    return AmbulanceResponse.model_validate(amb)

# --- Dispatch Recommendations & Assignment ---
@api_router.get("/dispatch/recommendations/{incident_id}", response_model=DispatchRecommendationResponse)
async def dispatch_recommendations(incident_id: str, db: Session = Depends(get_db)):
    try:
        rec = await get_dispatch_recommendations(db, incident_id)
        return rec
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@api_router.post("/dispatch/assign")
def assign_dispatch(payload: DispatchAssignRequest, db: Session = Depends(get_db)):
    try:
        res = assign_ambulance_to_incident(
            db=db,
            incident_id=payload.incident_id,
            ambulance_id=payload.ambulance_id,
            recommended_by=payload.recommended_by,
            dispatch_reason=payload.dispatch_reason
        )
        return res
    except ValueError as e:
        # Conflict or invalid assignment
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

# --- Routing & Map Elements ---
@api_router.get("/routes")
async def get_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float
):
    route_res = await calculate_route(start_lat, start_lng, end_lat, end_lng, settings.OSRM_URL)
    return route_res

@api_router.get("/map/elements")
def get_map_elements(db: Session = Depends(get_db)):
    emergencies = db.query(Emergency).filter(Emergency.status != "Resolved").all()
    ambulances = db.query(Ambulance).all()
    hospitals = db.query(Hospital).all()
    repositions = db.query(RepositioningRecommendation).filter(RepositioningRecommendation.status.in_(["Suggested", "Approved", "En Route to Standby"])).all()

    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(minutes=settings.STALE_LOCATION_THRESHOLD_MINUTES)

    amb_data = []
    for a in ambulances:
        upd = a.last_location_update
        if upd.tzinfo is None:
            upd = upd.replace(tzinfo=timezone.utc)
        amb_data.append({
            "id": a.id,
            "ambulance_id": a.ambulance_id,
            "vehicle_number": a.vehicle_number,
            "model": a.model,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "area": a.area,
            "capabilities": a.capabilities,
            "status": a.status,
            "current_incident_id": a.current_incident_id,
            "is_stale": (upd < stale_cutoff),
            "last_location_update": a.last_location_update,
            "is_simulated_gps": a.is_simulated_gps
        })

    return {
        "emergencies": [
            {
                "id": e.id,
                "incident_id": e.incident_id,
                "incident_type": e.incident_type,
                "severity": e.severity,
                "description": e.description,
                "latitude": e.latitude,
                "longitude": e.longitude,
                "location_name": e.location_name,
                "area": e.area,
                "status": e.status,
                "assigned_ambulance_id": e.assigned_ambulance_id,
                "reported_at": e.reported_at,
                "data_source": e.data_source
            }
            for e in emergencies
        ],
        "ambulances": amb_data,
        "hospitals": [
            {
                "id": h.id,
                "hospital_id": h.hospital_id,
                "name": h.name,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "area": h.area,
                "capabilities": h.capabilities,
                "capacity_status": h.capacity_status,
                "available_icu_beds": h.available_icu_beds,
                "is_capacity_simulated": h.is_capacity_simulated
            }
            for h in hospitals
        ],
        "repositioning_targets": [
            {
                "id": r.id,
                "ambulance_id": r.ambulance_id,
                "target_area": r.target_area,
                "latitude": r.target_lat,
                "longitude": r.target_lng,
                "status": r.status,
                "reason": r.reason
            }
            for r in repositions
        ],
        "timestamp": utc_now()
    }

# --- Patient Live Tracking ---
@api_router.get("/tracking/{tracking_token}", response_model=PatientTrackingResponse)
async def track_emergency(tracking_token: str, db: Session = Depends(get_db)):
    em = db.query(Emergency).filter(Emergency.tracking_token == tracking_token).first()
    if not em:
        raise HTTPException(
            status_code=404,
            detail="Invalid or expired emergency tracking token. Please contact emergency dispatch."
        )

    assigned_amb_data = None
    route_geom = None
    dist_km = None
    time_min = None
    routing_prov = None
    is_stale = False

    if em.assigned_ambulance_id:
        amb = db.query(Ambulance).filter(Ambulance.ambulance_id == em.assigned_ambulance_id).first()
        if amb:
            upd = amb.last_location_update
            if upd.tzinfo is None:
                upd = upd.replace(tzinfo=timezone.utc)
            is_stale = (upd < datetime.now(timezone.utc) - timedelta(minutes=settings.STALE_LOCATION_THRESHOLD_MINUTES))

            assigned_amb_data = {
                "ambulance_id": amb.ambulance_id,
                "vehicle_number": amb.vehicle_number,
                "model": amb.model,
                "latitude": amb.latitude,
                "longitude": amb.longitude,
                "status": amb.status,
                "last_location_update": amb.last_location_update,
                "is_simulated_gps": amb.is_simulated_gps
            }

            # Calculate route if en route or assigned
            route_res = await calculate_route(amb.latitude, amb.longitude, em.latitude, em.longitude, settings.OSRM_URL)
            route_geom = route_res["geometry"]
            dist_km = route_res["distance_km"]
            time_min = route_res["estimated_time_min"]
            routing_prov = route_res["provider"]

    history = db.query(IncidentHistory).filter(IncidentHistory.incident_id == em.incident_id).order_by(IncidentHistory.changed_at.asc()).all()
    timeline = [
        {
            "status": h.new_status,
            "timestamp": h.changed_at,
            "notes": h.notes
        }
        for h in history
    ]

    return {
        "incident_id": em.incident_id,
        "incident_type": em.incident_type,
        "severity": em.severity,
        "status": em.status,
        "location_name": em.location_name,
        "reported_at": em.reported_at,
        "updated_at": em.updated_at,
        "is_valid_token": True,
        "assigned_ambulance": assigned_amb_data,
        "route_geometry": route_geom,
        "estimated_distance_km": dist_km,
        "estimated_time_min": time_min,
        "routing_provider": routing_prov,
        "is_stale_location": is_stale,
        "status_timeline": timeline,
        "disclaimer": "DEMONSTRATION TRACKING INTERFACE. Not certified for emergency life-safety operations."
    }

# --- Fleet Coverage ---
@api_router.get("/coverage", response_model=CoverageResponse)
def get_fleet_coverage(eta_threshold_minutes: int = Query(10, ge=1, le=60), db: Session = Depends(get_db)):
    return calculate_fleet_coverage(db, eta_threshold_minutes)

# --- Repositioning ---
@api_router.get("/repositioning", response_model=List[RepositioningResponse])
async def list_repositioning(db: Session = Depends(get_db)):
    recs = await generate_repositioning_recommendations(db)
    return recs

@api_router.post("/repositioning/action")
def update_repositioning(payload: RepositioningActionRequest, db: Session = Depends(get_db)):
    try:
        res = process_repositioning_action(db, payload.recommendation_id, payload.action)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Hospitals ---
@api_router.get("/hospitals", response_model=List[HospitalResponse])
def list_hospitals(db: Session = Depends(get_db)):
    return db.query(Hospital).all()

@api_router.get("/hospitals/recommendations/{incident_id}", response_model=HospitalRecommendationResponse)
async def hospital_recommendations(incident_id: str, db: Session = Depends(get_db)):
    try:
        res = await get_hospital_recommendations(db, incident_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# --- Hotspot Analysis ---
@api_router.get("/hotspots", response_model=HotspotAnalysisResponse)
def hotspot_analysis(
    area: Optional[str] = None,
    severity: Optional[str] = None,
    type: Optional[str] = None,
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db)
):
    return analyze_historical_hotspots(db, area, severity, type, days)

# --- Analytics & CSV Export ---
@api_router.get("/analytics/metrics")
def get_analytics_metrics(db: Session = Depends(get_db)):
    total_incidents = db.query(HistoricalIncident).count()
    sev_counts = db.query(HistoricalIncident.severity, func.count(HistoricalIncident.id)).group_by(HistoricalIncident.severity).all()
    type_counts = db.query(HistoricalIncident.incident_type, func.count(HistoricalIncident.id)).group_by(HistoricalIncident.incident_type).all()
    area_counts = db.query(HistoricalIncident.area, func.count(HistoricalIncident.id)).group_by(HistoricalIncident.area).all()

    times = [r[0] for r in db.query(HistoricalIncident.response_time_seconds).filter(HistoricalIncident.response_time_seconds > 0).all()]
    avg_sec = round(sum(times) / len(times), 1) if times else 0
    med_sec = 0
    if times:
        s = sorted(times)
        mid = len(s) // 2
        med_sec = s[mid] if len(s) % 2 != 0 else (s[mid-1] + s[mid]) / 2.0

    return {
        "total_historical_records": total_incidents,
        "by_severity": dict(sev_counts),
        "by_type": dict(type_counts),
        "by_area": dict(area_counts),
        "average_response_time_seconds": avg_sec,
        "median_response_time_seconds": med_sec,
        "calculated_from_valid_records": len(times),
        "data_source": "Historical emergency database (Simulated hackathon benchmark)",
        "timestamp": utc_now()
    }

@api_router.get("/analytics/export/incidents.csv")
def export_incidents_csv(db: Session = Depends(get_db)):
    incidents = db.query(HistoricalIncident).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Incident ID", "Type", "Severity", "Area", "Latitude", "Longitude",
        "Occurred At (UTC)", "Response Time (Seconds)", "Resolved At (UTC)", "Data Source"
    ])
    for inc in incidents:
        writer.writerow([
            inc.incident_id, inc.incident_type, inc.severity, inc.area,
            inc.latitude, inc.longitude, inc.occurred_at.isoformat(),
            inc.response_time_seconds, inc.resolved_at.isoformat(),
            "Simulated Benchmark Data" if inc.is_simulated else "Verified Record"
        ])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jeevsarthi_incidents.csv"}
    )

@api_router.get("/analytics/export/ambulances.csv")
def export_ambulances_csv(db: Session = Depends(get_db)):
    ambulances = db.query(Ambulance).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ambulance ID", "Vehicle Number", "Model", "Area", "Latitude", "Longitude",
        "Capabilities", "Status", "Current Incident", "Last Location Update (UTC)", "Crew Notes"
    ])
    for a in ambulances:
        writer.writerow([
            a.ambulance_id, a.vehicle_number, a.model, a.area, a.latitude, a.longitude,
            a.capabilities, a.status, a.current_incident_id or "None",
            a.last_location_update.isoformat(), a.crew_notes or ""
        ])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jeevsarthi_ambulances.csv"}
    )

# --- Demo Simulation Endpoints ---
@api_router.get("/simulation/status", response_model=SimulationStatusResponse)
def get_simulation_status(db: Session = Depends(get_db)):
    state = db.query(SimulationState).first()
    if not state:
        seed_database(db, reset=True)
        state = db.query(SimulationState).first()
    curr = state.current_step
    desc = STEP_DESCRIPTIONS[curr] if curr < len(STEP_DESCRIPTIONS) else STEP_DESCRIPTIONS[-1]
    return {
        "scenario_name": state.scenario_name,
        "current_step": state.current_step,
        "total_steps": state.total_steps,
        "is_active": state.is_active,
        "status_message": state.status_message,
        "updated_at": state.updated_at,
        "step_description": desc,
        "can_advance": (state.current_step < state.total_steps)
    }

@api_router.post("/simulation/advance", response_model=SimulationStatusResponse)
async def advance_simulation_step(db: Session = Depends(get_db)):
    res = await advance_simulation(db)
    return res

@api_router.post("/simulation/run-all", response_model=SimulationStatusResponse)
async def run_entire_simulation(db: Session = Depends(get_db)):
    state = db.query(SimulationState).first()
    if not state:
        seed_database(db, reset=True)
        state = db.query(SimulationState).first()

    # Step through until completed
    while state.current_step < state.total_steps:
        await advance_simulation(db)
        state = db.query(SimulationState).first()

    curr = state.current_step
    desc = STEP_DESCRIPTIONS[curr] if curr < len(STEP_DESCRIPTIONS) else STEP_DESCRIPTIONS[-1]
    return {
        "scenario_name": state.scenario_name,
        "current_step": state.current_step,
        "total_steps": state.total_steps,
        "is_active": False,
        "status_message": "Entire 16-step scenario executed successfully from start to finish.",
        "updated_at": state.updated_at,
        "step_description": desc,
        "can_advance": False
    }

@api_router.post("/simulation/reset", response_model=SimulationStatusResponse)
def reset_demo(db: Session = Depends(get_db)):
    return reset_simulation(db)

# --- Settings & Data Sources ---
@api_router.get("/settings/data-sources")
def get_data_sources_info():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "routing_service": {
            "primary": f"OSRM Road Routing ({settings.OSRM_URL})",
            "fallback": "Haversine Straight-Line Distance with 35 km/h urban velocity model",
            "live_traffic_status": "Not Enabled (Standard road-network graph speeds used; live congestion is NOT claimed)"
        },
        "map_tile_provider": "OpenStreetMap Standard Tiles",
        "gps_mode": "Simulated GPS Feeds for Hackathon Demonstration (Clearly labeled)",
        "hospital_bed_capacity": "Simulated Live Bed Management Feed (Clearly labeled with advisory disclaimer)",
        "database": "SQLite Local Engine with Transaction-level Collision Protection",
        "disclaimer": (
            "JeevSarthi is a hackathon proof-of-concept for automated emergency response coordination. "
            "It is not certified by clinical medical boards or local emergency service authorities for live 911/112 operations."
        )
    }
