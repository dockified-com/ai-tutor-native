"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { TutorBlock } from "@/features/spaces/types";

export async function updateBlock(blockId: string, content: Record<string, unknown>): Promise<TutorBlock> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  return apiFetch<TutorBlock>(`/api/builder/blocks/${blockId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ content }),
  });
}