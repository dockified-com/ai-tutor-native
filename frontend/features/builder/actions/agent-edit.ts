"use server";
import { auth } from "@clerk/nextjs/server";
import type { TutorBlock } from "@/features/spaces/types";

export async function agentEdit(lessonId: string, message: string): Promise<{ reply: string; blocks: TutorBlock[] }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/builder/${lessonId}/agent-edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error(`Failed to agent-edit: ${await res.text()}`);
  }
  return res.json();
}