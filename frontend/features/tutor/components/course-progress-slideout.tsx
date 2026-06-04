import React from 'react';
import { useTutorStore } from '../stores/tutor-store';
import { X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function CourseProgressSlideout() {
  const setActiveSidebar = useTutorStore((state) => state.setActiveSidebar);
  const blocks = useTutorStore((state) => state.blocks);
  const revealedIndex = useTutorStore((state) => state.revealedIndex);

  // Static placeholder value in Phase 3
  const progressValue = blocks.length > 0 ? Math.round((revealedIndex / blocks.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full animate-slide-left">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800 text-lg">Course Progress</h2>
        <button 
          onClick={() => setActiveSidebar(null)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 border-b border-slate-200">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600 font-medium">Overall Completion</span>
          <span className="text-slate-800 font-semibold">{progressValue}%</span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Curriculum</h3>
        
        <div className="flex flex-col gap-3">
          {/* Static curriculum tree placeholder for Phase 3 */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <div className="text-sm font-medium text-slate-800">Current Lesson</div>
          </div>
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-6 h-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <div className="text-sm font-medium text-slate-600">Next Lesson</div>
          </div>
        </div>
      </div>
    </div>
  );
}
