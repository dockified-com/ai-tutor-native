"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addCategory } from "../actions/add-category";
import type { Category } from "../types";

interface Props {
  spaceId: string;
  open: boolean;
  onClose: () => void;
  onAdded: (category: Category) => void;
}

export function AddCategoryModal({ spaceId, open, onClose, onAdded }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { category } = await addCategory(spaceId, name.trim(), description.trim() || null);
      onAdded(category);
      setName("");
      setDescription("");
    } catch {
      setError("Failed to add category.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: "rgba(237,245,234,0.95)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(163,209,165,0.5)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#0e2114]">Add Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Week 1"
              maxLength={80}
              required
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">
              Description{" "}
              <span className="font-normal text-[#37593c]/50">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category"
              rows={2}
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976] resize-none"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors"
              style={{
                color: "#37593c",
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(110,169,118,0.4)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6ea976, #37593c)",
                boxShadow: "0 2px 8px rgba(110,169,118,0.35)",
              }}
            >
              {loading ? "Adding…" : "Add Category"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}