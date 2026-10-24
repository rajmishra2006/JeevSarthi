import React, { useEffect, useState } from 'react';
import { Building2, Navigation, AlertCircle, RefreshCw, CheckCircle2, Phone, Star } from 'lucide-react';
import { api } from '../services/api';
import { Emergency, HospitalRecommendationItem, Hospital } from '../types';
import { StatusBadge, Badge } from '../components/Badge';

export const HospitalRecommendations: React.FC = () => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<HospitalRecommendationItem[]>([]);
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      const [emData, hospData] = await Promise.all([
        api.getEmergencies(),
        api.getHospitals()
      ]);
      setEmergencies(emData);
      setAllHospitals(hospData);
      if (emData.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(emData[0].incident_id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedIncidentId) return;

    const fetchHospRecs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getHospitalRecommendations(selectedIncidentId);
        setRecommendations(res.recommendations);
      } catch (err: any) {
        setError(err.message || 'Failed to generate hospital recommendations.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospRecs();
  }, [selectedIncidentId]);

  const currentEmergency = emergencies.find((e) => e.incident_id === selectedIncidentId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Hospital Facility Recommendations</h1>
            <Badge label="Clinical Specialty Matching" variant="info" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Incident-specific destination routing based on trauma level, cardiac/stroke facilities, ICU beds, and road network travel times.
          </p>
        </div>

        <button
          onClick={loadInitialData}
          className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-[#E0E6EA] rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Incident Selection Dropdown */}
      <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
        <label className="block text-xs font-semibold text-slate-700">Select Emergency to Route Destination Hospital:</label>
        <select
          value={selectedIncidentId}
          onChange={(e) => setSelectedIncidentId(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2 text-xs outline-none focus:border-[#367F79] font-medium"
        >
          {emergencies.map((em) => (
            <option key={em.incident_id} value={em.incident_id}>
              {em.incident_id} &bull; {em.incident_type} &bull; {em.location_name} ({em.severity})
            </option>
          ))}
        </select>

        {currentEmergency && (
          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
            <strong>Target Specialty Required:</strong> {currentEmergency.incident_type} &bull;{' '}
            <strong>Location:</strong> {currentEmergency.location_name} ({currentEmergency.area})
          </div>
        )}
      </div>

      {/* Advisory Banner */}
      <div className="p-3 bg-[#F6E8C8]/70 border border-[#edd59a] rounded-lg text-xs text-[#7A540F] flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>
          <strong>Advisory Note:</strong> Hospital recommendations are decision-support guidelines. Destination hospital must be confirmed by paramedic/dispatcher with direct facility ER intake.
        </span>
      </div>

      {/* Ranked Hospital Options */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#273444]">Ranked Destination Facilities</h2>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500 bg-white rounded-lg border border-[#E0E6EA]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#367F79] mb-2" />
            Matching clinical capabilities and calculating road travel time...
          </div>
        ) : recommendations.length > 0 ? (
          recommendations.map((rec, idx) => (
            <div
              key={rec.hospital.hospital_id}
              className={`bg-white p-4 rounded-lg border shadow-2xs text-xs space-y-3 ${
                rec.is_recommended
                  ? 'border-[#367F79] ring-2 ring-[#367F79]/15'
                  : 'border-[#E0E6EA]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  {rec.is_recommended && (
                    <span className="p-1 rounded bg-[#367F79] text-white" title="Optimal Match">
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </span>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-[#24364B]">{rec.hospital.name}</h3>
                    <div className="text-[11px] text-slate-500">{rec.hospital.address} ({rec.hospital.area})</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge
                    label={rec.hospital.is_capacity_simulated ? 'SIMULATED EHR FEED' : 'VERIFIED CAPACITY'}
                    variant={rec.hospital.is_capacity_simulated ? 'simulated' : 'success'}
                    size="sm"
                  />
                  <StatusBadge status={rec.hospital.capacity_status} />
                </div>
              </div>

              {/* Rationale and Facility Capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <div>
                    <strong>Match Analysis:</strong> {rec.explanation}
                  </div>
                  <div className="text-slate-600">
                    <strong>Specialties & Equipment:</strong> {rec.hospital.capabilities}
                  </div>
                  <div className="text-slate-600">
                    <strong>Capacity Telemetry:</strong>{' '}
                    <span className="font-semibold text-slate-800">{rec.capacity_display}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 self-start">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Road Distance</span>
                    <span className="font-bold text-slate-800 text-sm">{rec.distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Travel Time</span>
                    <span className="font-bold text-[#367F79] text-sm">~{rec.estimated_time_min} mins</span>
                  </div>
                  <div className="pt-1 text-[11px] flex items-center space-x-1 text-slate-600">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{rec.hospital.contact_phone}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-lg border border-[#E0E6EA]">
            Select an incident above to evaluate hospital recommendations.
          </div>
        )}
      </div>
    </div>
  );
};
