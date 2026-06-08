"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { Category } from "../types";

export async function addCategory(
  spaceId: string,
  name: string,
  description: string | null,
): Promise<{ category: Category }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  const category = await apiFetch<Category>(`/api/spaces/${spaceId}/categories`, {
    method: "POST",
    token,
    body: JSON.stringify({ name, description }),
  });
  return { category };
}