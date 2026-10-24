import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  HeartPulse,
  Clock,
  Navigation,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Ambulance,
  PhoneCall
} from 'lucide-react';
import { api } from '../services/api';
import { PatientTrackingResponse } from '../types';
import { StatusBadge, Badge } from '../components/Badge';
import L from 'leaflet';

export const PatientLiveTracking: React.FC = () => {
  const { trackingToken } = useParams<{ trackingToken: string }>();
  const [trackingData, setTrackingData] = useState<PatientTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const fetchTracking = async (showLoading = false) => {
    if (!trackingToken) return;
    if (showLoading) setLoading(true);
    try {
      const data = await api.getPatientTracking(trackingToken);
      setTrackingData(data);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Tracking session expired or invalid.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial load + lightweight polling every 4 seconds
  useEffect(() => {
    fetchTracking(true);
    const interval = setInterval(() => {
      fetchTracking(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [trackingToken]);

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.63, 77.21],
      zoom: 13,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map markers and route when tracking data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !trackingData) return;

    layerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    // 1. Ambulance Marker (if assigned)
    if (trackingData.assigned_ambulance) {
      const amb = trackingData.assigned_ambulance;
      const ambIcon = L.divIcon({
        html: `
          <div style="
            background-color: #367F79;
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 8px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            🚑 ${amb.ambulance_id} (${amb.status})
          </div>
        `,
        className: 'custom-patient-amb',
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      });

      const ambMarker = L.marker([amb.latitude, amb.longitude], { icon: ambIcon }).addTo(layerGroup);
      bounds.extend([amb.latitude, amb.longitude]);
    }

    // 2. Route Polyline
    if (trackingData.route_geometry && trackingData.route_geometry.length > 0) {
      const polyline = L.polyline(trackingData.route_geometry, {
        color: '#2563EB',
        weight: 6,
        opacity: 0.85,
        dashArray: '6, 6'
      }).addTo(layerGroup);
      bounds.extend(polyline.getBounds());
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [trackingData]);

  if (loading && !trackingData) {
    return (
      <div className="min-h-screen bg-[#F5F7F8] flex flex-col items-center justify-center p-4">
        <HeartPulse className="w-10 h-10 text-[#367F79] animate-pulse mb-3" />
        <h2 className="text-base font-bold text-[#273444]">Connecting to JeevSarthi Live Dispatch...</h2>
        <p className="text-xs text-[#687585] mt-1">Retrieving incident telemetry and ambulance road route.</p>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-[#F5F7F8] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-6 rounded-lg border border-[#E0E6EA] shadow-md text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-[#273444]">Tracking Link Expired or Invalid</h2>
          <p className="text-xs text-[#687585]">
            {error || 'This live tracking session is no longer active or the access hash is incorrect.'}
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
            For immediate life-safety emergencies, contact official emergency dispatch directly.
          </div>
        </div>
      </div>
    );
  }

  const LIFECYCLE_STEPS = ['Reported', 'Verified', 'Assigned', 'En Route', 'Arrived', 'Resolved'];
  const currentStepIdx = LIFECYCLE_STEPS.indexOf(trackingData.status);

  return (
    <div className="min-h-screen bg-[#F5F7F8] flex flex-col">
      {/* Brand Top Header */}
      <header className="bg-[#24364B] text-white py-3.5 px-4 sm:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#367F79] flex items-center justify-center text-white">
            <HeartPulse className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">JeevSarthi Live Tracking</h1>
            <p className="text-[10px] text-[#DCEBE8]">Patient & Responder Coordination</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge label="SIMULATED GPS" variant="simulated" size="sm" />
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Poll: 4s &bull; {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Incident Summary Card */}
        <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-[#24364B]">Ref: {trackingData.incident_id}</span>
                <StatusBadge status={trackingData.severity} />
              </div>
              <div className="text-xs text-slate-600 mt-0.5 font-medium">
                {trackingData.incident_type} &bull; {trackingData.location_name}
              </div>
            </div>
            <div className="self-start sm:self-auto">
              <StatusBadge status={trackingData.status} />
            </div>
          </div>

          {/* Lifecycle Progress Bar */}
          <div className="py-2">
            <div className="text-xs font-semibold text-slate-700 mb-2">Emergency Response Progress:</div>
            <div className="grid grid-cols-6 gap-1 text-center">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step} className="space-y-1">
                    <div
                      className={`h-2 rounded-full ${
                        isCurrent
                          ? 'bg-[#367F79] ring-2 ring-[#367F79]/30'
                          : isPassed
                          ? 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    />
                    <span
                      className={`text-[10px] block truncate ${
                        isCurrent ? 'font-bold text-[#367F79]' : isPassed ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Ambulance ETA Banner */}
          {trackingData.assigned_ambulance ? (
            <div className="bg-[#DCEBE8]/60 border border-[#b4dbd4] p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#367F79] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Ambulance className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    Ambulance {trackingData.assigned_ambulance.ambulance_id} ({trackingData.assigned_ambulance.model})
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Registration: {trackingData.assigned_ambulance.vehicle_number} &bull; Unit Status: <strong>{trackingData.assigned_ambulance.status}</strong>
                  </div>
                </div>
              </div>

              {trackingData.estimated_time_min !== null && (
                <div className="bg-white px-3 py-1.5 rounded border border-[#b4dbd4] text-right self-start sm:self-auto">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Arrival</div>
                  <div className="font-bold text-sm text-[#367F79]">~{trackingData.estimated_time_min} Minutes</div>
                  <div className="text-[10px] text-slate-500">{trackingData.estimated_distance_km} km away</div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#F6E8C8]/60 border border-[#edd59a] p-3 rounded-md text-xs text-[#7A540F] flex items-center space-x-2">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Emergency verified. Dispatch engine is currently assigning the nearest certified ambulance. Telemetry will update automatically.
              </span>
            </div>
          )}

          {trackingData.is_stale_location && (
            <div className="p-2.5 rounded bg-[#F6E8C8] text-[#7A540F] text-[11px] flex items-center space-x-2 border border-[#edd59a]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Ambulance GPS telemetry has not refreshed in &gt;15 minutes. Displayed location may be delayed.</span>
            </div>
          )}
        </div>

        {/* Live Route Map */}
        <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Live Response Map</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Provider: {trackingData.routing_provider || 'Route Network'}
            </span>
          </div>
          <div ref={mapContainerRef} className="w-full h-80 rounded-md border border-slate-200" />
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg border border-[#E0E6EA] p-4 shadow-xs space-y-3">
          <h3 className="font-semibold text-xs text-slate-800">Dispatch Audit Log</h3>
          <div className="space-y-2 text-xs">
            {trackingData.status_timeline.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-2.5 border-l-2 border-[#367F79] pl-3 py-1">
                <div>
                  <div className="font-bold text-slate-800">
                    {item.status} &bull;{' '}
                    <span className="text-slate-400 font-normal">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{item.notes}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Honest Disclaimer Banner */}
        <div className="p-3 bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-500 text-center">
          {trackingData.disclaimer}
        </div>
      </main>
    </div>
  );
};
