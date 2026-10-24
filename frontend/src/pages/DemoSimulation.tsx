import React, { useEffect, useState } from 'react';
import { PlayCircle, RotateCcw, StepForward, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { SimulationStatus } from '../types';
import { Badge } from '../components/Badge';

export const DemoSimulation: React.FC = () => {
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getSimulationStatus();
      setStatus(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      const res = await api.advanceSimulation();
      setStatus(res);
    } catch {
      // ignore
    } finally {
      setAdvancing(false);
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      const res = await api.runAllSimulation();
      setStatus(res);
    } catch {
      // ignore
    } finally {
      setRunningAll(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await api.resetSimulation();
      setStatus(res);
      setShowResetConfirm(false);
    } catch {
      // ignore
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Deterministic Hackathon Demo Scenario</h1>
            <Badge label="Repeatable 16-Step Workflow" variant="warning" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Controlled, judge-ready scenario demonstrating simultaneous calls, smart dispatch, collision safety, coverage alerts, repositioning, and live tracking.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAdvance}
            disabled={advancing || runningAll || !status?.can_advance}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#367F79] hover:bg-[#2c6964] text-white rounded text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>{advancing ? 'Executing Step...' : 'Advance Next Step'}</span>
          </button>

          <button
            onClick={handleRunAll}
            disabled={runningAll || advancing || !status?.can_advance}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{runningAll ? 'Running...' : 'Run All Steps'}</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting}
            className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 rounded text-xs font-medium cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Progress & Current Step Card */}
      <div className="bg-white p-5 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Active Demonstration Step</div>
            <div className="text-lg font-bold text-[#24364B]">
              Step {status?.current_step} of {status?.total_steps}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">
              Scenario: <strong>{status?.scenario_name}</strong>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Scenario Progress</span>
            <span className="font-bold text-[#367F79]">
              {Math.round(((status?.current_step || 0) / (status?.total_steps || 16)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#367F79] transition-all duration-300"
              style={{
                width: `${((status?.current_step || 0) / (status?.total_steps || 16)) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Current Step Description Box */}
        <div className="bg-[#DCEBE8]/40 border border-[#b4dbd4] p-4 rounded-lg space-y-2">
          <div className="font-bold text-sm text-[#235450] flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#367F79]" />
            <span>Active State Action</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {status?.step_description}
          </p>
          <div className="text-[11px] text-slate-500 italic">
            Log Status: {status?.status_message}
          </div>
        </div>
      </div>

      {/* Full 16-Step Demonstration Plan */}
      <div className="bg-white p-5 rounded-lg border border-[#E0E6EA] shadow-2xs space-y-3 text-xs">
        <h3 className="font-bold text-sm text-[#273444]">Complete Hackathon Demonstration Sequence</h3>
        <p className="text-slate-500">
          Judges can observe each sequential stage of automated emergency management backed by actual database transactions:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
          {[
            '0. Fresh Demo Initialization & Fleet Standby',
            '1. Inspect Live GIS Map (Delhi NCR Zones)',
            '2. Select Critical Incident INC-2026-001 (Cardiac Arrest in CP)',
            '3. Run Smart Dispatch Scoring Algorithm',
            '4. Review Multi-Factor Ranking (#1 AMB-101 ALS certified)',
            '5. Dispatcher Approves Assignment (Atomic DB lock)',
            '6. Test Assignment Conflict Rejection (Safety check verified)',
            '7. Dispatch Unit AMB-104 to North Zone Trauma',
            '8. Coverage Gap Triggered (North Zone drops to 0 units)',
            '9. Proactive Repositioning Engine Recommends Standby Move',
            '10. Dispatcher Approves Repositioning of AMB-103',
            '11. Inspect Secure Patient Tracking Link (/track/:token)',
            '12. Advance Simulated Telemetry Towards Incident',
            '13. Ambulance Arrives on Scene (Patient status updates)',
            '14. Repositioned Ambulance Arrives at Rohini Hub (Coverage restored)',
            '15. Patient Stabilized & Incident Resolved',
            '16. Final Performance & Audit Metrics Review'
          ].map((item, idx) => {
            const isCompleted = (status?.current_step || 0) >= idx;
            const isCurrent = (status?.current_step || 0) === idx;
            return (
              <div
                key={idx}
                className={`p-2.5 rounded border text-xs flex items-center space-x-2 ${
                  isCurrent
                    ? 'bg-[#367F79] text-white border-[#367F79] font-bold shadow-xs'
                    : isCompleted
                    ? 'bg-[#DCEBE8]/30 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                    isCurrent
                      ? 'bg-white text-[#367F79]'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? '✓' : idx}
                </span>
                <span className="truncate">{item}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-[#E0E6EA] p-5 space-y-4">
            <div className="flex items-center space-x-2 text-red-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Reset Demo to Benchmark State?</span>
            </div>
            <p className="text-xs text-slate-600">
              This will safely re-initialize the local SQLite database, restoring all 8 ambulances, initial emergencies, and historical incidents to Step 0.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
