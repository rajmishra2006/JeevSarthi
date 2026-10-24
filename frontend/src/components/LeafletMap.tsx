import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapIncident {
  id: number;
  incident_id: string;
  incident_type: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string;
  area: string;
  status: string;
  assigned_ambulance_id?: string | null;
}

interface MapAmbulance {
  id: number;
  ambulance_id: string;
  vehicle_number: string;
  model: string;
  latitude: number;
  longitude: number;
  area: string;
  capabilities: string;
  status: string;
  current_incident_id?: string | null;
  is_stale: boolean;
}

interface MapHospital {
  id: number;
  hospital_id: string;
  name: string;
  latitude: number;
  longitude: number;
  area: string;
  capabilities: string;
  capacity_status: string;
  available_icu_beds: number;
}

interface MapRepositioning {
  id: number;
  ambulance_id: string;
  target_area: string;
  latitude: number;
  longitude: number;
  status: string;
  reason: string;
}

interface LeafletMapProps {
  emergencies?: MapIncident[];
  ambulances?: MapAmbulance[];
  hospitals?: MapHospital[];
  repositions?: MapRepositioning[];
  activeRouteGeometry?: [number, number][] | null;
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
  height?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  emergencies = [],
  ambulances = [],
  hospitals = [],
  repositions = [],
  activeRouteGeometry = null,
  selectedIncidentId = null,
  onSelectIncident,
  height = '500px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered around Delhi NCR: 28.62, 77.21
    const map = L.map(mapContainerRef.current, {
      center: [28.628, 77.215],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers and Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const bounds = L.latLngBounds([]);

    // 1. Render Emergencies
    emergencies.forEach((em) => {
      if (!em.latitude || !em.longitude) return;
      const isCritical = em.severity.toLowerCase() === 'critical';
      const isSelected = selectedIncidentId === em.incident_id;

      const markerHtml = `
        <div style="position: relative; cursor: pointer;">
          <div style="
            width: ${isSelected ? '28px' : '22px'};
            height: ${isSelected ? '28px' : '22px'};
            background-color: ${isCritical ? '#d93829' : '#e67e22'};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
          ">
            !
          </div>
          ${isCritical ? `
            <div style="
              position: absolute;
              top: -4px;
              left: -4px;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 2px solid #d93829;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          ` : ''}
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-emergency-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([em.latitude, em.longitude], { icon });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; color: #273444; min-width: 180px;">
          <div style="font-weight: bold; font-size: 13px; color: ${isCritical ? '#872924' : '#7A540F'}; margin-bottom: 2px;">
            ${em.incident_id} — ${em.incident_type}
          </div>
          <div style="font-size: 11px; color: #687585; margin-bottom: 6px;">
            ${em.location_name} (${em.area})
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Severity:</strong> <span style="color: ${isCritical ? '#872924' : '#7A540F'}">${em.severity}</span><br/>
            <strong>Status:</strong> ${em.status}<br/>
            ${em.assigned_ambulance_id ? `<strong>Assigned Unit:</strong> ${em.assigned_ambulance_id}` : '<strong>Assigned:</strong> None (Unassigned)'}
          </div>
          <p style="margin: 0; font-size: 11px; color: #4b5563;">${em.description}</p>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectIncident) onSelectIncident(em.incident_id);
      });

      marker.addTo(layerGroup);
      bounds.extend([em.latitude, em.longitude]);
    });

    // 2. Render Ambulances
    ambulances.forEach((amb) => {
      if (!amb.latitude || !amb.longitude) return;
      const statusLower = amb.status.toLowerCase();
      let color = '#367F79'; // Available teal
      if (statusLower === 'assigned' || statusLower === 'en route') color = '#2563EB'; // Blue
      else if (statusLower === 'out of service') color = '#6B7280'; // Grey

      const ambHtml = `
        <div style="
          background-color: ${color};
          border: 2px solid #ffffff;
          color: #ffffff;
          border-radius: 6px;
          padding: 2px 5px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 2px 5px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          🚑 ${amb.ambulance_id}
          ${amb.is_stale ? '<span style="color:#fde047;">⚠</span>' : ''}
        </div>
      `;

      const icon = L.divIcon({
        html: ambHtml,
        className: 'custom-ambulance-icon',
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });

      const marker = L.marker([amb.latitude, amb.longitude], { icon });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; color: #273444; min-width: 180px;">
          <div style="font-weight: bold; font-size: 13px; color: #24364B; margin-bottom: 2px;">
            ${amb.ambulance_id} (${amb.model})
          </div>
          <div style="font-size: 11px; color: #687585; margin-bottom: 6px;">
            Plate: ${amb.vehicle_number} | Base: ${amb.area}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Status:</strong> ${amb.status}<br/>
            <strong>Capabilities:</strong> ${amb.capabilities}<br/>
            ${amb.current_incident_id ? `<strong>Dispatched To:</strong> ${amb.current_incident_id}` : ''}
            ${amb.is_stale ? '<span style="color:#b45309; font-weight:bold;">Warning: GPS Stale (&gt;15 min)</span><br/>' : ''}
          </div>
          <div style="font-size: 10px; color: #9ca3af; font-family: monospace;">Simulated GPS Location</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(layerGroup);
      bounds.extend([amb.latitude, amb.longitude]);
    });

    // 3. Render Hospitals
    hospitals.forEach((hosp) => {
      if (!hosp.latitude || !hosp.longitude) return;

      const hospHtml = `
        <div style="
          background-color: #6366f1;
          border: 2px solid #ffffff;
          color: #ffffff;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          H
        </div>
      `;

      const icon = L.divIcon({
        html: hospHtml,
        className: 'custom-hospital-icon',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([hosp.latitude, hosp.longitude], { icon });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; color: #273444; min-width: 190px;">
          <div style="font-weight: bold; font-size: 13px; color: #1e1b4b; margin-bottom: 2px;">
            ${hosp.name}
          </div>
          <div style="font-size: 11px; color: #687585; margin-bottom: 4px;">
            ${hosp.area}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Status:</strong> ${hosp.capacity_status}<br/>
            <strong>ICU Beds:</strong> ${hosp.available_icu_beds}<br/>
            <strong>Specialties:</strong> ${hosp.capabilities}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(layerGroup);
      bounds.extend([hosp.latitude, hosp.longitude]);
    });

    // 4. Render Standby / Repositioning Targets
    repositions.forEach((rep) => {
      const repHtml = `
        <div style="
          border: 2px dashed #f59e0b;
          background-color: rgba(245, 158, 11, 0.2);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #b45309;
          font-weight: bold;
        ">
          🎯
        </div>
      `;

      const icon = L.divIcon({
        html: repHtml,
        className: 'custom-reposition-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([rep.latitude, rep.longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong>Standby Hub: ${rep.target_area}</strong><br/>
          Assigned Unit: ${rep.ambulance_id}<br/>
          Status: ${rep.status}<br/>
          <em>${rep.reason}</em>
        </div>
      `);
      marker.addTo(layerGroup);
      bounds.extend([rep.latitude, rep.longitude]);
    });

    // 5. Render Active Route Polyline
    if (activeRouteGeometry && activeRouteGeometry.length > 0) {
      const polyline = L.polyline(activeRouteGeometry, {
        color: '#2563EB',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(map);
      routeLayerRef.current = polyline;
      bounds.extend(polyline.getBounds());
    }

    // Fit map bounds if markers exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [emergencies, ambulances, hospitals, repositions, activeRouteGeometry, selectedIncidentId, onSelectIncident]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-[#E0E6EA] shadow-xs">
      <div ref={mapContainerRef} style={{ height }} />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs p-2.5 rounded-md shadow-md border border-slate-200 text-[11px] text-[#273444] space-y-1">
        <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1 mb-1">Map Legend</div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#d93829] border border-white shrink-0"></span>
          <span>Critical Emergency</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#e67e22] border border-white shrink-0"></span>
          <span>High Priority Emergency</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3 bg-[#367F79] rounded text-[8px] text-white flex items-center justify-center font-bold shrink-0">AMB</span>
          <span>Available Ambulance</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3 bg-[#2563EB] rounded text-[8px] text-white flex items-center justify-center font-bold shrink-0">AMB</span>
          <span>Assigned / En Route</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#6366f1] text-[8px] text-white flex items-center justify-center font-bold shrink-0">H</span>
          <span>Hospital Center</span>
        </div>
      </div>
    </div>
  );
};
