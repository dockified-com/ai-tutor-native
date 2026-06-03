"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    const emailAddress = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn.password({
      identifier: emailAddress,
      password,
    });

    if (error) {
      console.error(error);
      return;
    }

    if (signIn.status === "needs_second_factor") {
      await signIn.mfa.sendEmailCode();
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          const destination = session?.currentTask ? `/sign-in/tasks/${session.currentTask.key}` : "/dashboard";
          const url = decorateUrl(destination);
          if (url.startsWith("http")) window.location.href = url;
          else router.push(url);
        },
      });
    }
  };

  const handleMFAVerification = async (formData: FormData) => {
    const code = formData.get("code") as string;
    
    await signIn.mfa.verifyEmailCode({ code });

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          const destination = session?.currentTask ? `/sign-in/tasks/${session.currentTask.key}` : "/dashboard";
          const url = decorateUrl(destination);
          if (url.startsWith("http")) window.location.href = url;
          else router.push(url);
        },
      });
    }
  };

  const isFetching = fetchStatus === "fetching";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2 font-sans text-center">
            {signIn?.status === "needs_second_factor" ? "Verify your identity" : "Welcome back"}
          </h1>
          <p className="text-slate-600 mb-8 text-center text-sm">
            {signIn?.status === "needs_second_factor" 
              ? "We've sent a verification code to your email." 
              : "Sign in to continue to AI Tutor"}
          </p>

          {errors?.global && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
              {errors.global[0]?.message}
            </div>
          )}
          {errors?.raw && !errors.global && !errors.fields && (
             <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                An unexpected error occurred.
             </div>
          )}

          {signIn?.status === "needs_second_factor" ? (
            <form action={handleMFAVerification} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-md bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-colors"
                  placeholder="123456"
                />
                {errors?.fields?.code && (
                  <p className="mt-1 text-sm text-red-600">{errors.fields.code.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isFetching}
                className="w-full bg-emerald-600 text-white font-medium py-2.5 rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                {isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify Code
              </button>
            </form>
          ) : (
            <form action={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-md bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-colors"
                  placeholder="you@example.com"
                />
                {errors?.fields?.identifier && (
                  <p className="mt-1 text-sm text-red-600">{errors.fields.identifier.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-md bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-colors"
                  placeholder="••••••••"
                />
                {errors?.fields?.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.fields.password.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isFetching}
                className="w-full bg-emerald-600 text-white font-medium py-2.5 rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                {isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </button>
            </form>
          )}
        </div>
        
        {signIn?.status !== "needs_second_factor" && (
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 text-center text-sm">
            <span className="text-slate-600">Don&apos;t have an account? </span>
            <Link href="/sign-up" className="text-emerald-600 font-medium hover:text-emerald-700">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
