import React from 'react';
import { useTutorStore } from '../stores/tutor-store';
import { Block } from '@/shared/types/blocks';

function isContinueEnabled(activeBlock: Block, state: ReturnType<typeof useTutorStore.getState>): boolean {
  switch (activeBlock.type) {
    case 'markdown':       return true;
    case 'mermaid':        return true;
    case 'concept_check':  return !!state.conceptAnswers[activeBlock.id];
    case 'code':           return false; // Phase 4
    case 'understanding_check': return false; // Phase 5
    default:               return false;
  }
}

interface ContinueButtonProps {
  onMarkComplete: (blockId: string) => Promise<void>;
  onUpdateBookmark: (blockId: string) => Promise<void>;
}

export function ContinueButton({ onMarkComplete, onUpdateBookmark }: ContinueButtonProps) {
  const store = useTutorStore();
  const { blocks, revealedIndex, revealNext, activeBlockId } = store;

  if (blocks.length === 0) return null;

  // We only show continue button if we are looking at the currently revealed block (the "frontier")
  // If user jumped back in history, they have to click "Return to current" to continue,
  // or we just render it disabled? The spec says "Return to current pill appears...". Let's only render Continue if activeBlock === frontier block.
  // Wait, if they are at the frontier, activeBlockId === blocks[revealedIndex].id.
  const isAtFrontier = activeBlockId === blocks[revealedIndex]?.id;
  if (!isAtFrontier) return null;

  const activeBlock = blocks[revealedIndex];
  if (!activeBlock) return null;

  const enabled = isContinueEnabled(activeBlock, store);
  const isFinalBlock = revealedIndex === blocks.length - 1;
  const isUnderstandingCheck = activeBlock.type === 'understanding_check';

  const label = (isFinalBlock && isUnderstandingCheck) 
    ? "Next Lesson" // or "Course Complete" 
    : "Continue";

  const blocksRemaining = blocks.length - 1 - revealedIndex;

  const handleContinue = async () => {
    if (!enabled) return;
    
    const nextIndex = revealedIndex + 1;
    if (nextIndex < blocks.length) {
      const nextBlockId = blocks[nextIndex].id;
      revealNext();
      
      // Fire and forget
      onMarkComplete(activeBlock.id).catch(err => console.error(err));
      onUpdateBookmark(nextBlockId).catch(err => console.error(err));
    } else {
      // Final block continue - mark it complete
      onMarkComplete(activeBlock.id).catch(err => console.error(err));
    }
  };

  return (
    <div className="py-8 flex justify-center">
      <button
        onClick={handleContinue}
        disabled={!enabled || isFinalBlock} // Actually if it's final block, what does it do? We can just disable for now if we don't have routing yet.
        className={`rounded-full px-8 py-3 font-medium transition-colors flex items-center gap-3 ${
          enabled && !isFinalBlock 
            ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
            : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        <span>{label}</span>
        {blocksRemaining > 0 && (
          <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
            {blocksRemaining} remaining
          </span>
        )}
      </button>
    </div>
  );
}
