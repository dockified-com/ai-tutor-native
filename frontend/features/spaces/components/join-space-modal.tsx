"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinSpace } from "../actions/join-space";
import type { Space } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onJoined: (space: Space) => void;
}

export function JoinSpaceModal({ open, onClose, onJoined }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const { space } = await joinSpace(code.trim().toUpperCase());
      setCode("");
      onJoined(space);
    } catch {
      setError("Invalid code or space not found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Join a space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Space code
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BCKND1"
              maxLength={6}
              className="font-mono tracking-widest text-center text-lg uppercase"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || code.trim().length !== 6}>
              {loading ? "Joining…" : "Join"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}