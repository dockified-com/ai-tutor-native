"use client";
import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Send } from "lucide-react";
import { agentEdit } from "../actions/agent-edit";
import type { TutorBlock } from "@/features/spaces/types";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  onBlocksUpdated: (blocks: TutorBlock[]) => void;
}

export function AgentSidebar({ open, onClose, lessonId, onBlocksUpdated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const { reply, blocks } = await agentEdit(lessonId, text);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      onBlocksUpdated(blocks);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        className="flex flex-col gap-0 p-0 w-[380px]"
        side="right"
        style={{
          background: "rgba(237,245,234,0.97)",
          backdropFilter: "blur(16px)",
          borderLeft: "1px solid rgba(163,209,165,0.5)",
        }}
      >
        <SheetHeader className="px-5 py-4 border-b" style={{ borderColor: "rgba(163,209,165,0.3)" }}>
          <SheetTitle className="text-[#0e2114] text-sm">AI Curriculum Editor</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-sm text-center" style={{ color: "rgba(55,89,60,0.5)" }}>
              Describe changes to make to the curriculum blocks.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm"
                style={
                  m.role === "user"
                    ? { background: "linear-gradient(135deg, #6ea976, #37593c)", color: "white" }
                    : { background: "rgba(255,255,255,0.7)", color: "#0e2114", border: "1px solid rgba(163,209,165,0.4)" }
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="px-4 py-2.5 rounded-2xl text-sm"
                style={{ background: "rgba(255,255,255,0.7)", color: "#6ea976", border: "1px solid rgba(163,209,165,0.4)" }}
              >
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-4 border-t flex gap-2" style={{ borderColor: "rgba(163,209,165,0.3)" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="e.g. Add a code exercise about list comprehensions"
            className="flex-1 px-4 py-2 rounded-full text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(163,209,165,0.5)",
              color: "#0e2114",
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-40 transition-all shrink-0"
            style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}