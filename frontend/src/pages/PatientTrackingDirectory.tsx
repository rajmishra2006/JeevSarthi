import React, { useEffect, useState } from 'react';
import { Radio, ExternalLink, Copy, Check, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { Emergency } from '../types';
import { StatusBadge, Badge } from '../components/Badge';

export const PatientTrackingDirectory: React.FC = () => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getEmergencies();
      setEmergencies(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleRevokeToken = async (incidentId: string) => {
    setRevokingId(incidentId);
    try {
      await api.revokeTrackingToken(incidentId);
      await loadData();
    } catch {
      // ignore
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#273444]">Patient Tracking Token Management</h1>
          <p className="text-xs text-[#687585]">
            Secure token distribution for patient and family live telemetry. Each incident receives a cryptographically random access hash.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-[#E0E6EA] rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Security Info Card */}
      <div className="bg-[#DCE8F5]/60 border border-[#bcd3ec] p-3.5 rounded-lg text-xs text-[#1E4570] flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-[#2563EB] mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-sm">Patient Privacy & Token Security Guidelines:</div>
          <p>
            Patients access tracking via an unguessable 64-character token. Sequential incident IDs are never exposed in patient URLs.
            If a link is leaked or compromised, click <strong>Revoke & Regenerate</strong> to invalidate the previous link immediately.
          </p>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-lg border border-[#E0E6EA] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#273444]">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Incident ID</th>
                <th className="py-2.5 px-3">Type & Severity</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Assigned Unit</th>
                <th className="py-2.5 px-3">Tracking Token Hash</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emergencies.map((em) => (
                <tr key={em.incident_id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-[#24364B]">
                    {em.incident_id}
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="font-medium">{em.incident_type}</div>
                    <div className="text-[10px] text-slate-400">{em.location_name}</div>
                  </td>

                  <td className="py-2.5 px-3">
                    <StatusBadge status={em.status} />
                  </td>

                  <td className="py-2.5 px-3">
                    {em.assigned_ambulance_id ? (
                      <span className="text-[#367F79] font-mono font-bold">{em.assigned_ambulance_id}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {em.tracking_token.substring(0, 16)}...
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleCopyLink(em.tracking_token)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-[11px] cursor-pointer inline-flex items-center space-x-1 font-medium"
                      title="Copy Patient Link"
                    >
                      {copiedToken === em.tracking_token ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`/track/${em.tracking_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-[#367F79] hover:bg-[#2c6964] text-white rounded text-[11px] inline-flex items-center space-x-1 font-medium"
                    >
                      <span>Open View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => handleRevokeToken(em.incident_id)}
                      disabled={revokingId === em.incident_id}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] cursor-pointer inline-flex items-center space-x-0.5"
                      title="Revoke & Generate New Token"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>{revokingId === em.incident_id ? 'Revoking...' : 'Revoke'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
