import { create } from 'zustand';
import { Block } from '@/shared/types/blocks';

export interface TerminalOutput {
  status?: 'running' | 'done';
  verdict?: 'passed' | 'failed' | 'runtime_error' | 'compile_error' | 'error';
  text: string;
}

export interface RoastState {
  status: 'loading' | 'done';
  text: string;
}

export interface TutorState {
  // Core lesson state
  blocks: Block[];
  revealedIndex: number;        // index of last revealed block in blocks[]
  activeBlockId: string | null; // drives left pane highlight + right pane

  // Sidebar
  activeSidebar: 'progress' | 'notes' | null;

  // Audio (Phase 6 — stub here)
  audio: {
    url: string | null;
    playing: boolean;
    speed: 0.5 | 0.75 | 1.0 | 1.25 | 1.5;
    autoContinue: boolean;
    volume: number; // 0.0–1.0
  };

  // Block interaction state — Phase 3 scope
  conceptAnswers: Record<string, string>;       // blockId → selected option string

  // Block interaction state — Phase 4 stubs (typed, never written in Phase 3)
  codeValues: Record<string, string>;
  terminalOutputs: Record<string, TerminalOutput | null>;
  codeAttempts: Record<string, number>;
  hints: Record<string, string | null>;
  roasts: Record<string, RoastState | null>;

  // Block interaction state — Phase 5 stubs
  chatHistory: Array<{ role: 'user' | 'ai'; text: string }>;
  askInput: string;
  understandingResponse: Record<string, string>;
  understandingFeedback: Record<string, string>;
  understandingPassed: Record<string, boolean>;
  understandingAttempts: Record<string, number>;

  // Audio Actions
  setAudioPlaying: (playing: boolean) => void;
  setAudioSpeed: (speed: 0.5 | 0.75 | 1.0 | 1.25 | 1.5) => void;
  toggleAutoContinue: () => void;

  // Actions
  revealNext: () => void;
  setActiveBlock: (id: string) => void;
  setActiveSidebar: (val: 'progress' | 'notes' | null) => void;
  resetLesson: (blocks: Block[], startIndex: number) => void;
  setConceptAnswer: (blockId: string, answer: string) => void;
  
  // Phase 4 Actions
  setCodeValue: (blockId: string, value: string) => void;
  setTerminalOutput: (blockId: string, output: TerminalOutput | null) => void;
  incrementCodeAttempt: (blockId: string) => void;
  setHint: (blockId: string, hint: string | null) => void;
  setRoast: (blockId: string, roast: RoastState | null) => void;
  // Phase 5 Actions
  setAskInput: (input: string) => void;
  appendChatHistory: (message: { role: 'user' | 'ai'; text: string }) => void;
  updateLastChat: (text: string) => void;
  setUnderstandingResponse: (blockId: string, response: string) => void;
  setUnderstandingFeedback: (blockId: string, feedback: string) => void;
  setUnderstandingPassed: (blockId: string, passed: boolean) => void;
  incrementUnderstandingAttempt: (blockId: string) => void;
}

export const useTutorStore = create<TutorState>()((set) => ({
  blocks: [],
  revealedIndex: 0,
  activeBlockId: null,

  activeSidebar: null,

  audio: {
    url: null,
    playing: false,
    speed: 1.0,
    autoContinue: false,
    volume: 1.0,
  },

  conceptAnswers: {},

  codeValues: {},
  terminalOutputs: {},
  codeAttempts: {},
  hints: {},
  roasts: {},

  chatHistory: [],
  askInput: '',
  understandingResponse: {},
  understandingFeedback: {},
  understandingPassed: {},
  understandingAttempts: {},

  setAudioPlaying: (playing) =>
    set((state) => ({ audio: { ...state.audio, playing } })),
  setAudioSpeed: (speed) =>
    set((state) => ({ audio: { ...state.audio, speed } })),
  toggleAutoContinue: () =>
    set((state) => ({ audio: { ...state.audio, autoContinue: !state.audio.autoContinue } })),

  revealNext: () =>
    set((state) => {
      const nextIndex = state.revealedIndex + 1;
      if (nextIndex < state.blocks.length) {
        return {
          revealedIndex: nextIndex,
          activeBlockId: state.blocks[nextIndex].id,
        };
      }
      return state;
    }),

  setActiveBlock: (id) => set({ activeBlockId: id }),

  setActiveSidebar: (val) =>
    set((state) => ({
      activeSidebar: state.activeSidebar === val ? null : val,
    })),

  resetLesson: (blocks, startIndex) =>
    set({
      blocks,
      revealedIndex: startIndex,
      activeBlockId: blocks.length > 0 && startIndex < blocks.length ? blocks[startIndex].id : null,
      conceptAnswers: {},
      codeValues: {},
      terminalOutputs: {},
      codeAttempts: {},
      hints: {},
      roasts: {},
      chatHistory: [],
      askInput: '',
      understandingResponse: {},
      understandingFeedback: {},
      understandingPassed: {},
      understandingAttempts: {},
    }),

  setConceptAnswer: (blockId, answer) =>
    set((state) => ({
      conceptAnswers: {
        ...state.conceptAnswers,
        [blockId]: answer,
      },
    })),

  setCodeValue: (blockId, value) =>
    set((state) => ({
      codeValues: { ...state.codeValues, [blockId]: value },
    })),
    
  setTerminalOutput: (blockId, output) =>
    set((state) => ({
      terminalOutputs: { ...state.terminalOutputs, [blockId]: output },
    })),
    
  incrementCodeAttempt: (blockId) =>
    set((state) => ({
      codeAttempts: { 
        ...state.codeAttempts, 
        [blockId]: (state.codeAttempts[blockId] || 0) + 1 
      },
    })),
    
  setHint: (blockId, hint) =>
    set((state) => ({
      hints: { ...state.hints, [blockId]: hint },
    })),
    
  setRoast: (blockId, roast) =>
    set((state) => ({
      roasts: { ...state.roasts, [blockId]: roast },
    })),

  setAskInput: (input) => set({ askInput: input }),

  appendChatHistory: (message) =>
    set((state) => ({ chatHistory: [...state.chatHistory, message] })),

  updateLastChat: (text) =>
    set((state) => {
      const chatHistory = [...state.chatHistory];
      if (chatHistory.length > 0) {
        chatHistory[chatHistory.length - 1].text += text;
      }
      return { chatHistory };
    }),

  setUnderstandingResponse: (blockId, response) =>
    set((state) => ({
      understandingResponse: { ...state.understandingResponse, [blockId]: response },
    })),

  setUnderstandingFeedback: (blockId, feedback) =>
    set((state) => ({
      understandingFeedback: { ...state.understandingFeedback, [blockId]: feedback },
    })),

  setUnderstandingPassed: (blockId, passed) =>
    set((state) => ({
      understandingPassed: { ...state.understandingPassed, [blockId]: passed },
    })),

  incrementUnderstandingAttempt: (blockId) =>
    set((state) => ({
      understandingAttempts: {
        ...state.understandingAttempts,
        [blockId]: (state.understandingAttempts[blockId] || 0) + 1,
      },
    })),
}));
