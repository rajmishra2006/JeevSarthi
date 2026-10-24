import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { LiveEmergencyMap } from './pages/LiveEmergencyMap';
import { EmergencyManagement } from './pages/EmergencyManagement';
import { AmbulanceFleet } from './pages/AmbulanceFleet';
import { SmartDispatch } from './pages/SmartDispatch';
import { PatientTrackingDirectory } from './pages/PatientTrackingDirectory';
import { PatientLiveTracking } from './pages/PatientLiveTracking';
import { FleetCoverage } from './pages/FleetCoverage';
import { AmbulanceRepositioning } from './pages/AmbulanceRepositioning';
import { HospitalRecommendations } from './pages/HospitalRecommendations';
import { HotspotAnalysis } from './pages/HotspotAnalysis';
import { AnalyticsReports } from './pages/AnalyticsReports';
import { DemoSimulation } from './pages/DemoSimulation';
import { SettingsDataSources } from './pages/SettingsDataSources';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone Patient Live Tracking Route */}
        <Route path="/track/:trackingToken" element={<PatientLiveTracking />} />

        {/* Dispatcher Dashboard Management Shell */}
        <Route path="/" element={<Layout />}>
          <Route index element={<OverviewDashboard />} />
          <Route path="map" element={<LiveEmergencyMap />} />
          <Route path="emergencies" element={<EmergencyManagement />} />
          <Route path="ambulances" element={<AmbulanceFleet />} />
          <Route path="dispatch" element={<SmartDispatch />} />
          <Route path="patient-tracking" element={<PatientTrackingDirectory />} />
          <Route path="coverage" element={<FleetCoverage />} />
          <Route path="repositioning" element={<AmbulanceRepositioning />} />
          <Route path="hospitals" element={<HospitalRecommendations />} />
          <Route path="hotspots" element={<HotspotAnalysis />} />
          <Route path="analytics" element={<AnalyticsReports />} />
          <Route path="simulation" element={<DemoSimulation />} />
          <Route path="settings" element={<SettingsDataSources />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
