import {
  Emergency, Ambulance, Hospital, DispatchRecommendationResponse,
  HospitalRecommendationItem, CoverageResponse, RepositioningRecommendation,
  PatientTrackingResponse, HotspotAnalysisResponse, DashboardMetrics, SimulationStatus
} from '../types';

const BASE_URL = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const errData = await res.json();
      if (errData && errData.detail) {
        errMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Health & Dashboard
  getHealth: () => fetch(`${BASE_URL}/health`).then(r => handleResponse<any>(r)),
  getDashboardMetrics: () => fetch(`${BASE_URL}/dashboard/metrics`).then(r => handleResponse<DashboardMetrics>(r)),

  // Emergencies
  getEmergencies: (params?: { status?: string; severity?: string; area?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.severity) q.append('severity', params.severity);
    if (params?.area) q.append('area', params.area);
    return fetch(`${BASE_URL}/emergencies?${q.toString()}`).then(r => handleResponse<Emergency[]>(r));
  },
  getEmergency: (id: string) => fetch(`${BASE_URL}/emergencies/${id}`).then(r => handleResponse<Emergency>(r)),
  createEmergency: (data: Partial<Emergency>) =>
    fetch(`${BASE_URL}/emergencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Emergency>(r)),
  updateEmergencyStatus: (id: string, newStatus: string, notes: string = '') =>
    fetch(`${BASE_URL}/emergencies/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_status: newStatus, notes, changed_by: 'Dispatcher' })
    }).then(r => handleResponse<Emergency>(r)),
  revokeTrackingToken: (id: string) =>
    fetch(`${BASE_URL}/emergencies/${id}/revoke-token`, { method: 'POST' }).then(r => handleResponse<{ incident_id: string; new_tracking_token: string }>(r)),

  // Ambulances
  getAmbulances: (params?: { status?: string; area?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.area) q.append('area', params.area);
    return fetch(`${BASE_URL}/ambulances?${q.toString()}`).then(r => handleResponse<Ambulance[]>(r));
  },
  getAmbulance: (id: string) => fetch(`${BASE_URL}/ambulances/${id}`).then(r => handleResponse<Ambulance>(r)),
  createAmbulance: (data: Partial<Ambulance>) =>
    fetch(`${BASE_URL}/ambulances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => handleResponse<Ambulance>(r)),
  updateAmbulanceStatus: (id: string, status: string, notes: string = '') =>
    fetch(`${BASE_URL}/ambulances/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    }).then(r => handleResponse<Ambulance>(r)),
  updateAmbulanceLocation: (id: string, lat: number, lng: number) =>
    fetch(`${BASE_URL}/ambulances/${id}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng, source: 'Simulated GPS' })
    }).then(r => handleResponse<Ambulance>(r)),

  // Dispatch
  getDispatchRecommendations: (incidentId: string) =>
    fetch(`${BASE_URL}/dispatch/recommendations/${incidentId}`).then(r => handleResponse<DispatchRecommendationResponse>(r)),
  assignAmbulance: (incidentId: string, ambulanceId: string, reason: string = 'Optimal capability match and shortest ETA') =>
    fetch(`${BASE_URL}/dispatch/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident_id: incidentId, ambulance_id: ambulanceId, dispatch_reason: reason })
    }).then(r => handleResponse<any>(r)),

  // Map Elements
  getMapElements: () => fetch(`${BASE_URL}/map/elements`).then(r => handleResponse<any>(r)),

  // Patient Live Tracking
  getPatientTracking: (token: string) => fetch(`${BASE_URL}/tracking/${token}`).then(r => handleResponse<PatientTrackingResponse>(r)),

  // Fleet Coverage
  getCoverage: (thresholdMin: number = 10) =>
    fetch(`${BASE_URL}/coverage?eta_threshold_minutes=${thresholdMin}`).then(r => handleResponse<CoverageResponse>(r)),

  // Repositioning
  getRepositioningRecommendations: () => fetch(`${BASE_URL}/repositioning`).then(r => handleResponse<RepositioningRecommendation[]>(r)),
  actOnRepositioning: (recommendationId: number, action: 'approve' | 'reject' | 'cancel' | 'mark_arrived') =>
    fetch(`${BASE_URL}/repositioning/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendation_id: recommendationId, action })
    }).then(r => handleResponse<any>(r)),

  // Hospitals
  getHospitals: () => fetch(`${BASE_URL}/hospitals`).then(r => handleResponse<Hospital[]>(r)),
  getHospitalRecommendations: (incidentId: string) =>
    fetch(`${BASE_URL}/hospitals/recommendations/${incidentId}`).then(r => handleResponse<{ incident_id: string; incident_type: string; recommendations: HospitalRecommendationItem[] }>(r)),

  // Hotspots & Analytics
  getHotspots: (params?: { area?: string; severity?: string; type?: string; days?: number }) => {
    const q = new URLSearchParams();
    if (params?.area) q.append('area', params.area);
    if (params?.severity) q.append('severity', params.severity);
    if (params?.type) q.append('type', params.type);
    if (params?.days) q.append('days', params.days.toString());
    return fetch(`${BASE_URL}/hotspots?${q.toString()}`).then(r => handleResponse<HotspotAnalysisResponse>(r));
  },
  getAnalyticsMetrics: () => fetch(`${BASE_URL}/analytics/metrics`).then(r => handleResponse<any>(r)),
  getIncidentsCsvUrl: () => `${BASE_URL}/analytics/export/incidents.csv`,
  getAmbulancesCsvUrl: () => `${BASE_URL}/analytics/export/ambulances.csv`,

  // Simulation
  getSimulationStatus: () => fetch(`${BASE_URL}/simulation/status`).then(r => handleResponse<SimulationStatus>(r)),
  advanceSimulation: () => fetch(`${BASE_URL}/simulation/advance`, { method: 'POST' }).then(r => handleResponse<SimulationStatus>(r)),
  runAllSimulation: () => fetch(`${BASE_URL}/simulation/run-all`, { method: 'POST' }).then(r => handleResponse<SimulationStatus>(r)),
  resetSimulation: () => fetch(`${BASE_URL}/simulation/reset`, { method: 'POST' }).then(r => handleResponse<SimulationStatus>(r)),

  // Settings
  getDataSources: () => fetch(`${BASE_URL}/settings/data-sources`).then(r => handleResponse<any>(r)),
};
