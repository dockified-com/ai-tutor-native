import { prisma } from "@/shared/db/client";
import { Prisma } from "@prisma/client";

export async function searchChunks(
  courseId: string,
  queryEmbedding: number[],
  topK = 5
): Promise<{ id: string; content: string }[]> {
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;
  return prisma.$queryRaw<{ id: string; content: string }[]>(
    Prisma.sql`
      SELECT id::text, content
      FROM course_chunks
      WHERE course_id = ${courseId}::uuid
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `
  );
}