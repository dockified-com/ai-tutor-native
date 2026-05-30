import { UserMenu } from "@/features/auth";
import { AppShell } from "@/shared/components/app-shell";

export default function DashboardPage() {
  return (
    <AppShell header={<UserMenu />}>
      <div className="px-6 py-12 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">My courses</h1>
        <p className="text-gray-600 mb-8">
          Create your first course or join one with a code.
        </p>

        <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center">
          <p className="text-gray-500">No courses yet.</p>
        </div>
      </div>
    </AppShell>
  );
}
