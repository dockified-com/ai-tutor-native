import { create } from "zustand";

interface WizardState {
  step: number;
  courseId: string | null;
  setStep: (step: number) => void;
  setCourseId: (id: string | null) => void;
  resetWizard: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  step: 1,
  courseId: null,
  setStep: (step) => set({ step }),
  setCourseId: (id) => set({ courseId: id }),
  resetWizard: () => set({ step: 1, courseId: null }),
}));
