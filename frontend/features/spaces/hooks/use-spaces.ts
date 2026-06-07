"use client";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";
import type { Space } from "../types";

function useSpaceList(path: string) {
  const { getToken, isLoaded } = useAuth();
  const { data, error, mutate } = useSWR<Space[]>(
    isLoaded ? path : null,
    async () => {
      const token = await getToken();
      return apiFetch<Space[]>(path, { token });
    },
  );
  return {
    spaces: data ?? [],
    loading: !data && !error,
    mutate,
  };
}

export function useSpaces() {
  const owned = useSpaceList("/api/spaces/owned");
  const joined = useSpaceList("/api/spaces/joined");
  return { owned, joined };
}