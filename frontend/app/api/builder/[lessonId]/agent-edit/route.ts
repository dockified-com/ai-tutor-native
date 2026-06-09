import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/shared/auth/current-user";
import { getLessonBlocks, updateBlockContent } from "@/shared/db/queries";
import { runAgent } from "@/shared/api/ai-server";
import { HttpError } from "@/shared/auth/current-user";
import type { TutorBlock } from "@/features/spaces/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    await requireUser();
    const { lessonId } = await params;
    const { message } = await req.json();

    const blocks = await getLessonBlocks(lessonId);
    const blocksJson = JSON.stringify(
      blocks.map((b) => ({ id: b.id, position: b.position, type: b.type, content: b.content })),
      null,
      2
    );

    const { text } = await runAgent("agent-edit", `Current blocks:\n${blocksJson}\n\nInstruction: ${message}`);
    const { reply, blocks: updatedBlocks }: { reply: string; blocks: TutorBlock[] } = JSON.parse(text);

    // Persist updated content; keep ids/positions unchanged
    await Promise.all(updatedBlocks.map((b) => updateBlockContent(b.id, b.content)));

    // Return fresh blocks from DB
    const freshBlocks = await getLessonBlocks(lessonId);
    return NextResponse.json({
      reply,
      blocks: freshBlocks.map((b) => ({ id: b.id, position: b.position, type: b.type, content: b.content })),
    });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}