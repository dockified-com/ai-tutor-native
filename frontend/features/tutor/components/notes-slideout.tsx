import React from 'react';
import { useTutorStore } from '../stores/tutor-store';
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function NotesSlideout() {
  const setActiveSidebar = useTutorStore((state) => state.setActiveSidebar);

  return (
    <div className="flex flex-col h-full animate-slide-left">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-800 text-lg">Notes</h2>
        <button 
          onClick={() => setActiveSidebar(null)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <Tabs defaultValue="instructor" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="instructor">Instructor</TabsTrigger>
            <TabsTrigger value="my-notes">My Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="instructor" className="flex-1 overflow-y-auto outline-none">
            <div className="text-sm text-slate-600 font-serif leading-relaxed">
              <p className="mb-3 font-medium text-slate-800">Instructor Notes (Placeholder)</p>
              <p>These are the core takeaways from this lesson. Focus on understanding the mental model before worrying about the exact syntax.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="my-notes" className="flex-1 overflow-y-auto outline-none">
            <div className="text-sm text-slate-500 italic p-4 bg-slate-50 border border-slate-200 rounded-lg">
              Notes feature coming in V2. For now, you can jot down notes in a separate text editor.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
