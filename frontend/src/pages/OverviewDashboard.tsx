import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Ambulance,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Users,
  Activity,
  Flame,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';
import { StatusBadge, Badge } from '../components/Badge';
import { LeafletMap } from '../components/LeafletMap';

export const OverviewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [mapElements, setMapElements] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [m, mapEl] = await Promise.all([
        api.getDashboardMetrics(),
        api.getMapElements()
      ]);
      setMetrics(m);
      setMapElements(mapEl);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for emergency creations from Navbar modal
    const handleCreated = () => loadData();
    window.addEventListener('emergency_created', handleCreated);
    return () => window.removeEventListener('emergency_created', handleCreated);
  }, []);

  const formatSeconds = (sec?: number | null) => {
    if (!sec) return 'N/A';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m ${s}s`;
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <RefreshCw className="w-8 h-8 text-[#367F79] animate-spin" />
        <p className="text-sm text-slate-500">Connecting to JeevSarthi dispatch engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#F5DAD8] text-[#872924] p-4 rounded-lg border border-[#f0c1be] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1 bg-white text-slate-800 text-xs rounded border border-slate-300 font-medium hover:bg-slate-50 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#273444]">Dispatcher Overview</h1>
          <p className="text-xs text-[#687585]">
            Real-time incident response, automated unit scoring, and coverage monitoring.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400">
            Updated: {metrics?.last_updated ? new Date(metrics.last_updated).toLocaleTimeString() : 'Now'}
          </span>
          <button
            onClick={loadData}
            className="p-1.5 rounded bg-white border border-[#E0E6EA] text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Emergencies */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Emergencies</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#273444]">{metrics?.total_active_emergencies}</span>
            <span className="text-xs text-red-600 font-medium">
              ({metrics?.critical_emergencies} Critical, {metrics?.high_priority_emergencies} High)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#687585]">
            Unassigned pending dispatch: <strong className="text-red-700">{metrics?.unassigned_incidents}</strong>
          </div>
        </div>

        {/* Available Fleet */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Available Ambulances</span>
            <Ambulance className="w-4 h-4 text-[#367F79]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#367F79]">{metrics?.available_ambulances}</span>
            <span className="text-xs text-slate-500">Ready for dispatch</span>
          </div>
          <div className="mt-2 text-[11px] text-[#687585]">
            Active missions: <strong>{(metrics?.assigned_ambulances || 0) + (metrics?.en_route_ambulances || 0)}</strong> | Out of Service: <strong className="text-slate-500">{metrics?.out_of_service_ambulances}</strong>
          </div>
        </div>

        {/* Coverage Status */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Zone Coverage Gaps</span>
            <ShieldAlert className={`w-4 h-4 ${(metrics?.coverage_warnings_count || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#273444]">{metrics?.coverage_warnings_count}</span>
            <span className={`text-xs font-medium ${(metrics?.coverage_warnings_count || 0) > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
              {(metrics?.coverage_warnings_count || 0) > 0 ? 'Deficits Identified' : 'Adequate Fleet'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#687585]">
            Auto-repositioning active across 5 zones
          </div>
        </div>

        {/* Response Time */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Avg Response Time</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#273444]">
              {formatSeconds(metrics?.average_response_time_seconds)}
            </span>
            <span className="text-xs text-slate-500">
              (Median: {formatSeconds(metrics?.median_response_time_seconds)})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#687585]">
            Computed from {metrics?.valid_response_records_count} resolved incidents
          </div>
        </div>
      </div>

      {/* Map Preview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Preview (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-[#273444]">Live Operational Map</h2>
              <Badge label="Simulated GPS" variant="simulated" size="sm" />
            </div>
            <button
              onClick={() => navigate('/map')}
              className="text-xs text-[#367F79] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
            >
              <span>Full Screen Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-h-[360px]">
            {mapElements && (
              <LeafletMap
                emergencies={mapElements.emergencies}
                ambulances={mapElements.ambulances}
                hospitals={mapElements.hospitals}
                repositions={mapElements.repositioning_targets}
                height="380px"
              />
            )}
          </div>
        </div>

        {/* Area-wise Fleet Coverage Summary */}
        <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#273444]">Area Coverage Overview</h2>
            <button
              onClick={() => navigate('/coverage')}
              className="text-xs text-[#367F79] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
            >
              <span>Details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {metrics?.area_coverage_summary?.map((area) => (
              <div
                key={area.area}
                className={`p-2.5 rounded-md border text-xs flex items-center justify-between ${
                  area.is_gap
                    ? 'bg-[#F5DAD8]/40 border-[#f0c1be]'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-800">{area.area}</div>
                  <div className="text-[11px] text-slate-500">
                    Avail: <strong className={area.available_ambulances === 0 ? 'text-red-600' : 'text-emerald-700'}>{area.available_ambulances}</strong> | Active: {area.assigned_ambulances} | Unassigned: {area.unassigned_emergencies}
                  </div>
                </div>
                <StatusBadge status={area.coverage_status} />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Repositioning Engine</span>
            <button
              onClick={() => navigate('/repositioning')}
              className="text-[#367F79] hover:underline font-medium cursor-pointer"
            >
              Review Standby Moves &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity and Latest Dispatch Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Dispatch Decisions */}
        <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#273444]">Latest Dispatch Decisions</h2>
            <button
              onClick={() => navigate('/dispatch')}
              className="text-xs text-[#367F79] hover:underline font-medium cursor-pointer"
            >
              Dispatch Center &rarr;
            </button>
          </div>

          {metrics?.latest_dispatch_decisions && metrics.latest_dispatch_decisions.length > 0 ? (
            <div className="space-y-2 text-xs">
              {metrics.latest_dispatch_decisions.map((disp) => (
                <div key={disp.id} className="p-2.5 rounded border border-slate-100 bg-slate-50/70 flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">
                      Ambulance <span className="text-[#367F79]">{disp.ambulance_id}</span> &rarr; Incident <span className="text-red-700">{disp.incident_id}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{disp.dispatch_reason}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Engine: {disp.recommended_by} | Time: {new Date(disp.assigned_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <Badge label={disp.status} variant="info" size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent dispatches logged. Use the Smart Dispatch engine to allocate units.
            </div>
          )}
        </div>

        {/* Recent Incident Activity */}
        <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#273444]">Live Incident Activity Stream</h2>
            <button
              onClick={() => navigate('/emergencies')}
              className="text-xs text-[#367F79] hover:underline font-medium cursor-pointer"
            >
              All Emergencies &rarr;
            </button>
          </div>

          {metrics?.recent_activity && metrics.recent_activity.length > 0 ? (
            <div className="space-y-2 text-xs">
              {metrics.recent_activity.slice(0, 5).map((act) => (
                <div key={act.id} className="p-2.5 rounded border border-slate-100 bg-white flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#367F79] mt-1 shrink-0"></span>
                    <div>
                      <div className="font-medium text-slate-800">
                        Incident <strong>{act.incident_id}</strong> &bull; Status: <span className="text-[#367F79] font-medium">{act.new_status}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{act.notes}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {new Date(act.changed_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent incident lifecycle transitions recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
