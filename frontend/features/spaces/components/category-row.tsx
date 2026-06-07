"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import type { Category } from "../types";

interface Props {
  category: Category;
  spaceId: string;
  isOwner: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}

const rowStyle = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(163,209,165,0.45)",
  boxShadow: "0 2px 12px rgba(110,169,118,0.08)",
} as const;

export function CategoryRow({ category, spaceId, isOwner, dragHandleProps }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden" style={rowStyle}>
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer"
        onClick={() =>
          isOwner
            ? router.push(`/spaces/${spaceId}/categories/${category.id}`)
            : setOpen((v) => !v)
        }
      >
        {isOwner ? (
          <span
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="text-[#a3d1a5] hover:text-[#6ea976] cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </span>
        ) : (
          <span
            className="text-[#6ea976] transition-transform duration-200"
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
          >
            <ChevronDown size={18} />
          </span>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0e2114] truncate">{category.title}</p>
          {category.description && (
            <p className="text-sm mt-0.5 truncate" style={{ color: "rgba(55,89,60,0.65)" }}>
              {category.description}
            </p>
          )}
        </div>

        <span
          className="shrink-0 text-xs px-2.5 py-1 rounded-full font-mono"
          style={{
            background: "rgba(110,169,118,0.15)",
            color: "#37593c",
            border: "1px solid rgba(110,169,118,0.3)",
          }}
        >
          {category.block_count} items
        </span>

        {isOwner && <ChevronRight size={16} className="shrink-0 text-[#a3d1a5]" />}
      </div>

      {!isOwner && open && (
        <div
          className="px-5 pb-4 pt-0 border-t"
          style={{ borderColor: "rgba(163,209,165,0.3)" }}
        >
          <p className="text-sm" style={{ color: "rgba(55,89,60,0.7)" }}>
            {category.block_count} interactive{" "}
            {category.block_count === 1 ? "lesson" : "lessons"}
          </p>
          <button
            onClick={() => router.push(`/spaces/${spaceId}/categories/${category.id}`)}
            className="mt-2 text-sm font-medium cursor-pointer transition-colors duration-150"
            style={{ color: "#37593c" }}
          >
            Enter →
          </button>
        </div>
      )}
    </div>
  );
}