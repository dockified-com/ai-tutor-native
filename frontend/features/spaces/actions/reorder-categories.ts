"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";

export async function reorderCategories(spaceId: string, orderedIds: string[]): Promise<void> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  await apiFetch<void>(`/api/spaces/${spaceId}/categories/reorder`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}