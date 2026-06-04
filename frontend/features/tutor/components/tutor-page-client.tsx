'use client';

import React, { useEffect, useState } from 'react';
import { useTutorStore } from '@/features/tutor/stores/tutor-store';
import { TutorLayout } from '@/features/tutor/components/tutor-layout';
import { LessonFeed } from '@/features/tutor/components/lesson-feed';
import { ContinueButton } from '@/features/tutor/components/continue-button';
import { AskFooter } from '@/features/tutor/components/ask-footer';
import { WorkspaceShell } from '@/features/tutor/components/workspace/workspace-shell';
import { NavRail } from '@/features/tutor/components/nav-rail';
import { CourseProgressSlideout } from '@/features/tutor/components/course-progress-slideout';
import { NotesSlideout } from '@/features/tutor/components/notes-slideout';
import { Block } from '@/shared/types/blocks';

interface TutorPageClientProps {
  blocks: Block[];
  startIndex: number;
  onMarkComplete: (blockId: string) => Promise<void>;
  onUpdateBookmark: (blockId: string) => Promise<void>;
}

export function TutorPageClient({ blocks, startIndex, onMarkComplete, onUpdateBookmark }: TutorPageClientProps) {
  const resetLesson = useTutorStore((state) => state.resetLesson);
  const activeSidebar = useTutorStore((state) => state.activeSidebar);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      resetLesson(blocks, startIndex);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInitialized(true);
    }
  }, [blocks, startIndex, resetLesson, isInitialized]);

  if (!isInitialized) {
    return null; // Or a skeleton
  }

  return (
    <TutorLayout
      leftSlot={
        <div className="flex flex-col h-full overflow-hidden relative">
          <LessonFeed />
          <div className="shrink-0 border-t border-slate-100 bg-white">
            <ContinueButton onMarkComplete={onMarkComplete} onUpdateBookmark={onUpdateBookmark} />
          </div>
          <AskFooter />
        </div>
      }
      rightSlot={<WorkspaceShell />}
      drawerSlot={
        activeSidebar === 'progress' ? <CourseProgressSlideout /> :
        activeSidebar === 'notes' ? <NotesSlideout /> : null
      }
      navSlot={<NavRail />}
    />
  );
}
