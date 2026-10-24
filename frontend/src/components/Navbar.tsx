import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, PlusCircle, Map, Zap, PlayCircle, Clock } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onCreateEmergencyClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onCreateEmergencyClick }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = React.useState<string>(new Date().toLocaleTimeString());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E0E6EA] h-16 flex items-center justify-between px-4 lg:px-6 shadow-xs">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Local Time: <span className="font-mono font-medium text-slate-700">{currentTime}</span></span>
        </div>
        <div className="hidden md:flex items-center text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
          Dispatcher Active
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onCreateEmergencyClick}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#367F79] hover:bg-[#2c6964] text-white shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create Emergency</span>
          <span className="sm:hidden">New</span>
        </button>

        <button
          onClick={() => navigate('/map')}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#DCE8F5] text-[#1E4570] hover:bg-[#c9ddf0] border border-[#bcd3ec] transition-colors cursor-pointer"
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Live Map</span>
        </button>

        <button
          onClick={() => navigate('/dispatch')}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#DCEBE8] text-[#235450] hover:bg-[#cbe2de] border border-[#b4dbd4] transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Find Ambulance</span>
        </button>

        <button
          onClick={() => navigate('/simulation')}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#F6E8C8] text-[#7A540F] hover:bg-[#edd59a] border border-[#dfc37f] transition-colors cursor-pointer"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>Demo Sim</span>
        </button>
      </div>
    </header>
  );
};
