"use client";
import { useState } from "react";
import { Copy, CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  code: string | null;
  onClose: () => void;
}

export function ShareCodeModal({ code, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(`${window.location.origin}/?code=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!code} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Share this space</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mt-1">
          Give this code to anyone you want to join
        </p>
        <div className="my-4 font-mono text-3xl font-bold tracking-widest text-emerald-700 bg-emerald-50 rounded-xl py-4">
          {code}
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? (
              <CheckCheck size={16} className="text-emerald-600" />
            ) : (
              <Copy size={16} />
            )}
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}