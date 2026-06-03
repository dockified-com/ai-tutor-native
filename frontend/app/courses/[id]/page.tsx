import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/shared/api/client";
import { CourseStatusBadge, CourseStatus } from "@/features/courses/components/course-status-badge";
import { GenerationStatus } from "@/features/authoring";
import { RoleGuard } from "@/features/auth";
import { AppShell } from "@/shared/components/app-shell";
import { UserMenu } from "@/features/auth";
import { Play } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  block_count: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  current_phase?: string;
  total_lessons?: number;
  lessons?: Lesson[];
}

export default async function CourseDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { getToken, userId } = await auth();
  if (!userId) redirect("/sign-in");

  const token = await getToken();
  let course: Course | null = null;

  try {
    // Note: In reality this would hit a FastAPI endpoint returning the course details
    // course = await apiFetch<Course>(`/api/courses/${params.id}`, { token });
    
    // For V1 UI development without full backend, we will mock the response if the fetch fails
    course = await apiFetch<Course>(`/api/courses/${params.id}`, { token }).catch(() => ({
      id: params.id,
      title: "Introduction to Rust",
      description: "A comprehensive guide to Rust programming.",
      status: "ready" as CourseStatus, // Change to "draft" or "generating" to test those states
      lessons: [
        { id: "l1", title: "Why Rust?", block_count: 5 },
        { id: "l2", title: "Ownership and Borrowing", block_count: 12 },
      ]
    }));
  } catch {
    return (
      <AppShell header={<UserMenu />}>
        <div className="p-8 text-center text-red-600">Failed to load course</div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell header={<UserMenu />}>
        <div className="p-8 text-center">Course not found</div>
      </AppShell>
    );
  }

  // Derived display states
  
  // For students, handle redirects and access gating early
  const userResponse = await apiFetch<{ role: "creator" | "student" }>("/api/me", { token }).catch(() => ({ role: "creator" }));
  const isStudent = userResponse.role === "student";

  if (isStudent) {
    if (course.status === "published" && course.lessons?.[0]) {
      redirect(`/courses/${course.id}/lesson/${course.lessons[0].id}`);
    }
    if (course.status !== "published") {
      return (
        <AppShell header={<UserMenu />}>
          <div className="max-w-3xl mx-auto py-12 px-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Not Available Yet</h2>
            <p className="text-slate-600">This course is not yet published. Please check back later.</p>
          </div>
        </AppShell>
      );
    }
  }

  if (course.status === "draft" || course.status === "generating") {
    return (
      <AppShell header={<UserMenu />}>
        <div className="max-w-3xl mx-auto py-12 px-6">
          <GenerationStatus 
            currentPhase={course.current_phase || "extracting_pdf"} 
            totalLessons={course.total_lessons || 5} 
          />
        </div>
      </AppShell>
    );
  }

  if (course.status === "failed") {
    return (
      <AppShell header={<UserMenu />}>
        <div className="max-w-3xl mx-auto py-12 px-6">
          <div className="bg-red-50 text-red-700 p-8 rounded-xl border border-red-200 text-center">
            <h2 className="text-xl font-semibold mb-2">Course Generation Failed</h2>
            <p className="mb-6">There was an error generating this course. Please try again.</p>
            <Link 
              href="/courses/new" 
              className="inline-flex px-6 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700"
            >
              Regenerate Course
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<UserMenu />}>
      <div className="max-w-4xl mx-auto py-12 px-6">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <CourseStatusBadge status={course.status} />
            <RoleGuard allowedRoles={["creator"]}>
              <div className="flex gap-3">
                <Link 
                  href={`/courses/${course.id}/preview`}
                  className="px-4 py-2 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Preview
                </Link>
                {course.status === "ready" && (
                  <form action={async () => {
                    "use server";
                    // Stub for publish action
                    console.log("Publishing course", course?.id);
                  }}>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 transition-colors">
                      Publish
                    </button>
                  </form>
                )}
              </div>
            </RoleGuard>
          </div>
          <h1 className="text-3xl font-bold font-serif text-slate-900 mb-2">{course.title}</h1>
          <p className="text-slate-600 text-lg">{course.description}</p>
        </header>

        {course.status === "published" && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-xl mb-10 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">This course is live</h3>
              <p className="text-emerald-700 text-sm mt-1">Students can now join and learn.</p>
            </div>
            <Link 
              href={`/courses/${course.id}/lesson/${course.lessons?.[0]?.id || '1'}`}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-full font-medium hover:bg-emerald-700 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Learning
            </Link>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-6">Curriculum</h2>
          <div className="space-y-4">
            {course.lessons?.map((lesson, idx) => (
              <div key={lesson.id} className="p-5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-serif font-medium text-slate-900">{lesson.title}</h3>
                    <p className="text-sm text-slate-500">{lesson.block_count} interactive blocks</p>
                  </div>
                </div>
                <div className="text-sm font-medium text-emerald-600">Ready</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
