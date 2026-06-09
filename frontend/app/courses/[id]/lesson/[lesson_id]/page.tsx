import "server-only";
import { prisma } from "@/shared/db/client";
import { TutorPageClient } from "@/features/tutor/components/tutor-page-client";
import { Block } from "@/shared/types/blocks";
import { markBlockComplete } from "@/features/progress/actions/mark-block-complete";
import { updateBookmark } from "@/features/progress/actions/update-bookmark";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lesson_id: string }>;
}) {
  const { lesson_id } = await params;

  const blocks = await prisma.block.findMany({
    where: { lessonId: lesson_id },
    orderBy: { position: "asc" },
  });

  if (!blocks.length) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-500">Lesson has no content.</p>
      </div>
    );
  }

  const lessonBlocks = blocks.map((b) => ({
    id: b.id,
    type: b.type,
    content: b.content,
  })) as Block[];

  const enrollId = "test-enrollment-id";

  const handleMarkComplete = async (blockId: string) => {
    "use server";
    try { await markBlockComplete(blockId, enrollId); } catch { /* no-op without auth */ }
  };

  const handleUpdateBookmark = async (blockId: string) => {
    "use server";
    try { await updateBookmark(enrollId, blockId); } catch { /* no-op without auth */ }
  };

  return (
    <TutorPageClient
      blocks={lessonBlocks}
      startIndex={0}
      onMarkComplete={handleMarkComplete}
      onUpdateBookmark={handleUpdateBookmark}
    />
  );
}
