/**
 * Generates a complete "Python Basics" course without needing a PDF or trigger.dev.
 * Run with: npx tsx --env-file=.env.local scripts/seed-course.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const AI_SERVER_URL = process.env.AI_SERVER_URL!;
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET!;

async function aiRun(agent: string, userMessage: string): Promise<string> {
  const res = await fetch(`${AI_SERVER_URL}/v1/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${AI_SERVICE_SECRET}`,
    },
    body: JSON.stringify({ agent, user_message: userMessage }),
  });
  if (!res.ok) throw new Error(`AI /run failed ${res.status}: ${await res.text()}`);
  const raw = ((await res.json()) as { text: string }).text;
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

const COURSE_TOPIC = `
Python Programming for Absolute Beginners.
Cover these topics across exactly 3 lessons:
1. Python basics: variables, data types, print, input
2. Control flow: if/else, for loops, while loops
3. Functions and basic data structures: lists, dicts, defining functions

Keep each lesson focused and practical with coding exercises.
`;

async function main() {
  const SEED_USER_ID = "00000000-0000-0000-0000-000000000001";

  await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    create: { id: SEED_USER_ID, clerkUserId: "seed_user", email: "seed@example.com", displayName: "Seed User" },
    update: {},
  });

  // 1. Create course row
  const course = await prisma.course.create({
    data: {
      creatorId: SEED_USER_ID,
      title: "Python Basics",
      description: "A complete Python course for beginners",
      sourcePdfUrl: "",
      status: "generating",
      generationPhase: "outline",
    },
  });
  console.log(`Course created: ${course.id}`);

  // 2. Generate outline
  console.log("Generating outline...");
  const outlineRaw = await aiRun("outline", COURSE_TOPIC);
  const outline = JSON.parse(outlineRaw) as {
    title: string;
    description: string;
    lessons: Array<{ position: number; title: string; summary?: string; objectives?: string[] }>;
  };
  console.log(`Outline: ${outline.title} (${outline.lessons.length} lessons)`);

  await prisma.course.update({
    where: { id: course.id },
    data: { title: outline.title, description: outline.description, totalLessons: outline.lessons.length, generationPhase: "blocks" },
  });

  // 3. Create lessons and generate blocks
  let totalBlocks = 0;
  for (const l of outline.lessons) {
    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        position: l.position,
        title: l.title,
        summary: l.summary ?? null,
        objectives: l.objectives ?? [],
        status: "generating",
      },
    });
    console.log(`  Lesson ${l.position}: ${l.title}`);

    const msg = `Course: ${outline.title}\nLesson: ${l.title}\nSummary: ${l.summary ?? ""}\nObjectives: ${(l.objectives ?? []).join(", ")}`;
    console.log(`  Generating blocks...`);
    const blocksRaw = await aiRun("generate-blocks", msg);
    const blocksData = JSON.parse(blocksRaw) as {
      blocks: Array<{ type: string; content: Record<string, unknown> }>;
    };

    for (let p = 0; p < blocksData.blocks.length; p++) {
      const b = blocksData.blocks[p];
      await prisma.block.create({
        data: { lessonId: lesson.id, position: p, type: b.type, content: b.content },
      });
    }
    totalBlocks += blocksData.blocks.length;
    console.log(`  -> ${blocksData.blocks.length} blocks`);

    await prisma.lesson.update({ where: { id: lesson.id }, data: { status: "ready" } });
  }

  await prisma.course.update({
    where: { id: course.id },
    data: { status: "ready", generationPhase: null, totalBlocks },
  });

  console.log(`\nDone! Course ID: ${course.id}`);
  console.log(`Total blocks: ${totalBlocks}`);
  console.log(`\nAccess at: http://localhost:3000 (enroll with share code or as creator)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
