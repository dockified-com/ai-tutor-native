"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { Space } from "../types";

export async function createSpace(
  name: string,
  description: string | null,
): Promise<{ space: Space }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  return apiFetch<{ space: Space }>("/api/spaces", {
    method: "POST",
    token,
    body: JSON.stringify({ name, description }),
  });
}