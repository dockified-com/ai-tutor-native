"use client";

import { CheckCircle2, Loader2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface GenerationStatusProps {
  currentPhase: string;
  totalLessons: number;
}

const PHASES = [
  "extracting_pdf",
  "embedding",
  "generating_outline",
  "generating_lesson_N",
  "generating_audio",
  "ready",
];

function getPhaseIndex(phase: string) {
  if (phase.startsWith("generating_lesson_")) return 3;
  const idx = PHASES.indexOf(phase);
  return idx !== -1 ? idx : 0;
}

function getPhaseLabel(phaseKey: string, currentPhase: string, totalLessons: number) {
  if (phaseKey === "extracting_pdf") return "Extracting content from PDF...";
  if (phaseKey === "embedding") return "Generating semantic embeddings...";
  if (phaseKey === "generating_outline") return "Creating course outline...";
  if (phaseKey === "generating_lesson_N") {
    let currentLesson = 1;
    if (currentPhase.startsWith("generating_lesson_")) {
      const match = currentPhase.match(/generating_lesson_(\d+)/);
      if (match) currentLesson = parseInt(match[1], 10);
    }
    return `Generating lesson ${Math.min(currentLesson, totalLessons)} of ${totalLessons}...`;
  }
  if (phaseKey === "generating_audio") return "Synthesizing audio...";
  if (phaseKey === "ready") return "Course is ready";
  return phaseKey;
}

export function GenerationStatus({ currentPhase, totalLessons }: GenerationStatusProps) {
  const params = useParams();
  const courseId = params?.id as string;
  const currentIndex = getPhaseIndex(currentPhase);

  if (currentPhase === "ready") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your course is ready!</h2>
        <p className="text-emerald-700 mb-6 text-center">
          We've successfully generated all lessons and audio for your course.
        </p>
        <Link
          href={`/courses/${courseId || "unknown"}`}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-emerald-700 transition-colors"
        >
          View Course
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const renderPhase = (phaseKey: string, index: number) => {
    if (phaseKey === "ready") return null; // Don't show "ready" in the list, since it has a full success state

    const isCompleted = index < currentIndex;
    const isActive = index === currentIndex;
    const isPending = index > currentIndex;

    const label = getPhaseLabel(phaseKey, currentPhase, totalLessons);

    return (
      <div
        key={phaseKey}
        className={`flex items-center gap-4 py-3 ${
          isActive ? "text-emerald-700 font-medium" : isCompleted ? "text-slate-800" : "text-slate-400"
        }`}
      >
        <div className="flex-shrink-0">
          {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {isActive && <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />}
          {isPending && <Circle className="w-5 h-5 text-slate-200" />}
        </div>
        <span className={isActive ? "animate-pulse" : ""}>{label}</span>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md w-full mx-auto">
      <h3 className="font-semibold text-slate-800 mb-4">Generating Course...</h3>
      <div className="flex flex-col">
        {PHASES.map((phaseKey, index) => renderPhase(phaseKey, index))}
      </div>
    </div>
  );
}
