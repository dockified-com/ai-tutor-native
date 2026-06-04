import { Block } from '@/shared/types/blocks';
import { useTutorStore } from '../stores/tutor-store';

export function useBlockGating(activeBlock: Block | null): boolean {
  const terminalOutputs = useTutorStore((state) => state.terminalOutputs);
  const conceptAnswers = useTutorStore((state) => state.conceptAnswers);
  const understandingPassed = useTutorStore((state) => state.understandingPassed);

  if (!activeBlock) return false;

  switch (activeBlock.type) {
    case 'markdown':
      return true;
    case 'mermaid':
      return true;
    case 'concept_check':
      return !!conceptAnswers[activeBlock.id];
    case 'code':
      return terminalOutputs[activeBlock.id]?.verdict === 'passed';
    case 'understanding_check':
      return !!understandingPassed[activeBlock.id];
    default:
      return false;
  }
}
