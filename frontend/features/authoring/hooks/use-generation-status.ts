"use client";

import useSWR from "swr";
import { apiClient } from "@/shared/api/client";

export interface GenerationStatusResponse {
  courseId: string;
  status: "draft" | "generating" | "ready" | "failed";
  currentPhase: string;
  totalLessons: number;
  error?: string;
}

const fetcher = (url: string) => apiClient<GenerationStatusResponse>(url);

export function useGenerationStatus(courseId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    courseId ? `/api/courses/${courseId}/status` : null,
    fetcher,
    {
      refreshInterval: (data) =>
        data?.status === "generating" ? 3000 : 0,
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    isLoading,
    isError: !!error,
    mutate,
  };
}
