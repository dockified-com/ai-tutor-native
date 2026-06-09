import { task, retry } from "@trigger.dev/sdk/v3";
import { prisma } from "@/shared/db/client";

const AI_SERVER_URL = process.env.AI_SERVER_URL!;
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET!;

function aiHeaders() {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${AI_SERVICE_SECRET}`,
  };
}

async function aiRun(agent: string, userMessage: string): Promise<string> {
  return retry.onThrow(
    async () => {
      const res = await fetch(`${AI_SERVER_URL}/v1/run`, {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({ agent, user_message: userMessage }),
      });
      if (!res.ok) throw new Error(`AI /run failed: ${res.status}`);
      return ((await res.json()) as { text: string }).text;
    },
    { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2 }
  );
}

async function aiEmbed(texts: string[]): Promise<number[][]> {
  return retry.onThrow(
    async () => {
      const res = await fetch(`${AI_SERVER_URL}/v1/embed`, {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({ texts }),
      });
      if (!res.ok) throw new Error(`AI /embed failed: ${res.status}`);
      return ((await res.json()) as { vectors: number[][] }).vectors;
    },
    { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2 }
  );
}

function chunkText(text: string, size = 1000): string[] {
  const chunks: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    let chunk = text.slice(pos, pos + size);
    let advance: number;
    if (pos + size < text.length) {
      const lastSpace = chunk.lastIndexOf(" ");
      if (lastSpace > 0) { chunk = chunk.slice(0, lastSpace); advance = lastSpace; }
      else advance = chunk.length;
    } else {
      advance = chunk.length;
    }
    chunks.push(chunk);
    pos += advance;
  }
  return chunks;
}

export const generateCourse = task({
  id: "generate-course",
  maxDuration: 1800,
  run: async ({ courseId }: { courseId: string }) => {
    const fail = (msg: string) =>
      prisma.$executeRawUnsafe(
        `UPDATE courses SET status='failed', generation_error=$1, generation_phase=NULL WHERE id=$2::uuid`,
        msg, courseId
      );

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE courses SET generation_phase='extracting' WHERE id=$1::uuid`, courseId
      );

      const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });

      let pdfText = "";
      if (course.sourcePdfUrl) {
        const pdfRes = await fetch(course.sourcePdfUrl);
        if (!pdfRes.ok) throw new Error(`PDF download failed: ${pdfRes.status}`);
        const { extractText } = await import("unpdf");
        const { text } = await extractText(
          new Uint8Array(await pdfRes.arrayBuffer()),
          { mergePages: true }
        );
        if (!text.trim()) { await fail("OCR not supported in V1"); return; }
        pdfText = text;

        // Embedding
        await prisma.$executeRawUnsafe(
          `UPDATE courses SET generation_phase='embedding' WHERE id=$1::uuid`, courseId
        );
        const textChunks = chunkText(pdfText);
        const allVectors: number[][] = [];
        for (let i = 0; i < textChunks.length; i += 20) {
          allVectors.push(...await aiEmbed(textChunks.slice(i, i + 20)));
        }
        for (let i = 0; i < textChunks.length; i++) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO course_chunks (course_id, content, embedding, chunk_index) VALUES ($1::uuid, $2, $3::vector, $4)`,
            courseId, textChunks[i], JSON.stringify(allVectors[i]), i
          );
        }
      }

      // Outline
      await prisma.$executeRawUnsafe(
        `UPDATE courses SET generation_phase='outline' WHERE id=$1::uuid`, courseId
      );
      const outlineInput = (pdfText || course.customPrompt || course.title || "").slice(0, 100000);
      const outlineRaw = (await aiRun("outline", outlineInput)).replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
      const outline = JSON.parse(outlineRaw) as {
        title: string;
        description: string;
        lessons: Array<{ position: number; title: string; summary?: string; objectives?: string[] }>;
      };
      await prisma.$executeRawUnsafe(
        `UPDATE courses SET title=$1, description=$2, total_lessons=$3 WHERE id=$4::uuid`,
        outline.title, outline.description ?? null, outline.lessons.length, courseId
      );
      const lessonIds: string[] = [];
      for (const l of outline.lessons) {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO lessons (id, course_id, position, title, summary, objectives, updated_at) VALUES (gen_random_uuid(),$1::uuid,$2,$3,$4,$5,NOW()) RETURNING id`,
          courseId, l.position, l.title, l.summary ?? null, l.objectives ?? []
        );
        lessonIds.push(rows[0].id);
      }

      // Blocks (up to 5 concurrent)
      await prisma.$executeRawUnsafe(
        `UPDATE courses SET generation_phase='blocks' WHERE id=$1::uuid`, courseId
      );
      let totalBlocks = 0;
      const CONCURRENCY = 5;
      for (let i = 0; i < outline.lessons.length; i += CONCURRENCY) {
        const batch = outline.lessons.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(batch.map(async (l, bIdx) => {
          const lessonId = lessonIds[i + bIdx];
          const msg = `Course: ${outline.title}\nDescription: ${outline.description ?? ""}\nLesson: ${l.title}\nSummary: ${l.summary ?? ""}\nObjectives: ${(l.objectives ?? []).join(", ")}`;
          const blocksRaw = (await aiRun("generate-blocks", msg)).replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
          const blocksData = JSON.parse(blocksRaw) as {
            blocks: Array<{ type: string; content: Record<string, unknown> }>;
          };
          for (let p = 0; p < blocksData.blocks.length; p++) {
            const b = blocksData.blocks[p];
            await prisma.$executeRawUnsafe(
              `INSERT INTO blocks (id, lesson_id, position, type, content, updated_at) VALUES (gen_random_uuid(),$1::uuid,$2,$3,$4::jsonb,NOW())`,
              lessonId, p, b.type, JSON.stringify(b.content)
            );
          }
          await prisma.$executeRawUnsafe(
            `UPDATE lessons SET status='ready' WHERE id=$1::uuid`, lessonId
          );
          return blocksData.blocks.length;
        }));
        for (const r of results) {
          if (r.status === "rejected") throw new Error(`Block generation failed: ${r.reason}`);
          totalBlocks += r.value;
        }
      }

      await prisma.$executeRawUnsafe(
        `UPDATE courses SET status='ready', generation_phase=NULL, total_blocks=$1 WHERE id=$2::uuid`,
        totalBlocks, courseId
      );
    } catch (err) {
      await fail(err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
});
