import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-3">AI Tutor</h1>
      <p className="text-gray-600 mb-8">An AI-native programming tutor.</p>
      <div className="flex gap-3">
        <Link href="/sign-in" className="px-6 py-2 border border-slate-300 rounded-md">
          Sign In
        </Link>
        <Link href="/sign-up" className="px-6 py-2 bg-emerald-600 text-white rounded-md">
          Sign up
        </Link>
      </div>
    </main>
  );
}
