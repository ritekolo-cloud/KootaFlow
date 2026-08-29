import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div
        className={`animate-spin rounded-full border-[#0B1F3A] border-t-transparent ${sizeMap[size]}`}
      />
      {message && <p className="mt-3 text-xs font-medium text-slate-500">{message}</p>}
    </div>
  );
};
