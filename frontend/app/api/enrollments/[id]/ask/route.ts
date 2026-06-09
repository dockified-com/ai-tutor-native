import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireEnrollmentOwnership, HttpError } from '@/shared/auth/current-user';
import { getBlockContentScoped } from '@/shared/db/queries';
import { searchChunks } from '@/shared/db/rag';
import { embedTexts, mintSession, aiServerPublicUrl } from '@/shared/api/ai-server';

const askMintCache = new Map<string, { chunkIds: string[]; enrollmentId: string; blockId?: string }>();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: enrollmentId } = await params;
    const user = await requireUser();
    const { courseId } = await requireEnrollmentOwnership(enrollmentId, user.id);

    const body = await req.json();
    const { question, block_id } = body;

    const { vectors: [queryVec] } = await embedTexts([question]);
    const chunks = await searchChunks(courseId, queryVec, 5);

    let blockContext: string | null = null;
    if (block_id) {
      const content = await getBlockContentScoped(block_id, courseId);
      if (content) {
        const contentObj = content as Record<string, unknown>;
        blockContext = ((contentObj.prompt as string) || (contentObj.text as string) || null);
      }
    }

    const serverContext = {
      chunks: chunks.map(c => c.content),
      block_context: blockContext,
    };

    const { session_token, expires_in } = await mintSession('ask', serverContext);

    askMintCache.set(session_token, {
      chunkIds: chunks.map(c => c.id),
      enrollmentId,
      blockId: block_id ?? undefined,
    });

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

export { askMintCache };