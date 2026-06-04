import React, { useEffect, useRef } from 'react';
import { useTutorStore } from '../stores/tutor-store';
import { MarkdownBlock } from './blocks/markdown-block';
import { MermaidBlock } from './blocks/mermaid-block';
import { ConceptCheckBlock } from './blocks/concept-check-block';
import { CodeBlock } from './blocks/code-block';
import { MarkdownBlock as MarkdownBlockType, MermaidBlock as MermaidBlockType, ConceptCheckBlock as ConceptCheckBlockType, CodeBlock as CodeBlockType } from '@/shared/types/blocks';

export function LessonFeed() {
  const store = useTutorStore();
  const { blocks, revealedIndex, activeBlockId, setActiveBlock } = store;
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when a new block is revealed
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [revealedIndex]);

  if (blocks.length === 0) return null;

  const currentFrontierId = blocks[revealedIndex]?.id;
  const isLookingAtPast = activeBlockId !== currentFrontierId;

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto px-6 py-4 relative">
      {isLookingAtPast && (
        <div className="sticky top-2 right-2 flex justify-end z-10 mb-4 pointer-events-none">
          <button
            onClick={() => setActiveBlock(currentFrontierId)}
            className="bg-emerald-100 text-emerald-800 text-sm font-medium px-4 py-1.5 rounded-full shadow-sm pointer-events-auto hover:bg-emerald-200 transition-colors"
          >
            Return to current
          </button>
        </div>
      )}

      {blocks.slice(0, revealedIndex + 1).map((block, index) => {
        // Determine if this block is the newly revealed one
        const isNewest = index === revealedIndex;
        // The block components handle their own active/past opacity states, 
        // but the feed can optionally apply the fade-in-up animation wrapper.
        
        return (
          <div 
            key={block.id} 
            className={isNewest ? "animate-fade-in-up" : ""}
          >
            {block.type === 'markdown' && <MarkdownBlock block={block as MarkdownBlockType} index={index} />}
            {block.type === 'mermaid' && <MermaidBlock block={block as MermaidBlockType} index={index} />}
            {block.type === 'concept_check' && <ConceptCheckBlock block={block as ConceptCheckBlockType} index={index} />}
            {block.type === 'code' && <CodeBlock block={block as CodeBlockType} index={index} />}
            {block.type === 'understanding_check' && (
              <div className="text-slate-400 italic py-4 border-l-2 border-transparent pl-4">Understanding check — coming in Phase 5</div>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
