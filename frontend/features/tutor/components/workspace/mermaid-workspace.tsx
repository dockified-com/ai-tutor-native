import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { MermaidBlock } from '@/shared/types/blocks';

interface MermaidWorkspaceProps {
  block: MermaidBlock;
}

export function MermaidWorkspace({ block }: MermaidWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false });
    let isMounted = true;

    async function renderDiagram() {
      if (!containerRef.current) return;
      try {
        setHasError(false);
        const { svg } = await mermaid.render(`workspace-mermaid-${block.id}`, block.content.code);
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (isMounted) {
          setHasError(true);
          console.error(`Mermaid render error for workspace block ${block.id}:`, err);
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [block.id, block.content.code]);

  if (hasError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="text-slate-500 italic p-6 border border-slate-200 rounded-lg bg-slate-50">
          Diagram could not be rendered
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden p-8">
      <div className="flex-1 overflow-auto flex items-center justify-center">
        <div ref={containerRef} className="w-full max-w-4xl" />
      </div>
    </div>
  );
}
