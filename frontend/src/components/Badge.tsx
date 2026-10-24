import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'critical' | 'warning' | 'info' | 'success' | 'neutral' | 'simulated';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'md' }) => {
  const getStyles = () => {
    switch (variant) {
      case 'critical':
        return 'bg-[#F5DAD8] text-[#872924] border border-[#f0c1be]';
      case 'warning':
        return 'bg-[#F6E8C8] text-[#7A540F] border border-[#edd59a]';
      case 'info':
        return 'bg-[#DCE8F5] text-[#1E4570] border border-[#bcd3ec]';
      case 'success':
        return 'bg-[#DCEBE8] text-[#235450] border border-[#b4dbd4]';
      case 'simulated':
        return 'bg-amber-50 text-amber-800 border border-amber-300 font-mono tracking-wider';
      default:
        return 'bg-slate-100 text-[#273444] border border-[#E0E6EA]';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${getStyles()}`}>
      {label}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  if (s === 'critical' || s === 'critical gap: zero available' || s === 'full') {
    return <Badge label={status} variant="critical" />;
  }
  if (s === 'high' || s === 'warning: low coverage' || s === 'warning: constrained coverage' || s === 'constrained' || s === 'en route' || s === 'busy') {
    return <Badge label={status} variant="warning" />;
  }
  if (s === 'available' || s === 'verified' || s === 'resolved' || s === 'adequate coverage') {
    return <Badge label={status} variant="success" />;
  }
  if (s === 'assigned' || s === 'reported') {
    return <Badge label={status} variant="info" />;
  }
  if (s === 'simulated data' || s === 'simulated gps') {
    return <Badge label={status} variant="simulated" />;
  }
  return <Badge label={status} variant="neutral" />;
};
