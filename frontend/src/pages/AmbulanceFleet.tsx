import React, { useEffect, useState } from 'react';
import {
  Ambulance as AmbIcon,
  Search,
  Filter,
  PlusCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Edit,
  MapPin,
  CheckCircle2,
  XCircle,
  Wrench
} from 'lucide-react';
import { api } from '../services/api';
import { Ambulance } from '../types';
import { StatusBadge, Badge } from '../components/Badge';

export const AmbulanceFleet: React.FC = () => {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [capFilter, setCapFilter] = useState('ALL');

  // Selected Unit for Detail & Status Change
  const [selectedAmbulance, setSelectedAmbulance] = useState<Ambulance | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add Ambulance Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('Force Traveller ALS');
  const [newArea, setNewArea] = useState('Central Zone');
  const [newCaps, setNewCaps] = useState('ALS, BLS');
  const [newEquipment, setNewEquipment] = useState('Oxygen, Defibrillator, Cardiac Monitor');
  const [newLat, setNewLat] = useState('28.6300');
  const [newLng, setNewLng] = useState('77.2180');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAmbulances();
      setAmbulances(data);
      if (selectedAmbulance) {
        const up = data.find((a) => a.ambulance_id === selectedAmbulance.ambulance_id);
        if (up) setSelectedAmbulance(up);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ambulance fleet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async () => {
    if (!selectedAmbulance || !newStatus) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await api.updateAmbulanceStatus(selectedAmbulance.ambulance_id, newStatus, statusNotes);
      setStatusNotes('');
      await loadData();
      setSelectedAmbulance(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update ambulance status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (isNaN(lat) || isNaN(lng)) {
      setCreateError('Invalid coordinates.');
      return;
    }

    setCreateLoading(true);
    try {
      await api.createAmbulance({
        ambulance_id: newId.trim().toUpperCase(),
        vehicle_number: newPlate.trim(),
        model: newModel,
        area: newArea,
        capabilities: newCaps,
        equipment_list: newEquipment,
        latitude: lat,
        longitude: lng,
        status: 'Available',
        crew_notes: 'Newly commissioned unit.',
        is_simulated_gps: true
      });
      setShowAddModal(false);
      setNewId('');
      setNewPlate('');
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to add ambulance.');
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = ambulances.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (areaFilter !== 'ALL' && a.area !== areaFilter) return false;
    if (capFilter !== 'ALL' && !a.capabilities.toUpperCase().includes(capFilter)) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        a.ambulance_id.toLowerCase().includes(q) ||
        a.vehicle_number.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.capabilities.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Ambulance Fleet Management</h1>
            <Badge label="Simulated GPS" variant="simulated" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Vehicle telemetry, medical equipment tier tracking, maintenance locking, and status monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#367F79] hover:bg-[#2c6964] text-white rounded text-xs font-medium cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Ambulance</span>
          </button>
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

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E0E6EA] shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by Unit ID, plate, model, equipment..."
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
          <option value="Available">Available</option>
          <option value="Assigned">Assigned</option>
          <option value="En Route">En Route</option>
          <option value="Busy">Busy</option>
          <option value="Out of Service">Out of Service</option>
        </select>

        <select
          value={capFilter}
          onChange={(e) => setCapFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 outline-none text-xs"
        >
          <option value="ALL">All Capabilities</option>
          <option value="ALS">Advanced Life Support (ALS)</option>
          <option value="ICU">Intensive Care Unit (ICU)</option>
          <option value="BLS">Basic Life Support (BLS)</option>
          <option value="NEONATAL">Neonatal Transport</option>
        </select>

        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 outline-none text-xs"
        >
          <option value="ALL">All Base Areas</option>
          <option value="Central Zone">Central Zone</option>
          <option value="South Zone">South Zone</option>
          <option value="North Zone">North Zone</option>
          <option value="East Zone">East Zone</option>
          <option value="West Zone">West Zone</option>
        </select>

        <div className="ml-auto text-slate-500 font-medium">
          Total: <strong>{filtered.length}</strong> Units
        </div>
      </div>

      {/* Main Grid: Fleet Cards / Table + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((amb) => (
              <div
                key={amb.ambulance_id}
                onClick={() => {
                  setSelectedAmbulance(amb);
                  setNewStatus(amb.status);
                }}
                className={`bg-white p-3.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                  selectedAmbulance?.ambulance_id === amb.ambulance_id
                    ? 'border-[#367F79] ring-2 ring-[#367F79]/20'
                    : 'border-[#E0E6EA] hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-sm text-[#24364B]">{amb.ambulance_id}</span>
                      {amb.is_stale && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold" title="GPS update older than 15 minutes">
                          STALE GPS
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{amb.model} &bull; {amb.vehicle_number}</div>
                  </div>
                  <StatusBadge status={amb.status} />
                </div>

                <div className="text-xs space-y-1 my-2 text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  <div><strong>Base:</strong> {amb.area}</div>
                  <div><strong>Tier:</strong> <span className="text-[#367F79] font-medium">{amb.capabilities}</span></div>
                  {amb.current_incident_id && (
                    <div><strong>Assigned To:</strong> <span className="text-red-700 font-bold">{amb.current_incident_id}</span></div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                  <span>GPS: {amb.latitude.toFixed(3)}, {amb.longitude.toFixed(3)}</span>
                  <span>Upd: {new Date(amb.last_location_update).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="bg-white p-8 rounded-lg border border-[#E0E6EA] text-center text-xs text-slate-400">
              No ambulances found matching the search criteria.
            </div>
          )}
        </div>

        {/* Selected Unit Control Drawer (1 col) */}
        <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-2xs text-xs space-y-4">
          {selectedAmbulance ? (
            <>
              <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#24364B]">{selectedAmbulance.ambulance_id}</h3>
                  <div className="text-[11px] text-slate-500">{selectedAmbulance.model} ({selectedAmbulance.vehicle_number})</div>
                </div>
                <StatusBadge status={selectedAmbulance.status} />
              </div>

              {actionError && (
                <div className="p-2.5 rounded bg-[#F5DAD8] text-[#872924] border border-[#f0c1be] text-[11px]">
                  {actionError}
                </div>
              )}

              {/* Equipment & Capabilities */}
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div><strong>Base Area:</strong> {selectedAmbulance.area}</div>
                <div><strong>Capabilities:</strong> {selectedAmbulance.capabilities}</div>
                <div><strong>Equipment Carried:</strong> {selectedAmbulance.equipment_list}</div>
                <div><strong>Coordinates:</strong> {selectedAmbulance.latitude.toFixed(4)}, {selectedAmbulance.longitude.toFixed(4)}</div>
                <div><strong>Last Location Ping:</strong> {new Date(selectedAmbulance.last_location_update).toLocaleString()}</div>
                {selectedAmbulance.current_incident_id && (
                  <div>
                    <strong>Active Emergency:</strong>{' '}
                    <span className="text-red-700 font-bold">{selectedAmbulance.current_incident_id}</span>
                  </div>
                )}
                {selectedAmbulance.crew_notes && (
                  <div><strong>Crew Notes:</strong> {selectedAmbulance.crew_notes}</div>
                )}
              </div>

              {/* Status Update Control */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <h4 className="font-semibold text-slate-700">Update Operational Status</h4>
                <div>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 outline-none focus:border-[#367F79] text-xs"
                  >
                    <option value="Available">Available (Ready for Dispatch)</option>
                    <option value="Assigned">Assigned</option>
                    <option value="En Route">En Route</option>
                    <option value="Busy">Busy (Post-Handover / Cleaning)</option>
                    <option value="Out of Service">Out of Service (Maintenance)</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Reason / Notes for status change..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs outline-none"
                />

                <button
                  onClick={handleStatusUpdate}
                  disabled={actionLoading}
                  className="w-full py-1.5 bg-[#367F79] hover:bg-[#2c6964] text-white rounded font-medium cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Commit Status Change'}
                </button>
              </div>

              {/* Safety Rules Reminder */}
              <div className="p-2.5 rounded bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 space-y-1">
                <div className="font-semibold flex items-center space-x-1">
                  <Wrench className="w-3.5 h-3.5 text-blue-700" />
                  <span>Fleet Safety Rules:</span>
                </div>
                <p>Ambulances assigned to active emergencies cannot be shifted to 'Out of Service' until incident resolution.</p>
                <p>Only units marked 'Available' are eligible for automated dispatch scoring.</p>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400">
              Select an ambulance unit to inspect equipment, telemetry, and change operational status.
            </div>
          )}
        </div>
      </div>

      {/* Add Ambulance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-[#E0E6EA] overflow-hidden">
            <div className="bg-[#24364B] text-white px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Commission New Ambulance</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {createError && (
              <div className="m-4 p-2.5 rounded bg-[#F5DAD8] text-[#872924] text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAmbulance} className="p-5 space-y-3 text-xs text-[#273444]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Ambulance ID</label>
                  <input
                    type="text"
                    placeholder="e.g. AMB-109"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 uppercase outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Registration Plate</label>
                  <input
                    type="text"
                    placeholder="DL-1T-5432"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Vehicle Model</label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Base Zone</label>
                <select
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 outline-none"
                >
                  <option value="Central Zone">Central Zone</option>
                  <option value="South Zone">South Zone</option>
                  <option value="North Zone">North Zone</option>
                  <option value="East Zone">East Zone</option>
                  <option value="West Zone">West Zone</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Capabilities (comma-separated)</label>
                <input
                  type="text"
                  value={newCaps}
                  onChange={(e) => setNewCaps(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Equipment List</label>
                <input
                  type="text"
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Latitude</label>
                  <input
                    type="text"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Longitude</label>
                  <input
                    type="text"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 bg-[#367F79] hover:bg-[#2c6964] text-white rounded font-medium cursor-pointer"
                >
                  {createLoading ? 'Adding...' : 'Commission Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
