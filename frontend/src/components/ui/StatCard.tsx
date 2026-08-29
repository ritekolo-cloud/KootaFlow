import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accent?: 'navy' | 'emerald' | 'amber' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = 'slate',
  onClick,
}) => {
  const accentBorder = {
    navy: 'border-l-4 border-l-[#0B1F3A]',
    emerald: 'border-l-4 border-l-[#10B981]',
    amber: 'border-l-4 border-l-amber-500',
    slate: 'border-l-4 border-l-slate-400',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col justify-between ${
        accentBorder[accent]
      } ${onClick ? 'cursor-pointer hover:border-slate-300 transition-colors' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold text-[#0B1F3A] mt-1 tracking-tight">{value}</p>
        </div>
        {icon && (
          <div className="p-2 rounded-md bg-slate-50 text-[#0B1F3A] border border-slate-100">
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
