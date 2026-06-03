"use client";

import { ReactNode } from "react";
import { useAppUser } from "../hooks/use-app-user";

export function RoleGuard({
  allowedRoles,
  children,
  fallback,
}: {
  allowedRoles: Array<"creator" | "student">;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, loading } = useAppUser();

  if (loading) {
    return <div className="animate-pulse h-10 bg-slate-100 rounded-md"></div>;
  }

  if (user && allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  return <>{fallback || null}</>;
}
