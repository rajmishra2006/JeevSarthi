import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Database, MapPin, Radio, Building2, Shield, Info, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/Badge';

export const SettingsDataSources: React.FC = () => {
  const [sources, setSources] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDataSources()
      .then((data) => setSources(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <h1 className="text-xl font-bold text-[#273444]">Settings & Data Source Disclosures</h1>
        <Badge label="Data Provenance Transparency" variant="info" size="sm" />
      </div>
      <p className="text-xs text-[#687585]">
        Complete disclosure of external interfaces, routing engines, simulation parameters, and clinical safety boundaries.
      </p>

      {/* Disclosures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Routing Engine */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <MapPin className="w-4 h-4 text-[#367F79]" />
            <span>Road Routing & ETA Calculation Engine</span>
          </div>
          <div className="space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
            <div>
              <strong>Primary Engine:</strong> {sources?.routing_service?.primary || 'OSRM Project Router (https://router.project-osrm.org)'}
            </div>
            <div>
              <strong>Fallback:</strong> {sources?.routing_service?.fallback || 'Haversine Great-Circle with 35 km/h urban velocity model'}
            </div>
            <div>
              <strong>Live Traffic:</strong> <span className="text-amber-800 font-medium">{sources?.routing_service?.live_traffic_status}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Road geometry polyline is returned by OSRM road graph when online. If offline or timeout occurs, straight-line fallback is clearly labeled.
          </p>
        </div>

        {/* GPS Telemetry Mode */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <Radio className="w-4 h-4 text-blue-600" />
            <span>Ambulance Telemetry & GPS Tracking</span>
          </div>
          <div className="space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
            <div>
              <strong>Mode:</strong> {sources?.gps_mode || 'Simulated GPS Feeds for Hackathon Demonstration'}
            </div>
            <div>
              <strong>Stale Threshold:</strong> 15 minutes of inactivity marks vehicle GPS as STALE.
            </div>
            <div>
              <strong>Update Pipe:</strong> REST polling / backend simulated trajectory progression.
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            All coordinates represent actual Delhi NCR landmarks (Connaught Place, AIIMS, Rohini, Mayur Vihar, Dwarka) rather than random coordinates.
          </p>
        </div>

        {/* Hospital Bed Feed */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Hospital Directory & Bed Management</span>
          </div>
          <div className="space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
            <div>
              <strong>Telemetry Mode:</strong> {sources?.hospital_bed_capacity}
            </div>
            <div>
              <strong>Disclosures:</strong> Unverified facilities report <em>Capacity Unknown</em> rather than invented capacity.
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Recommendations remain advisory. Dispatchers must always confirm ER availability prior to patient arrival.
          </p>
        </div>

        {/* Persistence Engine */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Persistence & Concurrency Control</span>
          </div>
          <div className="space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
            <div>
              <strong>Database:</strong> {sources?.database || 'SQLite with SQLAlchemy 2.0 ORM'}
            </div>
            <div>
              <strong>Conflict Prevention:</strong> Atomic row-locking transactions verify ambulance eligibility before committing.
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            State persists safely across backend restarts in <code>jeevsarthi.db</code>.
          </p>
        </div>
      </div>

      {/* Safety & Clinical Disclaimer */}
      <div className="bg-white p-5 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2 text-xs">
        <div className="flex items-center space-x-2 text-slate-800 font-bold">
          <Shield className="w-4 h-4 text-[#367F79]" />
          <span>Hackathon Operational Boundary & Disclaimer</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          {sources?.disclaimer}
        </p>
      </div>
    </div>
  );
};
