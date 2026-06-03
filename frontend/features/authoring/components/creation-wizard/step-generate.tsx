"use client";

import { useState } from "react";
import { GenerationStatus } from "../generation-status";
import { useGenerationStatus } from "../../hooks/use-generation-status";
import { useWizardStore } from "../../stores/wizard-store";
import { createCourse } from "../../actions/create-course";

export function StepGenerate() {
  const [isTriggering, setIsTriggering] = useState(false);
  const [mode, setMode] = useState<"trigger" | "status">("trigger");
  
  const { courseId, setCourseId, resetWizard } = useWizardStore();
  const { data: statusData, isError } = useGenerationStatus(mode === "status" ? courseId : null);

  const handleGenerate = async () => {
    setIsTriggering(true);
    try {
      // Stub: in a real app, we'd pass gathered wizard data here
      const result = await createCourse({});
      setCourseId(result.courseId);
      setMode("status");
    } catch (error) {
      console.error("Failed to generate course:", error);
      // Handle trigger error
    } finally {
      setIsTriggering(false);
    }
  };

  const hasFailed = statusData?.status === "failed" || isError;

  if (mode === "status") {
    if (hasFailed) {
      return (
        <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200">
          <h3 className="text-xl font-semibold text-red-800 mb-2">Generation Failed</h3>
          <p className="text-red-700 mb-6">
            {statusData?.error || "An unexpected error occurred while generating the course."}
          </p>
          <button
            onClick={() => {
              setMode("trigger");
              resetWizard();
            }}
            className="px-6 py-2.5 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return (
      <GenerationStatus
        currentPhase={statusData?.currentPhase || "extracting_pdf"}
        totalLessons={statusData?.totalLessons || 5}
      />
    );
  }

  return (
    <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200">
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Ready to Generate</h3>
      <p className="text-slate-600 mb-8">
        Your course is fully configured. Click below to start the AI generation pipeline.
      </p>
      <button
        onClick={handleGenerate}
        disabled={isTriggering}
        className="px-8 py-3 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isTriggering ? "Starting..." : "Generate Course"}
      </button>
    </div>
  );
}
