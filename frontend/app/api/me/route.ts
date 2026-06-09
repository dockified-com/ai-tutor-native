import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({ clerk_user_id: user.clerkUserId, email: user.email, display_name: user.displayName, role: user.role });
}
