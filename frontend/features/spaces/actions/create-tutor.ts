"use server";
import { tasks } from "@trigger.dev/sdk/v3";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import type { generateCourse } from "@/trigger/generate-course";

export type CreateTutorInput = {
  title: string;
  description: string | null;
  pdfUrl: string | null;
  customPrompt: string | null;
};

export async function createTutor(input: CreateTutorInput): Promise<{ courseId: string }> {
  const user = await requireUser();
  const course = await prisma.course.create({
    data: {
      creatorId: user.id,
      sourcePdfUrl: input.pdfUrl ?? "",
      customPrompt: input.customPrompt,
      status: "generating",
      generationPhase: "extracting",
    },
  });
  await tasks.trigger<typeof generateCourse>("generate-course", { courseId: course.id });
  return { courseId: course.id };
}
