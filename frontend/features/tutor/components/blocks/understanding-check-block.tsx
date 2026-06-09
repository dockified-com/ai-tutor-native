import React, { FormEvent, useRef, useEffect } from 'react';
import { UnderstandingCheckBlock as UnderstandingCheckBlockType } from '@/shared/types/blocks';
import { useTutorStore } from '../../stores/tutor-store';
import { cn } from '@/lib/utils';
import { useSSEStream } from '@/hooks/use-sse-stream';
import { CheckCircle2 } from 'lucide-react';
import { useParams } from 'next/navigation';

interface UnderstandingCheckBlockProps {
  block: UnderstandingCheckBlockType;
  index: number;
}

export function UnderstandingCheckBlock({ block, index }: UnderstandingCheckBlockProps) {
  const params = useParams();
  const enrollmentId = params.id as string;
  const store = useTutorStore();
  const {
    activeBlockId,
    revealedIndex,
    understandingResponse,
    understandingFeedback,
    understandingPassed,
    understandingAttempts,
    setUnderstandingResponse,
    setUnderstandingFeedback,
    setUnderstandingPassed,
    incrementUnderstandingAttempt
  } = store;

  const isActive = activeBlockId === block.id;
  const isPast = index < revealedIndex && !isActive;

  const response = understandingResponse[block.id] || '';
  const feedback = understandingFeedback[block.id] || '';
  const passed = understandingPassed[block.id] || false;
  const attempts = understandingAttempts[block.id] || 0;

  const sse = useSSEStream();
  const previousDataLenRef = useRef(0);

  useEffect(() => {
    if (sse.status === 'loading' || sse.status === 'success') {
      const newText = sse.data.slice(previousDataLenRef.current);
      if (newText) {
        setUnderstandingFeedback(block.id, feedback + newText);
        previousDataLenRef.current = sse.data.length;
      }
    }
  }, [sse.data, sse.status, block.id, setUnderstandingFeedback, feedback]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!response.trim() || sse.status === 'loading' || passed) return;

    setUnderstandingFeedback(block.id, '');
    previousDataLenRef.current = 0;

    // Step 1: Mint session
    const mintRes = await fetch(`/api/blocks/${block.id}/understanding-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId }),
    });
    if (!mintRes.ok) return;
    const { ai_url, session_token } = await mintRes.json();

    // Step 2: Stream from AI server
    await sse.execute(ai_url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ client_context: { response } }),
    });

    // Step 3: On success, POST result to persist
    if (sse.status === 'success' && sse.result) {
      const resultRes = await fetch('/api/tutor/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'understanding-check',
          blob: sse.result,
          enrollmentId,
          blockId: block.id,
          response,
          attemptNumber: attempts + 1,
          session_token,
        }),
      });
      if (resultRes.ok) {
        const result = await resultRes.json();
        if (result.passed) {
          setUnderstandingPassed(block.id, true);
        } else {
          incrementUnderstandingAttempt(block.id);
        }
        if (result.feedback) {
          setUnderstandingFeedback(block.id, result.feedback);
        }
      }
    }
  };

  return (
    <div
      className={cn(
        "py-3 px-0 transition-opacity flex flex-col gap-3",
        isActive ? "border-l-2 border-emerald-400 pl-4" : "border-l-2 border-transparent pl-4",
        isPast ? "opacity-60" : ""
      )}
    >
      <div className="font-serif font-medium text-slate-800">
        {block.content.prompt}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={response}
          onChange={(e) => setUnderstandingResponse(block.id, e.target.value)}
          placeholder="Write your answer here..."
          disabled={sse.status === 'loading' || passed}
          className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 outline-none resize-y text-[14px] text-slate-800 disabled:bg-slate-50 transition-all"
        />

        {!passed && (
          <div className="flex justify-end">
             <button
               type="submit"
               disabled={!response.trim() || sse.status === 'loading'}
               className="bg-slate-800 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-50 transition-colors"
             >
               {sse.status === 'loading' ? 'Evaluating...' : (attempts > 0 ? 'Submit Revision' : 'Submit')}
             </button>
          </div>
        )}
      </form>

      {feedback && (
        <div className={cn(
          "p-4 rounded-xl shadow-sm text-[14px] leading-relaxed",
          passed ? "bg-emerald-50 border border-emerald-100 text-emerald-900" : "bg-orange-50 border border-orange-100 text-orange-900"
        )}>
           {passed && (
             <div className="flex items-center gap-2 font-semibold mb-2 text-emerald-700">
               <CheckCircle2 size={16} /> Great job!
             </div>
           )}
           <div className={passed ? "font-sans" : "font-serif"}>
             {feedback}
             {sse.status === 'loading' && <span className="animate-pulse normal-case font-sans ml-1">▊</span>}
           </div>
        </div>
      )}
    </div>
  );
}