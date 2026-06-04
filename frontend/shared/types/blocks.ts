export interface BaseBlock {
  id: string;
  type: string;
  tts_audio_url?: string | null;
}

export interface MarkdownBlock extends BaseBlock {
  type: 'markdown';
  content: {
    text: string;
  };
}

export interface MermaidBlock extends BaseBlock {
  type: 'mermaid';
  content: {
    code: string;
  };
}

export interface ConceptCheckOption {
  id: string;
  text: string;
  is_correct: boolean;
  explanation: string;
}

export interface ConceptCheckBlock extends BaseBlock {
  type: 'concept_check';
  content: {
    question: string;
    options: ConceptCheckOption[];
  };
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  content: {
    starter_code: string;
  };
}

export interface UnderstandingCheckBlock extends BaseBlock {
  type: 'understanding_check';
  content: {
    prompt: string;
  };
}

export type Block =
  | MarkdownBlock
  | MermaidBlock
  | ConceptCheckBlock
  | CodeBlock
  | UnderstandingCheckBlock;
