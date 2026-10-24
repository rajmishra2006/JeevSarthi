import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  Ambulance,
  Zap,
  Radio,
  ShieldAlert,
  ArrowRightLeft,
  Building2,
  Flame,
  BarChart3,
  PlayCircle,
  Settings,
  HeartPulse
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { name: 'Overview Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Live Emergency Map', path: '/map', icon: MapPin },
    { name: 'Emergency Management', path: '/emergencies', icon: AlertTriangle },
    { name: 'Ambulance Fleet', path: '/ambulances', icon: Ambulance },
    { name: 'Smart Dispatch', path: '/dispatch', icon: Zap },
    { name: 'Patient Tracking', path: '/patient-tracking', icon: Radio },
    { name: 'Fleet Coverage', path: '/coverage', icon: ShieldAlert },
    { name: 'Ambulance Repositioning', path: '/repositioning', icon: ArrowRightLeft },
    { name: 'Hospital Directory', path: '/hospitals', icon: Building2 },
    { name: 'Hotspot Analysis', path: '/hotspots', icon: Flame },
    { name: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
    { name: 'Demo Simulation', path: '/simulation', icon: PlayCircle, highlight: true },
    { name: 'Settings & Data Sources', path: '/settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-[#24364B] text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#367F79] flex items-center justify-center text-white shadow-md">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-wide">JeevSarthi</h1>
              <p className="text-[11px] text-[#DCEBE8] tracking-tight">Emergency Response Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-[#367F79] text-white font-medium shadow-sm'
                      : item.highlight
                      ? 'text-amber-300 hover:bg-slate-700/50 hover:text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-amber-400' : ''}`} />
                <span className="truncate">{item.name}</span>
                {item.highlight && (
                  <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                    DEMO
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Status footer */}
        <div className="p-3 border-t border-slate-700/60 bg-[#1e2e40] text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Backend Connected</span>
            </span>
            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">v1.0.0</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            Smarter Emergency Response.
          </div>
        </div>
      </aside>
    </>
  );
};
