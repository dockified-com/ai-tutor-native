"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Eye, CheckCircle } from "lucide-react";
import { BlockTree } from "./block-tree";
import { AgentSidebar } from "./agent-sidebar";
import { useLessonBlocks } from "../hooks/use-lesson-blocks";
import { publishLesson } from "../actions/publish-lesson";
import type { TutorBlock } from "@/features/spaces/types";

interface Props {
  lessonId: string;
}

export function BuilderPage({ lessonId }: Props) {
  const router = useRouter();
  const { lesson, loading, mutate } = useLessonBlocks(lessonId);
  const [agentOpen, setAgentOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function handleBlockSaved(updated: TutorBlock) {
    if (!lesson) return;
    mutate({ ...lesson, blocks: lesson.blocks.map((b) => (b.id === updated.id ? updated : b)) }, false);
  }

  function handleBlocksUpdated(blocks: TutorBlock[]) {
    if (!lesson) return;
    mutate({ ...lesson, blocks }, false);
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await publishLesson(lessonId);
      setPublished(true);
    } catch {
      // keep button enabled on error
    } finally {
      setPublishing(false);
    }
  }

  if (!loading && lesson && !lesson.is_owner) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #edf5ea, #d1eace)" }}>
        <p className="text-[#37593c] font-medium">Access denied — owner only.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #edf5ea 0%, #d1eace 40%, #c8e6c5 100%)" }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 h-14 px-6 flex items-center justify-between"
        style={{
          background: "rgba(237,245,234,0.8)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(163,209,165,0.4)",
        }}
      >
        <div>
          <p className="text-xs text-[#37593c]/60 uppercase tracking-wider">Draft Mode</p>
          {lesson && <p className="text-sm font-semibold text-[#0e2114] -mt-0.5">{lesson.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          {lesson && (
            <button
              onClick={() => router.push(`/courses/${lesson.course_id}/lesson/${lessonId}`)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(110,169,118,0.4)", color: "#37593c" }}
            >
              <Eye size={13} /> Preview
            </button>
          )}
          <button
            onClick={() => setAgentOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer text-white transition-all"
            style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}
          >
            <Bot size={13} /> AI Editor
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || published}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer disabled:opacity-60 transition-all"
            style={{
              background: published ? "rgba(110,169,118,0.2)" : "rgba(255,255,255,0.6)",
              border: "1px solid rgba(110,169,118,0.5)",
              color: "#37593c",
            }}
          >
            <CheckCircle size={13} />
            {published ? "Published ✓" : publishing ? "Publishing…" : "Publish to Space"}
          </button>
        </div>
      </header>

      <main className="relative flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(163,209,165,0.3)" }} />
            ))}
          </div>
        ) : lesson && lesson.blocks.length > 0 ? (
          <BlockTree blocks={lesson.blocks} isOwner onBlockSaved={handleBlockSaved} />
        ) : (
          <div className="flex items-center justify-center py-24 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(163,209,165,0.4)" }}>
            <p className="text-[#37593c]/60 text-sm">No blocks yet — generation may still be in progress.</p>
          </div>
        )}
      </main>

      {lesson && (
        <AgentSidebar
          open={agentOpen}
          onClose={() => setAgentOpen(false)}
          lessonId={lessonId}
          onBlocksUpdated={handleBlocksUpdated}
        />
      )}
    </div>
  );
}