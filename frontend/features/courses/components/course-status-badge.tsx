import { cn } from "@/shared/lib/cn";

export type CourseStatus = "draft" | "generating" | "ready" | "published" | "failed";

export function CourseStatusBadge({ status, className }: { status: CourseStatus; className?: string }) {
  const styles: Record<CourseStatus, string> = {
    draft: "bg-slate-100 text-slate-600 border border-slate-200",
    generating: "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse",
    ready: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    published: "bg-emerald-600 text-white border border-emerald-700",
    failed: "bg-red-50 text-red-700 border border-red-200",
  };

  const labels: Record<CourseStatus, string> = {
    draft: "Draft",
    generating: "Generating...",
    ready: "Ready to Publish",
    published: "Published",
    failed: "Generation Failed",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}
