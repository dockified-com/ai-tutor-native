import React, { FormEvent, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useTutorStore } from '../stores/tutor-store';
import { useSSEStream } from '../hooks/use-sse-stream';
import { useParams } from 'next/navigation';

export function AskFooter() {
  const params = useParams();
  const enrollmentId = params.id as string;
  const store = useTutorStore();
  const { askInput, setAskInput, appendChatHistory, updateLastChat, activeBlockId } = store;
  const sse = useSSEStream();

  const previousDataLenRef = useRef(0);

  useEffect(() => {
    if (sse.status === 'loading' || sse.status === 'success') {
      const newText = sse.data.slice(previousDataLenRef.current);
      if (newText) {
        updateLastChat(newText);
        previousDataLenRef.current = sse.data.length;
      }
    }
  }, [sse.data, sse.status, updateLastChat]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!askInput.trim() || sse.status === 'loading') return;

    const question = askInput.trim();
    appendChatHistory({ role: 'user', text: question });
    setAskInput('');
    appendChatHistory({ role: 'ai', text: '' });
    previousDataLenRef.current = 0;

    await sse.execute(`/api/enrollments/${enrollmentId}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, block_id: activeBlockId }),
    });
  };

  return (
    <div className="p-4 bg-white border-t border-slate-200 shrink-0">
      <form 
        onSubmit={handleSubmit}
        className="flex items-center bg-slate-50 rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50 transition-all px-3 py-2"
      >
        <input
          type="text"
          value={askInput}
          onChange={(e) => setAskInput(e.target.value)}
          placeholder="Ask or Comment ..."
          className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-slate-400 text-slate-800"
        />
        <button
          type="submit"
          disabled={!askInput.trim() || sse.status === 'loading'}
          className="ml-2 p-1.5 rounded-lg bg-emerald-500 text-white disabled:bg-slate-300 disabled:text-slate-50 transition-colors flex items-center justify-center"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
