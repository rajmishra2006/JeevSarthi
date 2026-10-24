import React, { useEffect, useState } from 'react';
import { Flame, Filter, RefreshCw, BarChart2, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line
} from 'recharts';
import { api } from '../services/api';
import { HotspotAnalysisResponse } from '../types';
import { StatusBadge, Badge } from '../components/Badge';

export const HotspotAnalysis: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<HotspotAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [days, setDays] = useState(30);
  const [area, setArea] = useState('ALL');
  const [severity, setSeverity] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getHotspots({
        days,
        area: area !== 'ALL' ? area : undefined,
        severity: severity !== 'ALL' ? severity : undefined
      });
      setAnalysisData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch hotspot analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [days, area, severity]);

  // Transform hourly distribution for Recharts
  const hourlyChartData = analysisData?.hourly_distribution
    ? Object.entries(analysisData.hourly_distribution).map(([hour, count]) => ({
        hour: `${hour}:00`,
        incidents: count
      }))
    : [];

  // Transform day-of-week distribution for Recharts
  const dayChartData = analysisData?.day_of_week_distribution
    ? Object.entries(analysisData.day_of_week_distribution).map(([day, count]) => ({
        day: day.substring(0, 3),
        incidents: count
      }))
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Historical Hotspot & Demand Analysis</h1>
            <Badge label="Simulated Benchmark Dataset" variant="simulated" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Temporal emergency clustering, hourly dispatch patterns, and explainable baseline demand forecasting.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-[#E0E6EA] rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E0E6EA] shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-slate-300 rounded px-2.5 py-1.5 outline-none"
          >
            <option value={7}>Past 7 Days</option>
            <option value={14}>Past 14 Days</option>
            <option value={30}>Past 30 Days</option>
            <option value={60}>Past 60 Days</option>
          </select>
        </div>

        <div>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1.5 outline-none"
          >
            <option value="ALL">All Zones</option>
            <option value="Central Zone">Central Zone</option>
            <option value="South Zone">South Zone</option>
            <option value="North Zone">North Zone</option>
            <option value="East Zone">East Zone</option>
            <option value="West Zone">West Zone</option>
          </select>
        </div>

        <div>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1.5 outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
          </select>
        </div>

        <div className="ml-auto text-slate-500 font-medium">
          Analyzed Records: <strong>{analysisData?.total_records_analyzed || 0}</strong>
        </div>
      </div>

      {/* Charts Grid: Hourly & Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Distribution Chart */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
          <h3 className="text-xs font-semibold text-slate-800">Time-of-Day Emergency Density (24-Hour Cycle)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E6EA" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E0E6EA', fontSize: '11px' }}
                />
                <Bar dataKey="incidents" fill="#367F79" radius={[4, 4, 0, 0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day-of-Week Distribution Chart */}
        <div className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-2">
          <h3 className="text-xs font-semibold text-slate-800">Day-of-Week Historical Call Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E6EA" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E0E6EA', fontSize: '11px' }}
                />
                <Bar dataKey="incidents" fill="#2563EB" radius={[4, 4, 0, 0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sector Hotspot Patterns & Strategic Standby Recommendations */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#273444]">Zone Hotspot Analysis & Proactive Standby Bases</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysisData?.patterns.map((item) => (
            <div key={item.area} className="bg-white p-4 rounded-lg border border-[#E0E6EA] shadow-2xs text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-sm text-[#24364B]">{item.area}</span>
                <Badge
                  label={item.risk_level}
                  variant={item.risk_level.includes('High') ? 'critical' : 'info'}
                  size="sm"
                />
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div>
                  <strong>Total Calls:</strong> {item.total_historical_incidents} (Critical: {item.critical_count}, High: {item.high_count})
                </div>
                <div>
                  <strong>Frequent Conditions:</strong> {item.top_emergency_types.join(', ')}
                </div>
                <div>
                  <strong>Peak Call Hours:</strong> {item.peak_hours.map((h) => `${h}:00`).join(', ')}
                </div>
                <div>
                  <strong>Hourly Rate Expectation:</strong> ~{item.estimated_hourly_demand} calls/hour
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recommended Standby Hub</span>
                <span className="font-bold text-[#367F79]">{item.suggested_standby_base}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology Disclaimer */}
      {analysisData?.methodology_note && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500">
          <strong>Statistical Methodology:</strong> {analysisData.methodology_note}
        </div>
      )}
    </div>
  );
};
