import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { MermaidBlock as MermaidBlockType } from '@/shared/types/blocks';
import { useTutorStore } from '../../stores/tutor-store';
import { cn } from '@/lib/utils';

interface MermaidBlockProps {
  block: MermaidBlockType;
  index: number;
}

export function MermaidBlock({ block, index }: MermaidBlockProps) {
  const activeBlockId = useTutorStore((state) => state.activeBlockId);
  const revealedIndex = useTutorStore((state) => state.revealedIndex);
  const setActiveBlock = useTutorStore((state) => state.setActiveBlock);
  
  const isActive = activeBlockId === block.id;
  const isPast = index < revealedIndex && !isActive;

  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false });
    let isMounted = true;

    async function renderDiagram() {
      if (!containerRef.current) return;
      try {
        setHasError(false);
        const { svg } = await mermaid.render(`mermaid-${block.id}`, block.content.code);
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (isMounted) {
          setHasError(true);
          console.error(`Mermaid render error for block ${block.id}:`, err);
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [block.id, block.content.code]);

  return (
    <div
      className={cn(
        "py-3 px-0 transition-opacity cursor-pointer",
        isActive ? "border-l-2 border-emerald-400 pl-4" : "border-l-2 border-transparent pl-4",
        isPast ? "opacity-60" : ""
      )}
      onClick={() => setActiveBlock(block.id)}
    >
      <div className="rounded-lg border border-slate-200 overflow-hidden p-4 bg-white">
        {hasError ? (
          <div className="text-slate-500 text-sm italic py-4 text-center">
            Diagram could not be rendered
          </div>
        ) : (
          <div ref={containerRef} className="flex justify-center" />
        )}
      </div>
    </div>
  );
}
