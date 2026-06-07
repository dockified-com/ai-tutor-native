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
      className="bg-white/70 backdrop-blur-sm border border-emerald-100 rounded-xl p-5 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
    >
      <div>
        <h3 className="font-semibold text-slate-800 leading-snug">{space.name}</h3>
        {space.owner_name && (
          <p className="text-sm text-slate-500 mt-0.5">by {space.owner_name}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Progress value={pct} className="h-1.5 rounded-full [&>div]:bg-emerald-500" />
        <span className="text-xs text-slate-400">{pct}% complete</span>
      </div>
    </div>
  );
}