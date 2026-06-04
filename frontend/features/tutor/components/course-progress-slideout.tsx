import React from 'react';
import { useTutorStore } from '../stores/tutor-store';
import { X, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/shared/lib/cn';

export function CourseProgressSlideout() {
  const setActiveSidebar = useTutorStore((state) => state.setActiveSidebar);
  const blocks = useTutorStore((state) => state.blocks);
  const revealedIndex = useTutorStore((state) => state.revealedIndex);

  const progressValue = blocks.length > 0 ? Math.round(((revealedIndex + 1) / blocks.length) * 100) : 0;

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
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Lesson Blocks</h3>
        
        <div className="flex flex-col gap-3">
          {blocks.map((block, idx) => {
            const isCompleted = idx <= revealedIndex;
            const isCurrent = idx === revealedIndex;
            
            return (
              <div key={block.id} className={cn("flex items-center gap-3", !isCompleted && !isCurrent && "opacity-50")}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isCompleted && !isCurrent ? "bg-emerald-500 text-white" :
                  isCurrent ? "bg-emerald-100 text-emerald-600" :
                  "border border-slate-300 text-slate-400"
                )}>
                  {isCompleted && !isCurrent ? <Check size={12} strokeWidth={3} /> : idx + 1}
                </div>
                <div className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-emerald-700" :
                  isCompleted ? "text-slate-800" : "text-slate-600"
                )}>
                  {block.type === 'code' ? 'Code Exercise' : 
                   block.type === 'concept_check' ? 'Concept Check' : 
                   block.type === 'understanding_check' ? 'Understanding Check' :
                   block.type === 'mermaid' ? 'Diagram' : 'Explanation'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
