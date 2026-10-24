export interface IncidentHistoryItem {
  id: number;
  incident_id: string;
  previous_status: string;
  new_status: string;
  changed_at: string;
  notes: string;
  changed_by: string;
}

export interface Emergency {
  id: number;
  incident_id: string;
  incident_type: string;
  severity: "Critical" | "High" | "Normal";
  description: string;
  latitude: number;
  longitude: number;
  location_name: string;
  area: string;
  reported_at: string;
  status: "Reported" | "Verified" | "Assigned" | "En Route" | "Arrived" | "Resolved" | "Cancelled";
  required_capability: string;
  patient_count: number;
  assigned_ambulance_id?: string | null;
  tracking_token: string;
  data_source: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  history?: IncidentHistoryItem[];
}

export interface Ambulance {
  id: number;
  ambulance_id: string;
  vehicle_number: string;
  model: string;
  latitude: number;
  longitude: number;
  area: string;
  capabilities: string;
  equipment_list: string;
  status: "Available" | "Assigned" | "En Route" | "Busy" | "Out of Service";
  current_incident_id?: string | null;
  last_location_update: string;
  last_status_update: string;
  crew_notes?: string;
  is_simulated_gps: boolean;
  is_stale: boolean;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: number;
  hospital_id: string;
  name: string;
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  capabilities: string;
  supported_emergency_types: string;
  total_beds: number;
  available_icu_beds: number;
  available_general_beds: number;
  capacity_status: "Available" | "Constrained" | "Full" | "Capacity Unknown";
  is_capacity_simulated: boolean;
  last_capacity_update: string;
  contact_phone: string;
}

export interface DispatchRecommendationItem {
  ambulance_id: string;
  vehicle_number: string;
  model: string;
  status: string;
  area: string;
  capabilities: string;
  distance_km: number;
  estimated_time_min: number;
  capability_match: boolean;
  capability_match_reason: string;
  score: number;
  recommendation_rank: number;
  is_eligible: boolean;
  is_stale_location: boolean;
  routing_provider: string;
  explanation: string;
}

export interface DispatchRecommendationResponse {
  incident_id: string;
  incident_type: string;
  severity: string;
  required_capability: string;
  recommendations: DispatchRecommendationItem[];
  has_eligible_ambulance: boolean;
  fallback_advice?: string | null;
}

export interface HospitalRecommendationItem {
  hospital: Hospital;
  distance_km: number;
  estimated_time_min: number;
  capability_match: boolean;
  specialty_match_reason: string;
  capacity_display: string;
  is_recommended: boolean;
  routing_provider: string;
  explanation: string;
}

export interface CoverageAreaDetail {
  area: string;
  total_ambulances: number;
  available_ambulances: number;
  assigned_ambulances: number;
  out_of_service: number;
  stale_location_count: number;
  unassigned_emergencies: number;
  coverage_status: string;
  is_gap: boolean;
}

export interface CoverageResponse {
  eta_threshold_minutes: number;
  areas: CoverageAreaDetail[];
  total_available: number;
  total_ambulances: number;
  critical_gap_areas: string[];
  system_warning?: string | null;
  calculation_timestamp: string;
}

export interface RepositioningRecommendation {
  id: number;
  ambulance_id: string;
  origin_area: string;
  target_area: string;
  target_lat: number;
  target_lng: number;
  reason: string;
  priority: "High" | "Medium" | "Low";
  status: "Suggested" | "Approved" | "En Route to Standby" | "Arrived at Standby" | "Cancelled" | "Rejected";
  distance_km: number;
  estimated_time_min: number;
  created_at: string;
  updated_at: string;
}

export interface PatientTrackingResponse {
  incident_id: string;
  incident_type: string;
  severity: string;
  status: string;
  location_name: string;
  reported_at: string;
  updated_at: string;
  is_valid_token: boolean;
  assigned_ambulance?: {
    ambulance_id: string;
    vehicle_number: string;
    model: string;
    latitude: number;
    longitude: number;
    status: string;
    last_location_update: string;
    is_simulated_gps: boolean;
  } | null;
  route_geometry?: [number, number][] | null;
  estimated_distance_km?: number | null;
  estimated_time_min?: number | null;
  routing_provider?: string | null;
  is_stale_location: boolean;
  status_timeline: {
    status: string;
    timestamp: string;
    notes: string;
  }[];
  disclaimer: string;
}

export interface HotspotPatternItem {
  area: string;
  total_historical_incidents: number;
  critical_count: number;
  high_count: number;
  normal_count: number;
  top_emergency_types: string[];
  peak_hours: number[];
  estimated_hourly_demand: number;
  risk_level: string;
  suggested_standby_base: string;
}

export interface HotspotAnalysisResponse {
  date_range_start: string;
  date_range_end: string;
  total_records_analyzed: number;
  is_simulated_dataset: boolean;
  patterns: HotspotPatternItem[];
  hourly_distribution: Record<number, number>;
  day_of_week_distribution: Record<string, number>;
  methodology_note: string;
}

export interface DashboardMetrics {
  total_active_emergencies: number;
  critical_emergencies: number;
  high_priority_emergencies: number;
  unassigned_incidents: number;
  available_ambulances: number;
  assigned_ambulances: number;
  en_route_ambulances: number;
  out_of_service_ambulances: number;
  coverage_warnings_count: number;
  average_response_time_seconds?: number | null;
  median_response_time_seconds?: number | null;
  valid_response_records_count: number;
  excluded_records_count: number;
  recent_activity: {
    id: number;
    incident_id: string;
    previous_status: string;
    new_status: string;
    notes: string;
    changed_at: string;
    changed_by: string;
  }[];
  latest_dispatch_decisions: {
    id: number;
    incident_id: string;
    ambulance_id: string;
    assigned_at: string;
    status: string;
    recommended_by: string;
    dispatch_reason: string;
  }[];
  area_coverage_summary: CoverageAreaDetail[];
  last_updated: string;
}

export interface SimulationStatus {
  scenario_name: string;
  current_step: number;
  total_steps: number;
  is_active: boolean;
  status_message: string;
  updated_at: string;
  step_description: string;
  can_advance: boolean;
}
