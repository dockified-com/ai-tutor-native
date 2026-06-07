"use client";
import { cn } from "@/lib/utils";

export type FilterOption = { id: string; label: string };

interface Props {
  options: FilterOption[];
  active: string;
  onChange: (id: string) => void;
}

export function FilterChips({ options, active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((opt) => {
        const isActive = opt.id === active;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "h-9 px-4 rounded-full text-sm font-medium cursor-pointer",
              "backdrop-blur-sm border transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ea976]/50",
              isActive
                ? "bg-[#6ea976]/20 border-[#6ea976] text-[#37593c] shadow-sm shadow-[#a3d1a5]/30"
                : "bg-white/60 border-[#d1eace] text-slate-600 hover:bg-[#edf5ea]/80 hover:border-[#a3d1a5] hover:text-[#37593c]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
