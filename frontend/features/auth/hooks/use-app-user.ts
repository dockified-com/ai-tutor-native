"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";

export type AppUser = {
  clerk_user_id: string;
  email: string;
  display_name: string | null;
  role: "creator" | "student";
};

export function useAppUser() {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn } = useUser();
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!authLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const me = await apiFetch<AppUser>("/api/me", { token });
        if (!cancelled) setUser(me);
      } catch (err) {
        if (!cancelled) setError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, isSignedIn, getToken]);

  return {
    user,
    error,
    loading: authLoaded && isSignedIn && user === null && error === null,
  };
}
