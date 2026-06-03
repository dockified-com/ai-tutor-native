"use client";

import { useSignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  if (signUp?.status === "complete" || isSignedIn) {
    // If complete or already signed in, we render nothing and let Clerk redirect
    return null;
  }

  const isVerifying =
    signUp?.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const handleSubmit = async (formData: FormData) => {
    const emailAddress = formData.get("email") as string;
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;

    const { error } = await signUp.create({
      emailAddress,
      password,
      firstName: firstName || undefined,
    });

    if (error) {
      console.error(error);
      return;
    }

    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async (formData: FormData) => {
    const code = formData.get("code") as string;

    await signUp.verifications.verifyEmailCode({ code });

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          const destination = session?.currentTask ? `/sign-up/tasks/${session.currentTask.key}` : "/dashboard";
          const url = decorateUrl(destination);
          if (url.startsWith("http")) window.location.href = url;
          else router.push(url);
        },
      });
    }
  };

  const handleResendCode = async () => {
    await signUp.verifications.sendEmailCode();
  };

  const isFetching = fetchStatus === "fetching";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2 font-sans text-center">
            {isVerifying ? "Check your email" : "Create your account"}
          </h1>
          <p className="text-slate-600 mb-8 text-center text-sm">
            {isVerifying
              ? "We've sent a verification code to your email."
              : "Sign up to get started with AI Tutor"}
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

          {isVerifying ? (
            <div className="space-y-5">
              <form action={handleVerify} className="space-y-5">
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
                  Verify Account
                </button>
              </form>
              <div className="text-center">
                <button 
                  onClick={handleResendCode}
                  className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
                >
                  Resend verification code
                </button>
              </div>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                  First Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="w-full px-4 py-2 border border-slate-200 rounded-md bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-colors"
                  placeholder="Jane"
                />
                {errors?.fields?.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fields.firstName.message}</p>
                )}
              </div>
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
                {errors?.fields?.emailAddress && (
                  <p className="mt-1 text-sm text-red-600">{errors.fields.emailAddress.message}</p>
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
                Sign Up
              </button>
            </form>
          )}

          <div id="clerk-captcha" />
        </div>
        
        {!isVerifying && (
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 text-center text-sm">
            <span className="text-slate-600">Already have an account? </span>
            <Link href="/sign-in" className="text-emerald-600 font-medium hover:text-emerald-700">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
