"use client";
import { useState } from "react";
import type { TutorBlock } from "@/features/spaces/types";
import { BlockEditor } from "./block-editor";

interface Props {
  blocks: TutorBlock[];
  isOwner: boolean;
  onBlockSaved: (block: TutorBlock) => void;
}

const TYPE_COLORS: Record<string, string> = {
  markdown: "#6ea976",
  code: "#37593c",
  mermaid: "#a3d1a5",
  concept_check: "#6ea976",
  understanding_check: "#0e2114",
};

export function BlockTree({ blocks, isOwner, onBlockSaved }: Props) {
  const [editing, setEditing] = useState<TutorBlock | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="flex items-start gap-3 px-5 py-4 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(163,209,165,0.45)",
            boxShadow: "0 2px 8px rgba(110,169,118,0.07)",
          }}
        >
          <span
            className="shrink-0 mt-0.5 text-xs font-mono px-2 py-0.5 rounded-full text-white"
            style={{ background: TYPE_COLORS[block.type] ?? "#6ea976" }}
          >
            {block.position}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#37593c] uppercase tracking-wide mb-1">
              {block.type.replace(/_/g, " ")}
            </p>
            <p className="text-sm text-[#0e2114] truncate">
              {Object.values(block.content)[0]?.toString().slice(0, 80) ?? ""}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setEditing(block)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(110,169,118,0.4)",
                color: "#37593c",
              }}
            >
              Edit
            </button>
          )}
        </div>
      ))}

      {editing && (
        <BlockEditor
          block={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { onBlockSaved(updated); setEditing(null); }}
        />
      )}
    </div>
  );
}