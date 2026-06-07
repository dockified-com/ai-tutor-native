"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createTutor } from "../actions/create-tutor";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateTutorModal({ open, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pdfUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const prompt = webSearch
        ? `[WEB_SEARCH_ENABLED]\n${customPrompt.trim()}`
        : customPrompt.trim() || null;
      const { courseId } = await createTutor({
        title: name.trim(),
        description: description.trim() || null,
        pdfUrl: pdfUrl.trim(),
        customPrompt: prompt,
      });
      onClose();
      router.push(`/builder/${courseId}`);
    } catch {
      setError("Failed to start generation. Check the PDF URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        style={{
          background: "rgba(237,245,234,0.97)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(163,209,165,0.5)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#0e2114]">⚡ Create AI Tutor Native</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">Lesson Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Python Decorators"
              required
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">
              Description <span className="font-normal text-[#37593c]/50">(optional)</span>
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview"
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">PDF Source URL</label>
            <Input
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="https://example.com/material.pdf"
              type="url"
              required
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">
              Custom Instructions <span className="font-normal text-[#37593c]/50">(optional)</span>
            </label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Focus on beginner-friendly explanations..."
              rows={3}
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976] resize-none"
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-[#37593c]">Enable Web Search</p>
              <p className="text-xs text-[#37593c]/60">Augment generation with live search</p>
            </div>
            <Switch
              checked={webSearch}
              onCheckedChange={setWebSearch}
              className="data-[state=checked]:bg-[#6ea976]"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer"
              style={{ color: "#37593c", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(110,169,118,0.4)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !pdfUrl.trim()}
              className="px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6ea976, #37593c)", boxShadow: "0 2px 8px rgba(110,169,118,0.35)" }}
            >
              {loading ? "Starting…" : "Generate"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}