import React from 'react';
import { useTutorStore } from '../stores/tutor-store';

interface TutorLayoutProps {
  leftSlot: React.ReactNode;
  rightSlot: React.ReactNode;
  drawerSlot?: React.ReactNode;
  navSlot: React.ReactNode;
}

export function TutorLayout({ leftSlot, rightSlot, drawerSlot, navSlot }: TutorLayoutProps) {
  const activeSidebar = useTutorStore((state) => state.activeSidebar);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* Left Pane (Feed) */}
      <div className="w-[450px] shrink-0 flex flex-col overflow-hidden border-r border-slate-200 bg-white">
        {leftSlot}
      </div>

      {/* Right Pane (Workspace) */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-50">
        {rightSlot}
      </div>

      {/* Drawer (Conditional) */}
      {activeSidebar && (
        <div className="w-[320px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white shadow-sm">
          {drawerSlot}
        </div>
      )}

      {/* Nav Rail */}
      <div className="w-14 shrink-0 flex flex-col items-center py-4 gap-3 border-l border-slate-200 bg-white">
        {navSlot}
      </div>
    </div>
  );
}
