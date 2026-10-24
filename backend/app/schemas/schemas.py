from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# Emergency Schemas
class EmergencyBase(BaseModel):
    incident_type: str
    severity: str # Critical, High, Normal
    description: str
    latitude: float
    longitude: float
    location_name: str
    area: str # North Zone, South Zone, Central Zone, East Zone, West Zone
    required_capability: str = "BLS" # BLS, ALS, ICU, Transport, Neonatal
    patient_count: int = 1
    data_source: str = "Emergency Dispatch Call"
    is_verified: bool = True

class EmergencyCreate(EmergencyBase):
    pass

class EmergencyUpdate(BaseModel):
    incident_type: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    location_name: Optional[str] = None
    area: Optional[str] = None
    required_capability: Optional[str] = None
    patient_count: Optional[int] = None
    is_verified: Optional[bool] = None

class EmergencyStatusChange(BaseModel):
    new_status: str # Reported, Verified, Assigned, En Route, Arrived, Resolved
    notes: Optional[str] = ""
    changed_by: Optional[str] = "Dispatcher"

class IncidentHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: str
    previous_status: str
    new_status: str
    changed_at: datetime
    notes: str
    changed_by: str

class EmergencyResponse(EmergencyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: str
    reported_at: datetime
    status: str
    assigned_ambulance_id: Optional[str] = None
    tracking_token: str
    created_at: datetime
    updated_at: datetime
    history: Optional[List[IncidentHistoryItem]] = []

# Ambulance Schemas
class AmbulanceBase(BaseModel):
    ambulance_id: str
    vehicle_number: str
    model: str
    latitude: float
    longitude: float
    area: str
    capabilities: str # BLS, ALS, ICU, Neonatal, Transport
    equipment_list: str = "Oxygen Cylinder, First Aid Kit"
    status: str = "Available" # Available, Assigned, En Route, Busy, Out of Service
    crew_notes: Optional[str] = ""
    is_simulated_gps: bool = True

class AmbulanceCreate(AmbulanceBase):
    pass

class AmbulanceUpdate(BaseModel):
    model: Optional[str] = None
    vehicle_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area: Optional[str] = None
    capabilities: Optional[str] = None
    equipment_list: Optional[str] = None
    status: Optional[str] = None
    crew_notes: Optional[str] = None
    is_simulated_gps: Optional[bool] = None

class AmbulanceStatusChange(BaseModel):
    status: str # Available, Assigned, En Route, Busy, Out of Service
    notes: Optional[str] = ""

class AmbulanceLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = 0.0
    source: Optional[str] = "Simulated GPS"

class AmbulanceResponse(AmbulanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    current_incident_id: Optional[str] = None
    last_location_update: datetime
    last_status_update: datetime
    is_stale: bool = False
    created_at: datetime
    updated_at: datetime

# Dispatch Schemas
class DispatchRecommendationItem(BaseModel):
    ambulance_id: str
    vehicle_number: str
    model: str
    status: str
    area: str
    capabilities: str
    distance_km: float
    estimated_time_min: float
    capability_match: bool
    capability_match_reason: str
    score: float # 0 - 100
    recommendation_rank: int
    is_eligible: bool
    is_stale_location: bool
    routing_provider: str
    explanation: str

class DispatchRecommendationResponse(BaseModel):
    incident_id: str
    incident_type: str
    severity: str
    required_capability: str
    recommendations: List[DispatchRecommendationItem]
    has_eligible_ambulance: bool
    fallback_advice: Optional[str] = None

class DispatchAssignRequest(BaseModel):
    incident_id: str
    ambulance_id: str
    recommended_by: str = "Smart Engine"
    dispatch_reason: str = "Optimal capability match and shortest ETA"

# Hospital Schemas
class HospitalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hospital_id: str
    name: str
    address: str
    area: str
    latitude: float
    longitude: float
    capabilities: str
    supported_emergency_types: str
    total_beds: int
    available_icu_beds: int
    available_general_beds: int
    capacity_status: str
    is_capacity_simulated: bool
    last_capacity_update: datetime
    contact_phone: str

class HospitalRecommendationItem(BaseModel):
    hospital: HospitalResponse
    distance_km: float
    estimated_time_min: float
    capability_match: bool
    specialty_match_reason: str
    capacity_display: str # e.g. "Available (5 ICU beds) - SIMULATED DATA" or "Capacity Unknown"
    is_recommended: bool
    routing_provider: str
    explanation: str

class HospitalRecommendationResponse(BaseModel):
    incident_id: str
    incident_type: str
    recommendations: List[HospitalRecommendationItem]

# Patient Tracking Schema
class PatientTrackingResponse(BaseModel):
    incident_id: str
    incident_type: str
    severity: str
    status: str # Reported -> Verified -> Assigned -> En Route -> Arrived -> Resolved
    location_name: str
    reported_at: datetime
    updated_at: datetime
    is_valid_token: bool
    assigned_ambulance: Optional[Dict[str, Any]] = None
    route_geometry: Optional[List[List[float]]] = None # [[lat, lng], ...]
    estimated_distance_km: Optional[float] = None
    estimated_time_min: Optional[float] = None
    routing_provider: Optional[str] = None
    is_stale_location: bool = False
    status_timeline: List[Dict[str, Any]] = []
    disclaimer: str = "DEMONSTRATION TRACKING INTERFACE. Not certified for emergency life-safety operations."

# Fleet Coverage Schema
class CoverageAreaDetail(BaseModel):
    area: str
    total_ambulances: int
    available_ambulances: int
    assigned_ambulances: int
    out_of_service: int
    stale_location_count: int
    unassigned_emergencies: int
    coverage_status: str # "Adequate", "Warning: Low Coverage", "Critical Gap: Zero Available"
    is_gap: bool

class CoverageResponse(BaseModel):
    eta_threshold_minutes: int
    areas: List[CoverageAreaDetail]
    total_available: int
    total_ambulances: int
    critical_gap_areas: List[str]
    system_warning: Optional[str] = None
    calculation_timestamp: datetime

# Repositioning Schemas
class RepositioningResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ambulance_id: str
    origin_area: str
    target_area: str
    target_lat: float
    target_lng: float
    reason: str
    priority: str
    status: str
    distance_km: float
    estimated_time_min: float
    created_at: datetime
    updated_at: datetime

class RepositioningActionRequest(BaseModel):
    recommendation_id: int
    action: str # "approve", "reject", "cancel", "mark_arrived"

# Hotspot and Historical Analytics
class HotspotPatternItem(BaseModel):
    area: str
    total_historical_incidents: int
    critical_count: int
    high_count: int
    normal_count: int
    top_emergency_types: List[str]
    peak_hours: List[int]
    estimated_hourly_demand: float
    risk_level: str
    suggested_standby_base: str

class HotspotAnalysisResponse(BaseModel):
    date_range_start: datetime
    date_range_end: datetime
    total_records_analyzed: int
    is_simulated_dataset: bool
    patterns: List[HotspotPatternItem]
    hourly_distribution: Dict[int, int]
    day_of_week_distribution: Dict[str, int]
    methodology_note: str

# Overview Dashboard Metrics
class DashboardMetricsResponse(BaseModel):
    total_active_emergencies: int
    critical_emergencies: int
    high_priority_emergencies: int
    unassigned_incidents: int
    available_ambulances: int
    assigned_ambulances: int
    en_route_ambulances: int
    out_of_service_ambulances: int
    coverage_warnings_count: int
    average_response_time_seconds: Optional[float] = None
    median_response_time_seconds: Optional[float] = None
    valid_response_records_count: int
    excluded_records_count: int
    recent_activity: List[Dict[str, Any]]
    latest_dispatch_decisions: List[Dict[str, Any]]
    area_coverage_summary: List[CoverageAreaDetail]
    last_updated: datetime

# Simulation Status Schema
class SimulationStatusResponse(BaseModel):
    scenario_name: str
    current_step: int
    total_steps: int
    is_active: bool
    status_message: str
    updated_at: datetime
    step_description: str
    can_advance: bool

class RepositioningActionRequest(BaseModel):
    recommendation_id: int
    action: str # "approve", "reject", "cancel", "mark_arrived"

# Hotspot and Historical Analytics
class HotspotPatternItem(BaseModel):
    area: str
    total_historical_incidents: int
    critical_count: int
    high_count: int
    normal_count: int
    top_emergency_types: List[str]
    peak_hours: List[int]
    estimated_hourly_demand: float
    risk_level: str
    suggested_standby_base: str

class HotspotAnalysisResponse(BaseModel):
    date_range_start: datetime
    date_range_end: datetime
    total_records_analyzed: int
    is_simulated_dataset: bool
    patterns: List[HotspotPatternItem]
    hourly_distribution: Dict[int, int]
    day_of_week_distribution: Dict[str, int]
    methodology_note: str

# Overview Dashboard Metrics
class DashboardMetricsResponse(BaseModel):
    total_active_emergencies: int
    critical_emergencies: int
    high_priority_emergencies: int
    unassigned_incidents: int
    available_ambulances: int
    assigned_ambulances: int
    en_route_ambulances: int
    out_of_service_ambulances: int
    coverage_warnings_count: int
    average_response_time_seconds: Optional[float] = None
    median_response_time_seconds: Optional[float] = None
    valid_response_records_count: int
    excluded_records_count: int
    recent_activity: List[Dict[str, Any]]
    latest_dispatch_decisions: List[Dict[str, Any]]
    area_coverage_summary: List[CoverageAreaDetail]
    last_updated: datetime

# Simulation Status Schema
class SimulationStatusResponse(BaseModel):
    scenario_name: str
    current_step: int
    total_steps: int
    is_active: bool
    status_message: str
    updated_at: datetime
    step_description: str
    can_advance: bool
