import React, { useEffect, useState } from 'react';
import { RefreshCw, Filter, Navigation, AlertCircle, Ambulance as AmbIcon, Building2 } from 'lucide-react';
import { api } from '../services/api';
import { LeafletMap } from '../components/LeafletMap';
import { StatusBadge, Badge } from '../components/Badge';

export const LiveEmergencyMap: React.FC = () => {
  const [mapElements, setMapElements] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterAmbStatus, setFilterAmbStatus] = useState('ALL');
  const [filterArea, setFilterArea] = useState('ALL');

  // Selected Incident & Active Route
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [activeRoute, setActiveRoute] = useState<any | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMapElements();
      setMapElements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch map elements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When an incident is selected, calculate or fetch route from assigned ambulance if any
  useEffect(() => {
    if (!selectedIncidentId || !mapElements) {
      setSelectedIncident(null);
      setActiveRoute(null);
      return;
    }

    const em = mapElements.emergencies.find((e: any) => e.incident_id === selectedIncidentId);
    setSelectedIncident(em || null);

    if (em && em.assigned_ambulance_id) {
      const amb = mapElements.ambulances.find((a: any) => a.ambulance_id === em.assigned_ambulance_id);
      if (amb) {
        setRouteLoading(true);
        // Call OSRM route endpoint via backend
        fetch(`/api/routes?start_lat=${amb.latitude}&start_lng=${amb.longitude}&end_lat=${em.latitude}&end_lng=${em.longitude}`)
          .then((r) => r.json())
          .then((routeData) => {
            setActiveRoute(routeData);
          })
          .catch(() => setActiveRoute(null))
          .finally(() => setRouteLoading(false));
      } else {
        setActiveRoute(null);
      }
    } else {
      setActiveRoute(null);
    }
  }, [selectedIncidentId, mapElements]);

  // Apply filters
  const filteredEmergencies = (mapElements?.emergencies || []).filter((em: any) => {
    if (filterSeverity !== 'ALL' && em.severity !== filterSeverity) return false;
    if (filterArea !== 'ALL' && em.area !== filterArea) return false;
    return true;
  });

  const filteredAmbulances = (mapElements?.ambulances || []).filter((amb: any) => {
    if (filterAmbStatus !== 'ALL' && amb.status !== filterAmbStatus) return false;
    if (filterArea !== 'ALL' && amb.area !== filterArea) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#273444]">Live Emergency GIS Map</h1>
            <Badge label="Simulated GPS" variant="simulated" size="sm" />
          </div>
          <p className="text-xs text-[#687585]">
            Real-time geospatial visualization of active incidents, standby fleet, hospitals, and route corridors.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400">
            {mapElements?.timestamp ? `Refreshed: ${new Date(mapElements.timestamp).toLocaleTimeString()}` : ''}
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-[#E0E6EA] rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-[#E0E6EA] shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 outline-none text-xs"
          >
            <option value="ALL">All Zones (5)</option>
            <option value="Central Zone">Central Zone</option>
            <option value="South Zone">South Zone</option>
            <option value="North Zone">North Zone</option>
            <option value="East Zone">East Zone</option>
            <option value="West Zone">West Zone</option>
          </select>
        </div>

        <div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 outline-none text-xs"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
          </select>
        </div>

        <div>
          <select
            value={filterAmbStatus}
            onChange={(e) => setFilterAmbStatus(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 outline-none text-xs"
          >
            <option value="ALL">All Ambulance Statuses</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="En Route">En Route</option>
            <option value="Out of Service">Out of Service</option>
          </select>
        </div>

        <div className="ml-auto text-[11px] text-slate-500">
          Showing: <strong>{filteredEmergencies.length}</strong> Incidents &bull; <strong>{filteredAmbulances.length}</strong> Units
        </div>
      </div>

      {/* Main Map View + Selected Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map (3 cols) */}
        <div className="lg:col-span-3">
          {mapElements && (
            <LeafletMap
              emergencies={filteredEmergencies}
              ambulances={filteredAmbulances}
              hospitals={mapElements.hospitals}
              repositions={mapElements.repositioning_targets}
              activeRouteGeometry={activeRoute?.geometry || null}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
              height="580px"
            />
          )}
        </div>

        {/* Side Panel: Selected Incident & Route Information */}
        <div className="space-y-4">
          {selectedIncident ? (
            <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-2xs text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-[#273444] text-sm">{selectedIncident.incident_id}</span>
                <StatusBadge status={selectedIncident.severity} />
              </div>

              <div>
                <div className="font-semibold text-slate-800 text-sm">{selectedIncident.incident_type}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">{selectedIncident.location_name} ({selectedIncident.area})</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div><strong>Status:</strong> {selectedIncident.status}</div>
                <div>
                  <strong>Assigned Ambulance:</strong>{' '}
                  {selectedIncident.assigned_ambulance_id ? (
                    <span className="text-[#367F79] font-bold">{selectedIncident.assigned_ambulance_id}</span>
                  ) : (
                    <span className="text-red-600 font-medium">None (Pending)</span>
                  )}
                </div>
                <div><strong>Caller Details:</strong> {selectedIncident.description}</div>
              </div>

              {/* Route calculation drawer */}
              {routeLoading && (
                <div className="text-center py-2 text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-1" />
                  Calculating road route...
                </div>
              )}

              {activeRoute && (
                <div className="bg-[#DCE8F5]/60 border border-[#bcd3ec] p-2.5 rounded space-y-1 text-slate-800">
                  <div className="font-semibold text-xs text-[#1E4570] flex items-center space-x-1">
                    <Navigation className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Live Route Calculation</span>
                  </div>
                  <div><strong>Est. Road Distance:</strong> {activeRoute.distance_km} km</div>
                  <div><strong>Travel Time:</strong> ~{activeRoute.estimated_time_min} minutes</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Provider: {activeRoute.provider}
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-1">{activeRoute.note}</div>
                </div>
              )}

              <button
                onClick={() => setSelectedIncidentId(null)}
                className="w-full py-1 text-center text-slate-500 hover:text-slate-800 border border-slate-200 rounded cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E0E6EA] p-5 shadow-2xs text-center text-xs text-slate-400 space-y-2">
              <AlertCircle className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="font-medium text-slate-600">Select an Incident</p>
              <p className="text-[11px]">Click on any emergency marker on the map to inspect dispatch status, unit assignment, and route geometry.</p>
            </div>
          )}

          {/* Incident Quick Picker */}
          <div className="bg-white rounded-lg border border-[#E0E6EA] p-3 shadow-2xs">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">Active Emergency List</h3>
            <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs">
              {filteredEmergencies.map((em: any) => (
                <button
                  key={em.incident_id}
                  onClick={() => setSelectedIncidentId(em.incident_id)}
                  className={`w-full text-left p-2 rounded border transition-colors cursor-pointer ${
                    selectedIncidentId === em.incident_id
                      ? 'border-[#367F79] bg-[#DCEBE8]/40'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{em.incident_id}</span>
                    <span className={`text-[10px] font-bold ${em.severity === 'Critical' ? 'text-red-600' : 'text-amber-600'}`}>
                      {em.severity}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{em.incident_type} &bull; {em.area}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
