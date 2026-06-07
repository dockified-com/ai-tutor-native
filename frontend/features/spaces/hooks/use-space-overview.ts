"use client";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";
import type { SpaceOverview } from "../types";

export function useSpaceOverview(spaceId: string) {
  const { getToken, isLoaded } = useAuth();
  const { data, error, mutate } = useSWR<SpaceOverview>(
    isLoaded ? `/api/spaces/${spaceId}/overview` : null,
    async () => {
      const token = await getToken();
      return apiFetch<SpaceOverview>(`/api/spaces/${spaceId}/overview`, { token });
    },
  );
  return { overview: data ?? null, loading: !data && !error, mutate };
}