import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Emergency } from '../types';

interface CreateEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newIncident: Emergency) => void;
}

const ZONE_PRESETS: Record<string, { lat: number; lng: number; defaultLocation: string }> = {
  'Central Zone': { lat: 28.6328, lng: 77.2195, defaultLocation: 'Connaught Place Circle, New Delhi' },
  'South Zone': { lat: 28.5672, lng: 77.2100, defaultLocation: 'Ring Road near AIIMS, New Delhi' },
  'North Zone': { lat: 28.7041, lng: 77.1025, defaultLocation: 'Sector 14 Rohini, Delhi' },
  'East Zone': { lat: 28.6080, lng: 77.2950, defaultLocation: 'Mayur Vihar Phase 1, Delhi' },
  'West Zone': { lat: 28.5921, lng: 77.0460, defaultLocation: 'Sector 10 Dwarka, Delhi' }
};

export const CreateEmergencyModal: React.FC<CreateEmergencyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [incidentType, setIncidentType] = useState('Cardiac Arrest');
  const [severity, setSeverity] = useState<'Critical' | 'High' | 'Normal'>('Critical');
  const [area, setArea] = useState('Central Zone');
  const [locationName, setLocationName] = useState('Connaught Place Circle, New Delhi');
  const [latitude, setLatitude] = useState('28.6328');
  const [longitude, setLongitude] = useState('77.2195');
  const [requiredCapability, setRequiredCapability] = useState('ALS');
  const [patientCount, setPatientCount] = useState(1);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAreaChange = (newArea: string) => {
    setArea(newArea);
    const preset = ZONE_PRESETS[newArea];
    if (preset) {
      setLatitude(preset.lat.toString());
      setLongitude(preset.lng.toString());
      setLocationName(preset.defaultLocation);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setError('Please provide valid decimal coordinates for Latitude and Longitude.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide an incident description for emergency responders.');
      return;
    }

    setLoading(true);
    try {
      const created = await api.createEmergency({
        incident_type: incidentType,
        severity,
        area,
        location_name: locationName,
        latitude: latNum,
        longitude: lngNum,
        required_capability: requiredCapability,
        patient_count: Number(patientCount),
        description: description.trim(),
        data_source: 'Dispatcher Intake Call',
        is_verified: true
      });
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create emergency incident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl border border-[#E0E6EA] overflow-hidden">
        {/* Header */}
        <div className="bg-[#24364B] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
            <h2 className="text-base font-semibold">Log New Emergency Call</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-md bg-[#F5DAD8] text-[#872924] border border-[#f0c1be] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-[#273444]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">Incident Type</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#367F79] outline-none"
              >
                <option value="Cardiac Arrest">Cardiac Arrest</option>
                <option value="Road Accident">Road Accident</option>
                <option value="Severe Trauma">Severe Trauma</option>
                <option value="Respiratory Distress">Respiratory Distress</option>
                <option value="Pregnancy/Labor">Pregnancy / Labor</option>
                <option value="Stroke">Stroke / CVA</option>
                <option value="General Medical">General Medical Emergency</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Severity Priority</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#367F79] outline-none"
              >
                <option value="Critical">Critical (Immediate Life-Threatening)</option>
                <option value="High">High Priority</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium mb-1">Zone Area</label>
              <select
                value={area}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#367F79] outline-none"
              >
                <option value="Central Zone">Central Zone</option>
                <option value="South Zone">South Zone</option>
                <option value="North Zone">North Zone</option>
                <option value="East Zone">East Zone</option>
                <option value="West Zone">West Zone</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Required Unit</label>
              <select
                value={requiredCapability}
                onChange={(e) => setRequiredCapability(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#367F79] outline-none"
              >
                <option value="BLS">Basic Life Support (BLS)</option>
                <option value="ALS">Advanced Life Support (ALS)</option>
                <option value="ICU">Intensive Care Unit (ICU)</option>
                <option value="Neonatal">Neonatal Transport</option>
                <option value="Transport">Patient Transport</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Patient Count</label>
              <input
                type="number"
                min="1"
                max="50"
                value={patientCount}
                onChange={(e) => setPatientCount(parseInt(e.target.value) || 1)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#367F79] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Human-Readable Location</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#367F79] outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">Latitude</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs focus:border-[#367F79] outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Longitude</label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs focus:border-[#367F79] outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Caller & Clinical Notes</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe symptoms, patient consciousness, obstacles, hazards, or caller directions..."
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-[#367F79] outline-none"
              required
            ></textarea>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#367F79] hover:bg-[#2c6964] text-white rounded font-medium cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? 'Logging Incident...' : 'Commit Emergency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
