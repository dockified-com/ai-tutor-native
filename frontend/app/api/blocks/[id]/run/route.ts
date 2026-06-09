import "server-only";
import { NextResponse } from "next/server";
import { requireUser, requireEnrollmentOwnership, HttpError } from "@/shared/auth/current-user";
import { getCodeBlock, countCodeSubmissions, insertCodeSubmission } from "@/shared/db/queries";
import { executeCode, evaluateVerdict } from "@/shared/lib/judge0";
import { runAgent } from "@/shared/api/ai-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: blockId } = await params;
    const user = await requireUser();
    const body = await request.json();
    const { code, enrollmentId, language } = body;

    if (!enrollmentId || !language) {
      throw new HttpError(400, "Missing enrollmentId or language");
    }

    await requireEnrollmentOwnership(enrollmentId, user.id);

    const block = await getCodeBlock(blockId);
    if (!block) {
      throw new HttpError(404, "Code block not found");
    }

    const attemptNumber = await countCodeSubmissions(enrollmentId, blockId) + 1;
    const result = await executeCode(code, language);
    const blockContent = block.content as Record<string, unknown>;
    const expectedOutput = typeof blockContent.expected_output === "string" ? blockContent.expected_output : null;
    let verdict = evaluateVerdict(result, expectedOutput);

    if (verdict === "needs_ai_eval") {
      const prompt = `Problem: ${blockContent.prompt}\n\nStudent code:\n\`\`\`\n${code}\n\`\`\`\n\nstdout: ${result.stdout ?? "(none)"}\n\nIs this correct?`;
      const { text } = await runAgent("code-eval", prompt);
      try {
        verdict = JSON.parse(text).verdict === "passed" ? "passed" : "failed";
      } catch {
        verdict = "failed";
      }
    }

    const submission = await insertCodeSubmission({
      enrollmentId,
      blockId,
      code,
      language,
      stdout: result.stdout ?? undefined,
      stderr: result.stderr ?? undefined,
      verdict,
      attemptNumber,
    });

    return NextResponse.json({
      submission_id: submission.id,
      verdict,
      stdout: result.stdout,
      stderr: result.stderr,
      attempt_number: attemptNumber,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("run code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}