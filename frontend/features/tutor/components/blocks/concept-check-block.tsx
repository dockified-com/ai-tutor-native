import React from 'react';
import { ConceptCheckBlock as ConceptCheckBlockType } from '@/shared/types/blocks';
import { useTutorStore } from '../../stores/tutor-store';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/shared/api/client';

interface ConceptCheckBlockProps {
  block: ConceptCheckBlockType;
  index: number;
}

export function ConceptCheckBlock({ block, index }: ConceptCheckBlockProps) {
  const activeBlockId = useTutorStore((state) => state.activeBlockId);
  const revealedIndex = useTutorStore((state) => state.revealedIndex);
  const conceptAnswers = useTutorStore((state) => state.conceptAnswers);
  const setConceptAnswer = useTutorStore((state) => state.setConceptAnswer);

  const isActive = activeBlockId === block.id;
  const isPast = index < revealedIndex && !isActive;
  const selectedAnswerId = conceptAnswers[block.id];
  const hasAnswered = !!selectedAnswerId;

  const handleSelect = async (optionId: string) => {
    if (hasAnswered) return;
    setConceptAnswer(block.id, optionId);

    try {
      // Fire and forget
      await apiFetch(`/api/blocks/${block.id}/concept-check`, {
        method: 'POST',
        body: JSON.stringify({ selected_answer: optionId }),
      });
    } catch (err) {
      console.error('Failed to record concept check answer:', err);
    }
  };

  const selectedOption = block.content.options.find(o => o.id === selectedAnswerId);

  return (
    <div
      className={cn(
        "py-3 px-0 transition-opacity",
        isActive ? "border-l-2 border-emerald-400 pl-4" : "border-l-2 border-transparent pl-4",
        isPast ? "opacity-60" : ""
      )}
    >
      <div className="font-serif font-medium text-slate-800 mb-3">
        {block.content.question}
      </div>

      <div className="flex flex-col gap-2">
        {block.content.options.map((option) => {
          const isSelected = selectedAnswerId === option.id;
          let buttonClass = "bg-white border border-slate-300 rounded-lg px-4 py-2 hover:border-emerald-500 hover:text-emerald-700 text-left transition-colors";
          
          if (hasAnswered) {
            if (isSelected) {
              buttonClass = option.is_correct
                ? "bg-emerald-50 border-emerald-500 text-emerald-800 rounded-lg px-4 py-2 text-left"
                : "bg-red-50 border-red-300 text-red-800 rounded-lg px-4 py-2 text-left";
            } else {
              buttonClass = "bg-white border border-slate-300 rounded-lg px-4 py-2 text-left opacity-50 cursor-not-allowed";
            }
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={hasAnswered}
              className={buttonClass}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {hasAnswered && selectedOption && (
        <div className="font-serif italic text-slate-600 text-sm mt-3">
          {selectedOption.explanation}
        </div>
      )}
    </div>
  );
}
