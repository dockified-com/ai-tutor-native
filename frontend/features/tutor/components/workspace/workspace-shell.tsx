import React, { useEffect, useState } from 'react';
import { useTutorStore } from '../../stores/tutor-store';
import { deriveRightPane } from '../../lib/derive-right-pane';
import { EmptyWorkspace } from './empty-workspace';
import { MermaidWorkspace } from './mermaid-workspace';
import { Block, MermaidBlock } from '@/shared/types/blocks';

export function WorkspaceShell() {
  const activeBlockId = useTutorStore((state) => state.activeBlockId);
  const blocks = useTutorStore((state) => state.blocks);
  
  // Track the sticky block that should be shown in the workspace
  const [stickyBlock, setStickyBlock] = useState<Block | null>(null);

  useEffect(() => {
    if (!activeBlockId) return;
    
    const block = blocks.find(b => b.id === activeBlockId) || null;
    if (!block) return;

    const paneType = deriveRightPane(block);
    
    // Only update sticky block if it's a workspace-modifying block
    if (paneType === 'monaco' || paneType === 'mermaid') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStickyBlock(block);
    }
  }, [activeBlockId, blocks]);

  if (!stickyBlock) {
    return <EmptyWorkspace />;
  }

  const paneType = deriveRightPane(stickyBlock);

  if (paneType === 'mermaid') {
    return <MermaidWorkspace block={stickyBlock as MermaidBlock} />;
  }

  if (paneType === 'monaco') {
    return <EmptyWorkspace label="Code editor — coming in Phase 4" />;
  }

  return <EmptyWorkspace />;
}
