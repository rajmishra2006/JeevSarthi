import React, { useEffect, useState } from 'react';
import { Download, BarChart3, Clock, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { Badge } from '../components/Badge';

const COLORS = ['#d93829', '#e67e22', '#367F79', '#2563EB', '#6b7280', '#8b5cf6'];

export const AnalyticsReports: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalyticsMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const severityChartData = metrics?.by_severity
    ? Object.entries(metrics.by_severity).map(([sev, count]) => ({
        name: sev,
        value: count
      }))
    : [];

  const typeChartData = metrics?.by_type
    ? Object.entries(metrics.by_type).map(([type, count]) => ({
        name: type,
        value: count
      }))
    : [];

  const areaChartData = metrics?.by_area
    ? Object.entries(metrics.by_area).map(([area, count]) => ({
        name: area,
        value: count
      }))
    : [];

  const formatSeconds = (sec?: number) => {
    if (!sec) return 'N/A';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Analytics & Performance Reports</h1>
            <Badge label="Audit-Grade Database Metrics" variant="info" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Verified response time distributions, incident volume breakdowns, and backend CSV data export.
          </p>
        </div>

        {/* CSV Export Buttons */}
        <div className="flex items-center space-x-2">
          <a
            href={api.getIncidentsCsvUrl()}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#367F79] hover:bg-[#2c6964] text-white rounded text-xs font-medium cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Incidents CSV</span>
          </a>

          <a
            href={api.getAmbulancesCsvUrl()}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E0E6EA] text-slate-700 hover:bg-slate-50 rounded text-xs font-medium cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Fleet CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs">
          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Historical Records</span>
          <span className="text-2xl font-bold text-[#273444]">{metrics?.total_historical_records}</span>
          <span className="text-xs text-slate-500 block mt-1">Stored in SQLite audit database</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs">
          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Mean Response Time</span>
          <span className="text-2xl font-bold text-[#367F79]">
            {formatSeconds(metrics?.average_response_time_seconds)}
          </span>
          <span className="text-xs text-slate-500 block mt-1">
            Calculated across {metrics?.calculated_from_valid_records} valid timestamps
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs">
          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Median Response Time</span>
          <span className="text-2xl font-bold text-blue-600">
            {formatSeconds(metrics?.median_response_time_seconds)}
          </span>
          <span className="text-xs text-slate-500 block mt-1">Excludes outliers and invalid transitions</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Severity Distribution */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
          <h3 className="text-xs font-semibold text-slate-800">Incidents by Clinical Severity</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume by Sector */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
          <h3 className="text-xs font-semibold text-slate-800">Incident Distribution Across Zones</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E6EA" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#367F79" radius={[4, 4, 0, 0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Baseline vs Smart Dispatch Comparison Note */}
      <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] text-xs space-y-2">
        <h4 className="font-semibold text-slate-800">Dispatch Method Evaluation:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600 text-[11px]">
          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <div className="font-bold text-slate-800 mb-1">Standard Dispatch Baseline:</div>
            <p>
              Traditional manual dispatch relies primarily on telephone operator intuition and static zone-based assignment.
              Units are frequently dispatched without verifying specialized equipment tiers (ALS/ICU) or detecting imminent zone coverage collapse.
            </p>
          </div>
          <div className="bg-[#DCEBE8]/40 p-3 rounded border border-[#b4dbd4]">
            <div className="font-bold text-[#235450] mb-1">JeevSarthi Smart Engine:</div>
            <p>
              Calculates multi-factor fitness ranking in real-time: capability verification prevents clinical mismatches,
              OSRM road routing estimates accurate travel time, and coverage monitoring alerts dispatchers to reposition standby units before blind spots emerge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
