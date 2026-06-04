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

import { AudioControls } from '@/features/tutor/components/audio-controls';
import { useTTSAudio } from '@/features/tutor/hooks/use-tts-audio';

function getBlockTextForTTS(block: Block): string {
  switch (block.type) {
    case 'markdown': return block.content.text;
    case 'mermaid': return "Take a look at this diagram.";
    case 'concept_check': return block.content.question;
    case 'code': return block.content.instruction || "Let's practice with some code.";
    case 'understanding_check': return block.content.prompt;
    default: return "";
  }
}

export function TutorPageClient({ blocks, startIndex, onMarkComplete, onUpdateBookmark }: TutorPageClientProps) {
  const resetLesson = useTutorStore((state) => state.resetLesson);
  const activeSidebar = useTutorStore((state) => state.activeSidebar);
  const activeBlockId = useTutorStore((state) => state.activeBlockId);
  const [isInitialized, setIsInitialized] = useState(false);

  const { playTTS } = useTTSAudio();
  const lastPlayedBlockIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      resetLesson(blocks, startIndex);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInitialized(true);
    }
  }, [blocks, startIndex, resetLesson, isInitialized]);

  useEffect(() => {
    if (isInitialized && activeBlockId && activeBlockId !== lastPlayedBlockIdRef.current) {
      lastPlayedBlockIdRef.current = activeBlockId;
      const block = blocks.find(b => b.id === activeBlockId);
      if (block) {
        const text = getBlockTextForTTS(block);
        if (text) {
          playTTS(text).catch(err => console.warn("Autoplay prevented or error:", err));
        }
      }
    }
  }, [activeBlockId, blocks, isInitialized, playTTS]);

  if (!isInitialized) {
    return null; // Or a skeleton
  }

  return (
    <TutorLayout
      leftSlot={
        <div className="flex flex-col h-full overflow-hidden relative">
          <div className="shrink-0 flex justify-end px-4 py-2 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-10">
             <AudioControls />
          </div>
          <LessonFeed />
          <div className="shrink-0 border-t border-slate-100 bg-white z-10">
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
