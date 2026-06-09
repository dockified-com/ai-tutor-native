import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

export async function updateCoursePhase(courseId: string, phase: string | null): Promise<void> {
  await sql`UPDATE courses SET generation_phase = ${phase} WHERE id = ${courseId}::uuid`;
}

export async function setCourseTitle(
  courseId: string,
  title: string,
  description: string | null,
  totalLessons: number
): Promise<void> {
  await sql`
    UPDATE courses
    SET title = ${title}, description = ${description}, total_lessons = ${totalLessons}
    WHERE id = ${courseId}::uuid
  `;
}

export async function setCourseReady(courseId: string, totalBlocks: number): Promise<void> {
  await sql`
    UPDATE courses
    SET status = 'ready', generation_phase = NULL, total_blocks = ${totalBlocks}
    WHERE id = ${courseId}::uuid
  `;
}

export async function setCourseFailed(courseId: string, error: string): Promise<void> {
  await sql`
    UPDATE courses
    SET status = 'failed', generation_error = ${error}, generation_phase = NULL
    WHERE id = ${courseId}::uuid
  `;
}

export async function insertChunks(
  chunks: Array<{ courseId: string; content: string; embedding: number[]; chunkIndex: number }>
): Promise<void> {
  for (const c of chunks) {
    await sql`
      INSERT INTO course_chunks (course_id, content, embedding, chunk_index)
      VALUES (${c.courseId}::uuid, ${c.content}, ${JSON.stringify(c.embedding)}::vector, ${c.chunkIndex})
    `;
  }
}

export async function insertLessons(
  lessons: Array<{
    courseId: string;
    position: number;
    title: string;
    summary: string | null;
    objectives: string[];
  }>
): Promise<string[]> {
  const ids: string[] = [];
  for (const l of lessons) {
    const rows = await sql<{ id: string }[]>`
      INSERT INTO lessons (course_id, position, title, summary, objectives)
      VALUES (${l.courseId}::uuid, ${l.position}, ${l.title}, ${l.summary}, ${l.objectives})
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return ids;
}

export async function insertBlocks(
  blocks: Array<{
    lessonId: string;
    position: number;
    type: string;
    content: Record<string, unknown>;
  }>
): Promise<number> {
  for (const b of blocks) {
    await sql`
      INSERT INTO blocks (lesson_id, position, type, content)
      VALUES (${b.lessonId}::uuid, ${b.position}, ${b.type}, ${sql.json(b.content)})
    `;
  }
  await sql`UPDATE lessons SET status = 'ready' WHERE id = ${blocks[0]?.lessonId}::uuid`;
  return blocks.length;
}

export async function getLessonsForCourse(courseId: string): Promise<
  Array<{ id: string; title: string; summary: string | null; objectives: string[] }>
> {
  return sql<Array<{ id: string; title: string; summary: string | null; objectives: string[] }>>`
    SELECT id, title, summary, objectives FROM lessons WHERE course_id = ${courseId}::uuid ORDER BY position
  `;
}

export async function getCourse(
  courseId: string
): Promise<{ source_pdf_url: string } | null> {
  const rows = await sql<Array<{ source_pdf_url: string }>>`
    SELECT source_pdf_url FROM courses WHERE id = ${courseId}::uuid
  `;
  return rows[0] ?? null;
}

export { sql };
