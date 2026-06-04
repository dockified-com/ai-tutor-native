"use client";

import { toast } from "sonner";

export function PublishButton() {
  return (
    <button
      type="button"
      onClick={() => toast.info("Publish flow coming soon.")}
      className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 transition-colors"
    >
      Publish
    </button>
  );
}
