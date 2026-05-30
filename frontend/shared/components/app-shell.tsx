import type { ReactNode } from "react";

export function AppShell({
  header,
  children,
}: {
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold">AI Tutor</span>
        {header}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
