"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { TutorBlock } from "@/features/spaces/types";

export async function agentEdit(lessonId: string, message: string): Promise<{ reply: string; blocks: TutorBlock[] }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  return apiFetch<{ reply: string; blocks: TutorBlock[] }>(`/api/builder/${lessonId}/agent-edit`, {
    method: "POST",
    token,
    body: JSON.stringify({ message }),
  });
}