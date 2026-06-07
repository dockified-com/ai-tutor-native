"use client";
import type { ReactNode } from "react";
import { Layout } from "lucide-react";

interface Props {
  onJoinOpen: () => void;
  userMenu: ReactNode;
}

export function SpacesHeader({ onJoinOpen, userMenu }: Props) {
  return (
    <header
      className="sticky top-0 z-40 h-14 px-6 flex items-center justify-between"
      style={{
        background: "rgba(237,245,234,0.75)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(163,209,165,0.4)",
        boxShadow: "0 1px 12px rgba(110,169,118,0.08)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}
        >
          <Layout size={14} className="text-white" />
        </div>
        <span className="font-semibold text-[#0e2114] text-sm tracking-tight">Dockified</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onJoinOpen}
          className="px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 hover:shadow-md active:scale-95"
          style={{
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(110,169,118,0.5)",
            color: "#37593c",
            boxShadow: "0 1px 6px rgba(110,169,118,0.15)",
          }}
        >
          Join space with code
        </button>
        {userMenu}
      </div>
    </header>
  );
}
