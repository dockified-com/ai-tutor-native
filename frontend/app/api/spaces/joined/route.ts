import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  const rows = await prisma.$queryRaw<Array<{ id: string; title: string | null; description: string | null; code: string | null }>>`
    SELECT c.id, c.title, c.description, c.code
    FROM enrollments e JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ${user.id}::uuid AND c.creator_id != ${user.id}::uuid
  `;
  return NextResponse.json(rows.map(c => ({ id: c.id, name: c.title ?? "Untitled", description: c.description ?? null, share_code: c.code ?? "", owner_name: null, progress_pct: null })));
}
