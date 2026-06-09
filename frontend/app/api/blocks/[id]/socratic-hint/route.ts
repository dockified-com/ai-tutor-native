import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireEnrollmentOwnership, HttpError } from '@/shared/auth/current-user';
import { getLastCodeSubmission } from '@/shared/db/queries';
import { getBlockContentScoped } from '@/shared/db/queries';
import { mintSession, aiServerPublicUrl } from '@/shared/api/ai-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: blockId } = await params;
    const user = await requireUser();
    const body = await req.json();
    const { enrollmentId } = body;

    const { courseId } = await requireEnrollmentOwnership(enrollmentId, user.id);

    const sub = await getLastCodeSubmission(enrollmentId, blockId);
    if (!sub) {
      return NextResponse.json({ error: 'No code submission found' }, { status: 404 });
    }

    const content = await getBlockContentScoped(blockId, courseId);
    if (!content) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    const contentObj = content as Record<string, unknown>;
    const serverContext = {
      problem_prompt: (contentObj.prompt as string) || '',
      student_code: sub.code,
      stdout: sub.stdout || '',
      stderr: sub.stderr || '',
      attempt_count: sub.attemptNumber,
    };

    const { session_token, expires_in } = await mintSession('socratic', serverContext);

    return NextResponse.json({
      ai_url: aiServerPublicUrl + '/v1/reason',
      session_token,
      expires_in,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}