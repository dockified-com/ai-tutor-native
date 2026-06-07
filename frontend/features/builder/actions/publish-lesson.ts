"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";

export async function publishLesson(lessonId: string): Promise<void> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  await apiFetch<void>(`/api/lessons/${lessonId}/publish`, {
    method: "POST",
    token,
  });
}