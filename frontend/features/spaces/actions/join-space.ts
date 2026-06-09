"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch, ApiError } from "@/shared/api/client";
import type { Space } from "../types";

export async function joinSpace(
  code: string,
): Promise<{ space: Space } | { error: string }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return { error: "Unauthorized" };
  try {
    const result = await apiFetch<{ space: Space }>("/api/spaces/join", {
      method: "POST",
      token,
      body: JSON.stringify({ code }),
    });
    return result;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return { error: "Invalid code or space not found." };
    }
    throw e;
  }
}