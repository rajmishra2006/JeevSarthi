import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CoverageResponse } from '../types';
import { StatusBadge, Badge } from '../components/Badge';

export const FleetCoverage: React.FC = () => {
  const navigate = useNavigate();
  const [coverageData, setCoverageData] = useState<CoverageResponse | null>(null);
  const [threshold, setThreshold] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (t: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCoverage(t);
      setCoverageData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate fleet coverage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(threshold);
  }, [threshold]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Fleet Coverage & Gap Monitor</h1>
            <Badge label="Dynamic Zone Analytics" variant="info" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Area-wise standby unit availability, zero-unit alerts, and threshold reachability analysis.
          </p>
        </div>

        <button
          onClick={() => loadData(threshold)}
          disabled={loading}
          className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-[#E0E6EA] rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Threshold Selector Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-700 flex items-center space-x-1">
            <Clock className="w-4 h-4 text-[#367F79]" />
            <span>Target Response Threshold:</span>
          </span>
          <div className="flex space-x-1 bg-slate-100 p-0.5 rounded border border-slate-200">
            {[5, 10, 15].map((mins) => (
              <button
                key={mins}
                onClick={() => setThreshold(mins)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  threshold === mins
                    ? 'bg-[#367F79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mins} Minutes
              </button>
            ))}
          </div>
        </div>

        <div className="text-slate-500">
          Total Eligible Units: <strong className="text-[#367F79]">{coverageData?.total_available}</strong> / {coverageData?.total_ambulances}
        </div>
      </div>

      {/* System Warning Banner if Deficit Exists */}
      {coverageData?.system_warning && (
        <div className="bg-[#F5DAD8] border border-[#f0c1be] p-4 rounded-lg text-xs text-[#872924] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold text-sm">Zone Coverage Deficit Warning</div>
              <div>{coverageData.system_warning}</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/repositioning')}
            className="px-3 py-1.5 bg-[#872924] hover:bg-[#72221d] text-white rounded font-medium cursor-pointer shrink-0"
          >
            Open Repositioning Hub &rarr;
          </button>
        </div>
      )}

      {/* Area Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coverageData?.areas.map((area) => (
          <div
            key={area.area}
            className={`bg-white rounded-lg border p-4 shadow-2xs space-y-3 ${
              area.is_gap
                ? 'border-red-300 ring-2 ring-red-100'
                : 'border-[#E0E6EA]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-[#273444]">{area.area}</h3>
              <StatusBadge status={area.coverage_status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase">Available Units</span>
                <span className={`text-xl font-bold ${area.available_ambulances === 0 ? 'text-red-600' : 'text-[#367F79]'}`}>
                  {area.available_ambulances}
                </span>
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase">Unassigned Calls</span>
                <span className={`text-xl font-bold ${area.unassigned_emergencies > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                  {area.unassigned_emergencies}
                </span>
              </div>
            </div>

            <div className="text-xs space-y-1 text-slate-600">
              <div>Assigned / En Route: <strong>{area.assigned_ambulances}</strong></div>
              <div>Out of Service (Maintenance): <strong>{area.out_of_service}</strong></div>
              {area.stale_location_count > 0 && (
                <div className="text-amber-700">
                  ⚠ Stale GPS Telemetry: <strong>{area.stale_location_count} unit(s)</strong>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Reachability within {threshold}m:</span>
              <span className={`font-semibold ${area.available_ambulances > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {area.available_ambulances > 0 ? 'Covered' : 'Unprotected'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Methodology and Distinction Disclosure */}
      <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] text-xs text-slate-600 space-y-2">
        <h4 className="font-semibold text-slate-800">Coverage Definition & Data Disclaimer:</h4>
        <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500">
          <li>
            <strong>Fleet Availability:</strong> Direct count of eligible ambulances currently marked 'Available' stationed within the zone boundary.
          </li>
          <li>
            <strong>Estimated Response Coverage:</strong> Estimated reachability based on road distance and {threshold}-minute threshold speed models. Does not guarantee real-world traffic clearance.
          </li>
          <li>
            Zero available units triggers an urgent repositioning recommendation from adjacent surplus zones.
          </li>
        </ul>
      </div>
    </div>
  );
};
