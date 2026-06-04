import React from 'react';
import { Hand } from 'lucide-react';

interface EmptyWorkspaceProps {
  label?: string;
}

export function EmptyWorkspace({ label = "Welcome to the Course!" }: EmptyWorkspaceProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
      <Hand size={48} className="mb-4 opacity-50" />
      <h2 className="text-xl font-medium">{label}</h2>
    </div>
  );
}
