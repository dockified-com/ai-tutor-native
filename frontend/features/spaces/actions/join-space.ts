"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { Space } from "../types";

export async function joinSpace(code: string): Promise<{ space: Space }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  return apiFetch<{ space: Space }>("/api/spaces/join", {
    method: "POST",
    token,
    body: JSON.stringify({ code }),
  });
}