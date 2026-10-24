import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { CreateEmergencyModal } from './CreateEmergencyModal';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7F8] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onCreateEmergencyClick={() => setCreateModalOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Emergency Create Modal */}
      <CreateEmergencyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          // Trigger a window event so current page can refresh
          window.dispatchEvent(new CustomEvent('emergency_created'));
        }}
      />
    </div>
  );
};
