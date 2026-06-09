import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/shared/db/client";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser() {
  const { userId } = await auth();
  if (!userId) throw new HttpError(401, "Unauthorized");

  let user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? `${userId}@unknown.local`;
    const displayName = clerkUser?.fullName ?? null;
    user = await prisma.user.create({
      data: { clerkUserId: userId, email, displayName, role: "student" },
    });
  }
  return user;
}

export async function requireEnrollmentOwnership(enrollmentId: string, userId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) throw new HttpError(404, "Enrollment not found");
  if (enrollment.userId !== userId) throw new HttpError(403, "Forbidden");
  return { courseId: enrollment.courseId };
}