import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, TerminalSquare, Flame, Play } from 'lucide-react';
import { CodeBlock } from '@/shared/types/blocks';
import { useTutorStore } from '../../stores/tutor-store';
import { cn } from '@/lib/utils';

interface MonacoWorkspaceProps {
  block: CodeBlock;
}

export function MonacoWorkspace({ block }: MonacoWorkspaceProps) {
  const store = useTutorStore();
  
  // State from store
  const code = store.codeValues[block.id] ?? block.content.starter_code;
  const terminal = store.terminalOutputs[block.id];
  const roast = store.roasts[block.id];
  
  const [stuckCount, setStuckCount] = useState<number | null>(null);

  useEffect(() => {
    // Initialize code value in store if not present
    if (store.codeValues[block.id] === undefined) {
      store.setCodeValue(block.id, block.content.starter_code);
    }
    
    // Mock fetching struggle stats - in reality this would be an API call
    setStuckCount(12);
  }, [block.id, block.content.starter_code, store]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      store.setCodeValue(block.id, value);
    }
  };

  const handleRunCode = async () => {
    // This will be wired up to Server Actions in Group D
    store.setTerminalOutput(block.id, { status: 'running', text: 'Running...' });
    
    // Simulate API call for now
    setTimeout(() => {
      // Mock passing for demonstration
      store.setTerminalOutput(block.id, { 
        verdict: 'passed', 
        status: 'done', 
        text: 'Output:\nHello World!\n\nAll tests passed!' 
      });
    }, 1500);
  };

  const handleRoastCode = async () => {
    // Will be wired in Group D via SSE hook
    store.setRoast(block.id, { status: 'loading', text: '' });
    
    setTimeout(() => {
      store.setRoast(block.id, { 
        status: 'done', 
        text: "Oh look, another perfectly indented Hello World. You must be exhausted from typing all those characters. Have a cookie 🍪." 
      });
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <Code2 size={18} />
          </div>
          <h2 className="font-semibold text-slate-800">Code Exercise</h2>
          {stuckCount && stuckCount >= 2 && (
             <div className="flex items-center gap-1.5 ml-2 text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
               <Flame size={12} className="animate-pulse" />
               {stuckCount} friends got stuck here
             </div>
          )}
        </div>
        <button 
          onClick={handleRunCode}
          disabled={terminal?.status === 'running'}
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <Play size={14} fill="currentColor" />
          {terminal?.status === 'running' ? 'Running...' : 'Run Code'}
        </button>
      </div>

      {/* Editor Zone */}
      <div className="flex-1 relative min-h-0 bg-[#1e1e1e]">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', 'Geist Mono', monospace",
            lineHeight: 24,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
          }}
          loading={<div className="p-6 text-slate-400 font-mono text-sm">Loading editor...</div>}
        />
      </div>

      {/* Terminal Zone */}
      <div className="h-[40%] border-t border-slate-800 bg-[#0d0d0d] flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider">
            <TerminalSquare size={14} />
            Terminal Output
          </div>
          {terminal?.verdict === 'passed' && !roast && (
            <button 
              onClick={handleRoastCode}
              className="text-xs font-medium flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-full transition-colors"
            >
              🎭 Roast My Code
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-slate-300">
          {!terminal ? (
            <span className="opacity-50">Run your code to see the output here...</span>
          ) : (
            <div className={cn(
              "whitespace-pre-wrap",
              terminal.verdict === 'failed' ? "text-red-400" : 
              terminal.verdict === 'passed' ? "text-emerald-400" : ""
            )}>
              {terminal.text}
            </div>
          )}
          
          {roast && (
             <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 text-orange-800 font-semibold mb-2 text-xs uppercase tracking-wider">
                  🎭 Senior Dev AI 
                  {roast.status === 'loading' && <span className="animate-pulse normal-case text-orange-600 font-normal">is typing...</span>}
                </div>
                <div className="text-orange-900 leading-relaxed font-sans text-[13px]">
                  {roast.text}{roast.status === 'loading' && <span className="animate-pulse">▊</span>}
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
