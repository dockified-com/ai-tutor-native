"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, BookOpen, Play } from "lucide-react";
import { SpacesHeader } from "./spaces-header";
import { CreateTutorModal } from "./create-tutor-modal";
import { useNode } from "../hooks/use-node";

interface Props {
  spaceId: string;
  nodeId: string;
  userMenu: ReactNode;
}

const cardStyle = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(163,209,165,0.45)",
  boxShadow: "0 2px 12px rgba(110,169,118,0.08)",
} as const;

export function NodePage({ spaceId, nodeId, userMenu }: Props) {
  const router = useRouter();
  const { node, loading } = useNode(nodeId);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  void joinOpen;

  const isOwner = node?.is_owner ?? false;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #edf5ea 0%, #d1eace 40%, #c8e6c5 100%)" }}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: "absolute", top: "-8rem", left: "-8rem", width: "24rem", height: "24rem", borderRadius: "50%", opacity: 0.4, filter: "blur(48px)", background: "radial-gradient(circle, #a3d1a5, transparent)" }} />
        <div style={{ position: "absolute", top: "33%", right: "-6rem", width: "20rem", height: "20rem", borderRadius: "50%", opacity: 0.3, filter: "blur(48px)", background: "radial-gradient(circle, #6ea976, transparent)" }} />
      </div>

      <SpacesHeader onJoinOpen={() => setJoinOpen(true)} userMenu={userMenu} />

      <main className="relative flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "rgba(55,89,60,0.6)" }}>
          <button onClick={() => router.push("/dashboard")} className="hover:text-[#37593c] cursor-pointer transition-colors">Dashboard</button>
          <span>/</span>
          <button onClick={() => router.back()} className="hover:text-[#37593c] cursor-pointer transition-colors">
            {loading ? "…" : "Space"}
          </button>
          <span>/</span>
          <span className="text-[#37593c] font-medium">{loading ? "…" : node?.title}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            {loading ? (
              <div className="h-7 w-48 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.5)" }} />
            ) : (
              <h1 className="text-2xl font-bold text-[#0e2114]">{node?.title}</h1>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => setCreateOpen(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(55,89,60,0.3)] active:scale-95"
              style={{ background: "linear-gradient(135deg, #6ea976, #37593c)", boxShadow: "0 2px 8px rgba(110,169,118,0.35)" }}
            >
              <Zap size={14} /> Create AI Tutor Native
            </button>
          )}
        </div>

        {/* AI Tutors section */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#37593c] uppercase tracking-wider mb-3">AI Tutors</h2>
          {loading ? (
            <div className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(163,209,165,0.3)" }} />
          ) : node && node.blocks.length > 0 ? (
            <div
              className="flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(110,169,118,0.18)]"
              style={cardStyle}
              onClick={() => router.push(`/courses/${node.course_id}/lesson/${nodeId}`)}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}>
                <Play size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#0e2114]">{node.title}</p>
                <p className="text-sm" style={{ color: "rgba(55,89,60,0.65)" }}>{node.blocks.length} blocks</p>
              </div>
              <span
                className="shrink-0 text-xs px-2.5 py-1 rounded-full"
                style={{
                  background: node.status === "ready" ? "rgba(110,169,118,0.18)" : "rgba(255,193,7,0.18)",
                  color: node.status === "ready" ? "#37593c" : "#856404",
                  border: `1px solid ${node.status === "ready" ? "rgba(110,169,118,0.4)" : "rgba(255,193,7,0.4)"}`,
                }}
              >
                {node.status}
              </span>
              {isOwner && (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/builder/${nodeId}`); }}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all"
                  style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(110,169,118,0.4)", color: "#37593c" }}
                >
                  Edit
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(163,209,165,0.4)" }}>
              <BookOpen size={28} className="text-[#a3d1a5] mb-3" />
              <p className="text-[#37593c]/70 text-sm">{isOwner ? "No AI Tutors yet. Create one above." : "No content published yet."}</p>
            </div>
          )}
        </section>

        {/* Assessments stub */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#37593c] uppercase tracking-wider mb-3">Assessments</h2>
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.25)", border: "1px dashed rgba(163,209,165,0.5)" }}>
            <p className="text-[#37593c]/50 text-sm">Coming soon</p>
          </div>
        </section>

        {/* Resources stub */}
        <section>
          <h2 className="text-sm font-semibold text-[#37593c] uppercase tracking-wider mb-3">Resources</h2>
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.25)", border: "1px dashed rgba(163,209,165,0.5)" }}>
            <p className="text-[#37593c]/50 text-sm">Coming soon</p>
          </div>
        </section>
      </main>

      <CreateTutorModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}