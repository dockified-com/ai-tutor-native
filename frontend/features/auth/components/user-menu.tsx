"use client";

import { UserButton } from "@clerk/nextjs";
import { useAppUser } from "../hooks/use-app-user";

export function UserMenu() {
  const { user } = useAppUser();
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700">
        {user ? user.display_name ?? user.email : "…"}
      </span>
      <UserButton />
    </div>
  );
}
