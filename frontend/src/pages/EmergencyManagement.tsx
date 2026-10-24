import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  PlusCircle,
  ExternalLink,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { Emergency } from '../types';
import { StatusBadge, Badge } from '../components/Badge';

export const EmergencyManagement: React.FC = () => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');

  // Selected for Details / History Drawer
  const [selectedIncident, setSelectedIncident] = useState<Emergency | null>(null);
  const [statusChangeNotes, setStatusChangeNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEmergencies();
      setEmergencies(data);
      if (selectedIncident) {
        const updated = data.find((e) => e.incident_id === selectedIncident.incident_id);
        if (updated) setSelectedIncident(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch emergencies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCreated = () => loadData();
    window.addEventListener('emergency_created', handleCreated);
    return () => window.removeEventListener('emergency_created', handleCreated);
  }, []);

  const handleStatusChange = async (targetStatus: string) => {
    if (!selectedIncident) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await api.updateEmergencyStatus(
        selectedIncident.incident_id,
        targetStatus,
        statusChangeNotes || `Dispatcher transitioned status to ${targetStatus}`
      );
      setStatusChangeNotes('');
      await loadData();
      setSelectedIncident(updated);
    } catch (err: any) {
      setActionError(err.message || 'Status transition rejected.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const filtered = emergencies.filter((em) => {
    if (statusFilter !== 'ALL' && em.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && em.severity !== severityFilter) return false;
    if (areaFilter !== 'ALL' && em.area !== areaFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        em.incident_id.toLowerCase().includes(q) ||
        em.incident_type.toLowerCase().includes(q) ||
        em.location_name.toLowerCase().includes(q) ||
        em.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#273444]">Emergency Incidents Directory</h1>
          <p className="text-xs text-[#687585]">
            Lifecycle management, full audit trail history, verification, and patient tracking access.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-[#E0E6EA] rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E0E6EA] shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by ID, symptom, area, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded outline-none focus:border-[#367F79] text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 outline-none text-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="Reported">Reported</option>
          <option value="Verified">Verified</option>
          <option value="Assigned">Assigned</option>
          <option value="En Route">En Route</option>
          <option value="Arrived">Arrived</option>
          <option value="Resolved">Resolved</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 outline-none text-xs"
        >
          <option value="ALL">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Normal">Normal</option>
        </select>

        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 outline-none text-xs"
        >
          <option value="ALL">All Zones</option>
          <option value="Central Zone">Central Zone</option>
          <option value="South Zone">South Zone</option>
          <option value="North Zone">North Zone</option>
          <option value="East Zone">East Zone</option>
          <option value="West Zone">West Zone</option>
        </select>

        <div className="ml-auto text-slate-500 font-medium">
          Total: <strong>{filtered.length}</strong> Incidents
        </div>
      </div>

      {/* Main Grid: Incident Table & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E0E6EA] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#273444]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Incident ID</th>
                  <th className="py-2.5 px-3">Type & Severity</th>
                  <th className="py-2.5 px-3">Location & Zone</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assigned Unit</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((em) => (
                  <tr
                    key={em.incident_id}
                    onClick={() => setSelectedIncident(em)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      selectedIncident?.incident_id === em.incident_id ? 'bg-[#DCEBE8]/30 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#24364B]">{em.incident_id}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(em.reported_at).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{em.incident_type}</div>
                      <div className="mt-0.5">
                        <StatusBadge status={em.severity} />
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="truncate max-w-[170px]" title={em.location_name}>
                        {em.location_name}
                      </div>
                      <div className="text-[10px] text-slate-400">{em.area}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <StatusBadge status={em.status} />
                    </td>

                    <td className="py-2.5 px-3">
                      {em.assigned_ambulance_id ? (
                        <span className="text-[#367F79] font-bold font-mono">
                          {em.assigned_ambulance_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedIncident(em)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No emergencies matching the filter criteria.
            </div>
          )}
        </div>

        {/* Details & Lifecycle Drawer (1 col) */}
        <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-2xs flex flex-col text-xs space-y-4">
          {selectedIncident ? (
            <>
              {/* Incident Header */}
              <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-[#24364B]">{selectedIncident.incident_id}</span>
                    <StatusBadge status={selectedIncident.severity} />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Logged: {new Date(selectedIncident.reported_at).toLocaleString()}
                  </div>
                </div>
                <StatusBadge status={selectedIncident.status} />
              </div>

              {actionError && (
                <div className="p-2.5 rounded bg-[#F5DAD8] text-[#872924] border border-[#f0c1be] text-[11px]">
                  {actionError}
                </div>
              )}

              {/* Clinical Details */}
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div><strong>Type:</strong> {selectedIncident.incident_type}</div>
                <div><strong>Required Unit:</strong> {selectedIncident.required_capability}</div>
                <div><strong>Location:</strong> {selectedIncident.location_name} ({selectedIncident.area})</div>
                <div><strong>Coordinates:</strong> {selectedIncident.latitude.toFixed(4)}, {selectedIncident.longitude.toFixed(4)}</div>
                <div><strong>Patients:</strong> {selectedIncident.patient_count}</div>
                <div><strong>Data Source:</strong> {selectedIncident.data_source}</div>
                <div><strong>Description:</strong> {selectedIncident.description}</div>
              </div>

              {/* Patient Live Tracking Share Box */}
              <div className="bg-[#DCEBE8]/50 border border-[#b4dbd4] p-2.5 rounded space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>Patient Live Tracking Link</span>
                  <a
                    href={`/track/${selectedIncident.tracking_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#367F79] hover:underline flex items-center space-x-0.5 text-[10px]"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-[10px] text-slate-600">
                  Unpredictable token: <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">{selectedIncident.tracking_token.substring(0, 16)}...</span>
                </div>
                <button
                  onClick={() => handleCopyLink(selectedIncident.tracking_token)}
                  className="w-full flex items-center justify-center space-x-1 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-medium text-slate-700 cursor-pointer"
                >
                  {copiedToken === selectedIncident.tracking_token ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Tracking URL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Lifecycle Actions */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <h4 className="font-semibold text-slate-700 text-xs">Transition Lifecycle Status</h4>
                <div className="text-[11px] text-slate-500">
                  Valid Progression: Reported &rarr; Verified &rarr; Assigned &rarr; En Route &rarr; Arrived &rarr; Resolved
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {selectedIncident.status === 'Reported' && (
                    <button
                      onClick={() => handleStatusChange('Verified')}
                      disabled={actionLoading}
                      className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium cursor-pointer"
                    >
                      Verify Call
                    </button>
                  )}

                  {selectedIncident.status === 'Assigned' && (
                    <button
                      onClick={() => handleStatusChange('En Route')}
                      disabled={actionLoading}
                      className="py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium cursor-pointer"
                    >
                      Mark En Route
                    </button>
                  )}

                  {selectedIncident.status === 'En Route' && (
                    <button
                      onClick={() => handleStatusChange('Arrived')}
                      disabled={actionLoading}
                      className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium cursor-pointer"
                    >
                      Mark Arrived
                    </button>
                  )}

                  {selectedIncident.status === 'Arrived' && (
                    <button
                      onClick={() => handleStatusChange('Resolved')}
                      disabled={actionLoading}
                      className="py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium cursor-pointer"
                    >
                      Resolve Incident
                    </button>
                  )}

                  {selectedIncident.status !== 'Resolved' && selectedIncident.status !== 'Cancelled' && (
                    <button
                      onClick={() => handleStatusChange('Cancelled')}
                      disabled={actionLoading}
                      className="py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium cursor-pointer"
                    >
                      Cancel Incident
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Optional log note for status transition..."
                  value={statusChangeNotes}
                  onChange={(e) => setStatusChangeNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs outline-none mt-1"
                />
              </div>

              {/* Status Audit History Timeline */}
              <div className="border-t border-slate-100 pt-3 space-y-2 flex-1 overflow-y-auto max-h-56">
                <h4 className="font-semibold text-slate-700 text-xs flex items-center space-x-1">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Audit Trail ({selectedIncident.history?.length || 0})</span>
                </h4>
                <div className="space-y-2 text-[11px]">
                  {selectedIncident.history?.map((h) => (
                    <div key={h.id} className="border-l-2 border-[#367F79] pl-2 py-0.5">
                      <div className="font-semibold text-slate-800">
                        {h.previous_status} &rarr; <span className="text-[#367F79]">{h.new_status}</span>
                      </div>
                      <div className="text-slate-500">{h.notes}</div>
                      <div className="text-[10px] text-slate-400">
                        By: {h.changed_by} &bull; {new Date(h.changed_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400">
              Select an emergency incident from the directory to review audit trail and manage lifecycle.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
