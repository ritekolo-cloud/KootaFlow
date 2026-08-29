import React from 'react';
import { cn } from '../../utils/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center items-center p-4", className)}>
      <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-[#0B1F3A] animate-spin" />
    </div>
  );
}
