import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  contextBadge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  contextBadge,
  actions,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-lg sm:text-xl font-bold text-[#0B1F3A] tracking-tight truncate">
            {title}
          </h1>
          {contextBadge}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
