"use client";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";
import type { NodeLesson } from "../types";

export function useNode(lessonId: string) {
  const { getToken, isLoaded } = useAuth();
  const { data, error, mutate } = useSWR<NodeLesson>(
    isLoaded ? `/api/builder/${lessonId}` : null,
    async () => {
      const token = await getToken();
      return apiFetch<NodeLesson>(`/api/builder/${lessonId}`, { token });
    },
  );
  return { node: data ?? null, loading: !data && !error, mutate };
}