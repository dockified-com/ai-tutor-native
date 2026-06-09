import { NextRequest, NextResponse } from 'next/server';
import { requireUser, HttpError } from '@/shared/auth/current-user';
import { verifyResultEvent } from '@/shared/lib/result-events';
import { countUnderstandingAttempts, insertUnderstandingAttempt, insertQuestion } from '@/shared/db/queries';

// Import the cache from ask route
import { askMintCache } from '../../enrollments/[id]/ask/route';

interface UnderstandingCheckPayload {
  level: string;
  passed: boolean;
  feedback: string;
  missing_points: string[];
}

interface AskPayload {
  question: string;
  answer: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { kind, blob, enrollmentId, blockId, response, question, attemptNumber, session_token } = body;

    const payload = await verifyResultEvent<UnderstandingCheckPayload | AskPayload>(blob);

    if (kind === 'understanding-check') {
      const ucPayload = payload as UnderstandingCheckPayload;
      const attemptNum = attemptNumber ?? (await countUnderstandingAttempts(enrollmentId, blockId!) + 1);

      await insertUnderstandingAttempt({
        enrollmentId,
        blockId: blockId!,
        response: response ?? '',
        level: ucPayload.level,
        feedback: ucPayload.feedback,
        passed: ucPayload.passed,
        missingPoints: ucPayload.missing_points ?? [],
        attemptNumber: attemptNum,
      });

      return NextResponse.json({
        ok: true,
        passed: ucPayload.passed,
        level: ucPayload.level,
        feedback: ucPayload.feedback,
      });
    }

    if (kind === 'ask') {
      const askPayload = payload as AskPayload;
      const cacheEntry = session_token ? askMintCache.get(session_token) : undefined;

      await insertQuestion({
        enrollmentId,
        blockId: cacheEntry?.blockId ?? blockId ?? null,
        questionText: askPayload.question,
        answerText: askPayload.answer,
        sourceChunks: cacheEntry?.chunkIds ?? null,
      });

      if (session_token) {
        askMintCache.delete(session_token);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}