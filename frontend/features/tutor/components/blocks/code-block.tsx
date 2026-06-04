import React from 'react';
import { Code2 } from 'lucide-react';
import { CodeBlock as CodeBlockType } from '@/shared/types/blocks';
import { useTutorStore } from '../../stores/tutor-store';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface CodeBlockProps {
  block: CodeBlockType;
  index: number;
}

export function CodeBlock({ block, index }: CodeBlockProps) {
  const activeBlockId = useTutorStore((state) => state.activeBlockId);
  const revealedIndex = useTutorStore((state) => state.revealedIndex);
  const setActiveBlock = useTutorStore((state) => state.setActiveBlock);
  const hints = useTutorStore((state) => state.hints);
  
  const isActive = activeBlockId === block.id;
  const isPast = index < revealedIndex && !isActive;

  return (
    <div
      className={cn(
        "py-3 px-0 transition-opacity cursor-pointer group",
        isActive ? "border-l-2 border-emerald-400 pl-4" : "border-l-2 border-transparent pl-4 hover:border-emerald-200",
        isPast ? "opacity-60" : ""
      )}
      onClick={() => setActiveBlock(block.id)}
    >
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
        <Code2 size={16} />
        <span>Code Exercise</span>
      </div>
      <div className="font-serif leading-relaxed text-[15px] text-slate-800">
        {block.content.instruction ? (
          <ReactMarkdown
            components={{
              a: (props) => <a className="text-emerald-600 underline underline-offset-2" {...props} />,
              code: (props) => {
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
            {block.content.instruction}
          </ReactMarkdown>
        ) : (
          <p>Solve the code exercise in the workspace.</p>
        )}
      </div>

      {hints && hints[block.id] && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm font-serif text-blue-900 shadow-sm animate-fade-in-up">
          <div className="font-sans font-semibold text-xs text-blue-700 uppercase mb-1">Teacher's Hint</div>
          {hints[block.id]}
        </div>
      )}
    </div>
  );
}
