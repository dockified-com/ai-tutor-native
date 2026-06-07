"use client";
import { useRouter } from "next/navigation";
import type { Space } from "../types";

interface Props {
  space: Space;
  onShareCode: (code: string) => void;
}

export function SpaceCardOwned({ space, onShareCode }: Props) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/courses/${space.id}`)}
      className="bg-white/70 backdrop-blur-sm border border-emerald-100 rounded-xl p-5 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
    >
      <div>
        <h3 className="font-semibold text-slate-800 leading-snug">{space.name}</h3>
        {space.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
            {space.description}
          </p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onShareCode(space.share_code);
        }}
        className="self-start bg-emerald-50 text-emerald-700 text-xs rounded px-2 py-0.5 border border-emerald-200 font-mono tracking-wider hover:bg-emerald-100 transition-colors"
      >
        {space.share_code}
      </button>
    </div>
  );
}