import { Block } from '@/shared/types/blocks';

export type RightPane = 'monaco' | 'mermaid' | 'empty';

export function deriveRightPane(block: Block | null): RightPane {
  if (!block) return 'empty';
  
  switch (block.type) {
    case 'code':
      return 'monaco';
    case 'mermaid':
      return 'mermaid';
    default:
      return 'empty'; // markdown, concept_check, understanding_check -> no change (but here we just return empty, the shell component handles the "sticky" logic or this function does?)
  }
}
