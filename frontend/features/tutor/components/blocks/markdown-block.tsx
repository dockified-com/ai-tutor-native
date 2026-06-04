import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MarkdownBlock as MarkdownBlockType } from '@/shared/types/blocks';
import { useTutorStore } from '../../stores/tutor-store';
import { cn } from '@/lib/utils';

interface MarkdownBlockProps {
  block: MarkdownBlockType;
  index: number;
}

export function MarkdownBlock({ block, index }: MarkdownBlockProps) {
  const activeBlockId = useTutorStore((state) => state.activeBlockId);
  const revealedIndex = useTutorStore((state) => state.revealedIndex);
  
  const isActive = activeBlockId === block.id;
  const isPast = index < revealedIndex && !isActive;

  return (
    <div
      className={cn(
        "py-3 px-0 transition-opacity",
        isActive ? "border-l-2 border-emerald-400 pl-4" : "border-l-2 border-transparent pl-4",
        isPast ? "opacity-60" : ""
      )}
    >
      <div className="font-serif leading-relaxed text-[15px] text-slate-800">
        <ReactMarkdown
          components={{
            a: (props) => <a className="text-emerald-600 underline underline-offset-2" {...props} />,
            code: (props) => {
              // The types for react-markdown components are a bit tricky, 
              // we can safely cast or just spread props.
              // We want to apply styles to inline code.
              const isInline = !String(props.children).includes('\n');
              return (
                <code
                  className={isInline ? "font-mono text-sm bg-slate-100 px-1 rounded" : "font-mono text-sm block bg-slate-100 p-2 rounded my-2 overflow-x-auto"}
                  {...props}
                />
              );
            }
          }}
        >
          {block.content.text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
