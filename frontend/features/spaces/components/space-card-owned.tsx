"use client";
import { useRouter } from "next/navigation";
import type { Space } from "../types";

interface Props {
  space: Space;
  onShareCode: (code: string) => void;
}

const cardStyle = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(163,209,165,0.45)",
  boxShadow: "0 2px 12px rgba(110,169,118,0.1)",
} as const;

export function SpaceCardOwned({ space, onShareCode }: Props) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/courses/${space.id}`)}
      className="rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(110,169,118,0.22)]"
      style={cardStyle}
    >
      <div>
        <h3 className="font-semibold text-[#0e2114] leading-snug">{space.name}</h3>
        {space.description && (
          <p className="text-sm mt-1 line-clamp-2" style={{ color: "rgba(55,89,60,0.7)" }}>{space.description}</p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onShareCode(space.share_code); }}
        className="self-start font-mono text-xs px-2.5 py-1 rounded-full cursor-pointer transition-all duration-150 hover:brightness-110"
        style={{ background: "rgba(110,169,118,0.18)", border: "1px solid rgba(110,169,118,0.4)", color: "#37593c", letterSpacing: "0.08em" }}
      >
        {space.share_code}
      </button>
    </div>
  );
}