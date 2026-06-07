"use client";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import type { Space } from "../types";

interface Props {
  space: Space;
}

export function SpaceCardJoined({ space }: Props) {
  const router = useRouter();
  const pct = space.progress_pct ?? 0;

  return (
    <div
      onClick={() => router.push(`/courses/${space.id}`)}
      className="rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(110,169,118,0.22)]"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(163,209,165,0.45)",
        boxShadow: "0 2px 12px rgba(110,169,118,0.1)",
      }}
    >
      <div>
        <h3 className="font-semibold text-[#0e2114] leading-snug">{space.name}</h3>
        {space.owner_name && (
          <p className="text-sm mt-0.5" style={{ color: "rgba(55,89,60,0.65)" }}>by {space.owner_name}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Progress value={pct} className="h-1.5 rounded-full [&>div]:bg-[#6ea976]" />
        <span className="text-xs" style={{ color: "rgba(55,89,60,0.55)" }}>{pct}% complete</span>
      </div>
    </div>
  );
}
