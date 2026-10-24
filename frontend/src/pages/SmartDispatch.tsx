import React, { useEffect, useState } from 'react';
import {
  Zap,
  AlertTriangle,
  Ambulance,
  CheckCircle,
  XCircle,
  Clock,
  Navigation,
  ShieldCheck,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Emergency, DispatchRecommendationResponse, DispatchRecommendationItem } from '../types';
import { StatusBadge, Badge } from '../components/Badge';

export const SmartDispatch: React.FC = () => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [recommendationsData, setRecommendationsData] = useState<DispatchRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assignment action state
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Load unassigned emergencies
  const loadEmergencies = async () => {
    try {
      const data = await api.getEmergencies();
      // Prioritize unassigned or pending emergencies
      const unassigned = data.filter((e) => e.status === 'Reported' || e.status === 'Verified');
      setEmergencies(unassigned.length > 0 ? unassigned : data);
      if (unassigned.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(unassigned[0].incident_id);
      } else if (data.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(data[0].incident_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load emergencies.');
    }
  };

  useEffect(() => {
    loadEmergencies();
  }, []);

  // Fetch recommendations whenever selected incident changes
  useEffect(() => {
    if (!selectedIncidentId) return;

    const fetchRecs = async () => {
      setLoading(true);
      setError(null);
      setAssignSuccess(null);
      setAssignError(null);
      try {
        const res = await api.getDispatchRecommendations(selectedIncidentId);
        setRecommendationsData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to evaluate dispatch recommendations.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecs();
  }, [selectedIncidentId]);

  const handleAssign = async (ambItem: DispatchRecommendationItem) => {
    if (!selectedIncidentId) return;
    setAssigningId(ambItem.ambulance_id);
    setAssignSuccess(null);
    setAssignError(null);

    try {
      const res = await api.assignAmbulance(
        selectedIncidentId,
        ambItem.ambulance_id,
        ambItem.explanation
      );
      setAssignSuccess(res.message || `Ambulance ${ambItem.ambulance_id} dispatched!`);
      // Reload emergencies and recommendations
      await loadEmergencies();
      const updatedRecs = await api.getDispatchRecommendations(selectedIncidentId);
      setRecommendationsData(updatedRecs);
    } catch (err: any) {
      setAssignError(err.message || 'Assignment failed due to collision or status change.');
    } finally {
      setAssigningId(null);
    }
  };

  const currentEmergency = emergencies.find((e) => e.incident_id === selectedIncidentId);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Smart Dispatch Decision Engine</h1>
            <Badge label="Active Multi-Factor Ranking" variant="success" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Algorithmic scoring combining clinical capability hierarchy, road routing ETA, location freshness, and conflict safety locks.
          </p>
        </div>

        <button
          onClick={loadEmergencies}
          className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-[#E0E6EA] rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Pool</span>
        </button>
      </div>

      {/* Incident Selector Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-3">
        <label className="block text-xs font-semibold text-slate-700">Select Emergency Call for Dispatch Evaluation:</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="md:col-span-2 border border-slate-300 rounded px-3 py-2 text-xs outline-none focus:border-[#367F79] font-medium"
          >
            {emergencies.map((em) => (
              <option key={em.incident_id} value={em.incident_id}>
                {em.incident_id} &bull; {em.severity.toUpperCase()} &bull; {em.incident_type} &bull; {em.location_name} ({em.status})
              </option>
            ))}
          </select>

          {currentEmergency && (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Required Tier:</span>{' '}
                <strong className="text-[#367F79]">{currentEmergency.required_capability}</strong>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="text-slate-500">Status:</span>{' '}
                <strong className="text-slate-700">{currentEmergency.status}</strong>
              </div>
            </div>
          )}
        </div>

        {currentEmergency && (
          <div className="p-3 bg-slate-50/80 rounded border border-slate-200 text-xs text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <strong>Reported Location:</strong> {currentEmergency.location_name} ({currentEmergency.area}) &bull;{' '}
              <strong>Description:</strong> {currentEmergency.description}
            </div>
            {currentEmergency.assigned_ambulance_id && (
              <div className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded font-medium whitespace-nowrap">
                Current Unit: {currentEmergency.assigned_ambulance_id}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Notification Messages */}
      {assignSuccess && (
        <div className="p-3 bg-[#DCEBE8] text-[#235450] rounded-md border border-[#b4dbd4] text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{assignSuccess}</span>
        </div>
      )}

      {assignError && (
        <div className="p-3 bg-[#F5DAD8] text-[#872924] rounded-md border border-[#f0c1be] text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <div>
            <strong>Dispatch Conflict Rejection:</strong> {assignError}
            <div className="text-[11px] text-red-700 mt-0.5">The backend safely rejected this assignment because the vehicle state changed or was already engaged.</div>
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#273444] flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[#367F79]" />
            <span>Ranked Ambulance Options</span>
          </h2>
          {recommendationsData && (
            <span className="text-xs text-slate-500">
              Evaluated {recommendationsData.recommendations.length} total units
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-lg border border-[#E0E6EA]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#367F79] mb-2" />
            Running spatial scoring algorithms and road route calculations...
          </div>
        ) : recommendationsData ? (
          <>
            {recommendationsData.fallback_advice && (
              <div className="p-3 bg-[#F6E8C8] text-[#7A540F] rounded-md border border-[#dfc37f] text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{recommendationsData.fallback_advice}</span>
              </div>
            )}

            <div className="space-y-3">
              {recommendationsData.recommendations.map((rec) => (
                <div
                  key={rec.ambulance_id}
                  className={`bg-white p-4 rounded-lg border transition-all text-xs shadow-2xs ${
                    rec.recommendation_rank === 1 && rec.is_eligible
                      ? 'border-[#367F79] ring-2 ring-[#367F79]/20'
                      : rec.is_eligible
                      ? 'border-[#E0E6EA]'
                      : 'border-slate-200 bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Unit Identity & Rank */}
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          rec.recommendation_rank === 1 && rec.is_eligible
                            ? 'bg-[#367F79] text-white shadow-xs'
                            : rec.is_eligible
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        #{rec.recommendation_rank}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-[#24364B]">{rec.ambulance_id}</span>
                          <span className="text-slate-500">({rec.model} &bull; {rec.vehicle_number})</span>
                          <StatusBadge status={rec.status} />
                          {rec.is_stale_location && (
                            <Badge label="STALE GPS" variant="warning" size="sm" />
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Base: <strong>{rec.area}</strong> &bull; Equipment: <span className="text-[#367F79] font-medium">{rec.capabilities}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Metrics (Distance, ETA, Score) */}
                    <div className="flex items-center space-x-6 bg-slate-50 px-3 py-2 rounded border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Road Distance</div>
                        <div className="font-bold text-slate-800">{rec.distance_km} km</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Estimated ETA</div>
                        <div className="font-bold text-[#367F79]">~{rec.estimated_time_min} mins</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Match Score</div>
                        <div className={`font-bold ${rec.is_eligible ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {rec.score} / 100
                        </div>
                      </div>
                    </div>

                    {/* Right: Dispatch Button */}
                    <div className="shrink-0 flex items-center space-x-2">
                      <button
                        onClick={() => handleAssign(rec)}
                        disabled={!rec.is_eligible || assigningId === rec.ambulance_id}
                        className={`px-4 py-2 rounded font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer ${
                          rec.is_eligible
                            ? rec.recommendation_rank === 1
                              ? 'bg-[#367F79] hover:bg-[#2c6964] text-white shadow-xs'
                              : 'bg-slate-800 hover:bg-slate-900 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>
                          {assigningId === rec.ambulance_id
                            ? 'Dispatching...'
                            : rec.recommendation_rank === 1 && rec.is_eligible
                            ? 'Approve Optimal Dispatch'
                            : rec.is_eligible
                            ? 'Dispatch This Unit'
                            : 'Ineligible'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Recommendation Explanation & Quality Notes */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between text-[11px] text-slate-600 gap-2">
                    <div>
                      <strong>Analysis:</strong> {rec.explanation}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Routing: {rec.routing_provider}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-lg border border-[#E0E6EA]">
            Select an incident above to calculate dispatch suitability recommendations.
          </div>
        )}
      </div>
    </div>
  );
};
