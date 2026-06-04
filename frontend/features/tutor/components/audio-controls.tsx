"use client";

import { AudioLines, ChevronDown } from 'lucide-react';
import { useTutorStore } from '../stores/tutor-store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/cn';

export function AudioControls() {
  const audio = useTutorStore(state => state.audio);
  const setAudioSpeed = useTutorStore(state => state.setAudioSpeed);
  const toggleAutoContinue = useTutorStore(state => state.toggleAutoContinue);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5] as const;

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 pointer-events-none">
        <AudioLines size={16} className={cn(audio.playing && "text-emerald-500 animate-pulse")} />
      </Button>

      <Popover>
        <PopoverTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-slate-100 hover:text-slate-900 h-8 w-8 text-slate-400">
          <ChevronDown size={14} />
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Auto-Continue</span>
              <Switch checked={audio.autoContinue} onCheckedChange={toggleAutoContinue} />
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Speed</span>
              <div className="flex gap-1">
                {speeds.map(s => (
                  <button
                    key={s}
                    onClick={() => setAudioSpeed(s)}
                    className={cn(
                      "flex-1 rounded py-1 text-[10px] font-medium transition-colors",
                      audio.speed === s ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
