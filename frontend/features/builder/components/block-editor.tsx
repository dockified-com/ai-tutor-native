"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateBlock } from "../actions/update-block";
import type { TutorBlock } from "@/features/spaces/types";

interface Props {
  block: TutorBlock;
  onClose: () => void;
  onSaved: (block: TutorBlock) => void;
}

export function BlockEditor({ block, onClose, onSaved }: Props) {
  const [value, setValue] = useState(() => JSON.stringify(block.content, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(value);
    } catch {
      setError("Invalid JSON.");
      return;
    }
    setLoading(true);
    try {
      const updated = await updateBlock(block.id, parsed);
      onSaved(updated);
    } catch {
      setError("Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        style={{
          background: "rgba(237,245,234,0.97)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(163,209,165,0.5)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#0e2114]">Edit Block ({block.type})</DialogTitle>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={12}
          className="font-mono text-xs border-[#a3d1a5] focus-visible:ring-[#6ea976] resize-none"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer"
            style={{ color: "#37593c", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(110,169,118,0.4)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}