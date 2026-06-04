import React from 'react';
import { useTutorStore } from '../stores/tutor-store';
import { PieChart, FileText, Globe, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavRail() {
  const activeSidebar = useTutorStore((state) => state.activeSidebar);
  const setActiveSidebar = useTutorStore((state) => state.setActiveSidebar);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <button 
        onClick={() => setActiveSidebar('progress')}
        className={cn(
          "p-2 rounded-xl transition-colors",
          activeSidebar === 'progress' 
            ? "bg-emerald-100 text-emerald-600" 
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        )}
      >
        <PieChart size={24} strokeWidth={2} />
      </button>

      <button 
        onClick={() => setActiveSidebar('notes')}
        className={cn(
          "p-2 rounded-xl transition-colors",
          activeSidebar === 'notes' 
            ? "bg-emerald-100 text-emerald-600" 
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        )}
      >
        <FileText size={24} strokeWidth={2} />
      </button>

      <div className="h-px w-8 bg-slate-200 my-2" />

      <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
        <Globe size={24} strokeWidth={2} />
      </button>

      <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mt-auto">
        <Settings size={24} strokeWidth={2} />
      </button>
    </div>
  );
}
