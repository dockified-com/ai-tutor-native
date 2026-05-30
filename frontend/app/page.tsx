import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-3">AI Tutor</h1>
      <p className="text-gray-600 mb-8">An AI-native programming tutor.</p>
      <div className="flex gap-3">
        <a href="/sign-in" className="px-4 py-2 rounded-lg bg-gray-900 text-white">
          Sign in
        </a>
        <a href="/sign-up" className="px-4 py-2 rounded-lg border border-gray-300">
          Sign up
        </a>
      </div>
    </main>
  );
}
