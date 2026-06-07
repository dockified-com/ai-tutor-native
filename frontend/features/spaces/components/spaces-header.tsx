"use client";
import { Layout } from "lucide-react";
import { UserMenu } from "@/features/auth";
import { Button } from "@/components/ui/button";

interface Props {
  onJoinOpen: () => void;
}

export function SpacesHeader({ onJoinOpen }: Props) {
  return (
    <header className="h-14 border-b border-emerald-100 bg-white px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
          <Layout size={14} className="text-white" />
        </div>
        <span className="font-semibold text-slate-800 text-sm">Dockified</span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onJoinOpen}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          Join space with code
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}