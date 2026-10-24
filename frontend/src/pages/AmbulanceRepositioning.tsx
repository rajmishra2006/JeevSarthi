import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, ShieldAlert, CheckCircle2, XCircle, Navigation, RefreshCw, AlertCircle, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { RepositioningRecommendation } from '../types';
import { StatusBadge, Badge } from '../components/Badge';

export const AmbulanceRepositioning: React.FC = () => {
  const [recommendations, setRecommendations] = useState<RepositioningRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRepositioningRecommendations();
      setRecommendations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repositioning recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (recId: number, action: 'approve' | 'reject' | 'cancel' | 'mark_arrived') => {
    setActionLoadingId(recId);
    setActionMsg(null);
    setActionErr(null);
    try {
      const res = await api.actOnRepositioning(recId, action);
      setActionMsg(res.message);
      await loadData();
    } catch (err: any) {
      setActionErr(err.message || 'Repositioning action rejected.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Smart Ambulance Repositioning</h1>
            <Badge label="Explainable AI Logic" variant="info" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Proactive standby relocations from surplus sectors to deficit sectors to eliminate emergency coverage blind spots.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-[#E0E6EA] rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-Evaluate Fleet</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 bg-[#DCEBE8] text-[#235450] rounded-md border border-[#b4dbd4] text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionErr && (
        <div className="p-3 bg-[#F5DAD8] text-[#872924] rounded-md border border-[#f0c1be] text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionErr}</span>
        </div>
      )}

      {/* Recommendations List */}
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`bg-white p-4 rounded-lg border shadow-2xs space-y-3 text-xs ${
              rec.status === 'Suggested'
                ? 'border-[#367F79] ring-2 ring-[#367F79]/15'
                : 'border-[#E0E6EA]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-[#24364B]">
                  Unit {rec.ambulance_id}: {rec.origin_area} &rarr; {rec.target_area}
                </span>
                <Badge label={rec.priority + ' Priority'} variant={rec.priority === 'High' ? 'critical' : 'warning'} size="sm" />
              </div>
              <StatusBadge status={rec.status} />
            </div>

            {/* Explanation rationale */}
            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 leading-relaxed">
              <strong>Clinical & Strategic Rationale:</strong> {rec.reason}
            </div>

            {/* Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-slate-600">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Transit Distance</span>
                  <span className="font-bold text-slate-800">{rec.distance_km} km</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Transit Time</span>
                  <span className="font-bold text-[#367F79]">~{rec.estimated_time_min} mins</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Standby Target Coords</span>
                  <span className="font-mono text-slate-600">{rec.target_lat.toFixed(4)}, {rec.target_lng.toFixed(4)}</span>
                </div>
              </div>

              {/* Action Buttons based on lifecycle */}
              <div className="flex items-center space-x-2">
                {rec.status === 'Suggested' && (
                  <>
                    <button
                      onClick={() => handleAction(rec.id, 'approve')}
                      disabled={actionLoadingId === rec.id}
                      className="px-3 py-1.5 bg-[#367F79] hover:bg-[#2c6964] text-white rounded font-medium cursor-pointer"
                    >
                      Approve Relocation
                    </button>
                    <button
                      onClick={() => handleAction(rec.id, 'reject')}
                      disabled={actionLoadingId === rec.id}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-medium cursor-pointer"
                    >
                      Reject
                    </button>
                  </>
                )}

                {rec.status === 'Approved' && (
                  <button
                    onClick={() => handleAction(rec.id, 'mark_arrived')}
                    disabled={actionLoadingId === rec.id}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium cursor-pointer"
                  >
                    Confirm Arrival at Standby Hub
                  </button>
                )}

                {(rec.status === 'Approved' || rec.status === 'En Route to Standby') && (
                  <button
                    onClick={() => handleAction(rec.id, 'cancel')}
                    disabled={actionLoadingId === rec.id}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium cursor-pointer"
                  >
                    Cancel Move
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {recommendations.length === 0 && !loading && (
          <div className="bg-white p-8 rounded-lg border border-[#E0E6EA] text-center text-xs text-slate-400">
            No standby repositioning recommended at this moment. Fleet distribution matches active demand.
          </div>
        )}
      </div>
    </div>
  );
};
