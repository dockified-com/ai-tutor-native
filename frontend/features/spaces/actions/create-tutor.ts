"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";

export type CreateTutorInput = {
  title: string;
  description: string | null;
  pdfUrl: string;
  customPrompt: string | null;
};

export async function createTutor(input: CreateTutorInput): Promise<{ courseId: string }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  const course = await apiFetch<{ id: string }>("/api/courses", {
    method: "POST",
    token,
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      pdf_url: input.pdfUrl,
      custom_prompt: input.customPrompt,
    }),
  });
  return { courseId: course.id };
}