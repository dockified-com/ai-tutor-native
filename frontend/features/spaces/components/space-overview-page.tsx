"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, Layout } from "lucide-react";
import { SpacesHeader } from "./spaces-header";
import { CategoryList } from "./category-list";
import { AddCategoryModal } from "./add-category-modal";
import { useSpaceOverview } from "../hooks/use-space-overview";
import type { Category } from "../types";

interface Props {
  spaceId: string;
  userMenu: ReactNode;
}

export function SpaceOverviewPage({ spaceId, userMenu }: Props) {
  const router = useRouter();
  const { overview, loading, mutate } = useSpaceOverview(spaceId);
  const [addOpen, setAddOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  void joinOpen;

  function handleAdded(category: Category) {
    if (!overview) return;
    setAddOpen(false);
    mutate({ ...overview, categories: [...overview.categories, category] }, false);
  }

  function handleReorder(updated: Category[]) {
    if (!overview) return;
    mutate({ ...overview, categories: updated }, false);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #edf5ea 0%, #d1eace 40%, #c8e6c5 100%)" }}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          style={{
            position: "absolute",
            top: "-8rem",
            left: "-8rem",
            width: "24rem",
            height: "24rem",
            borderRadius: "50%",
            opacity: 0.4,
            filter: "blur(48px)",
            background: "radial-gradient(circle, #a3d1a5, transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "33%",
            right: "-6rem",
            width: "20rem",
            height: "20rem",
            borderRadius: "50%",
            opacity: 0.3,
            filter: "blur(48px)",
            background: "radial-gradient(circle, #6ea976, transparent)",
          }}
        />
      </div>

      <SpacesHeader onJoinOpen={() => setJoinOpen(true)} userMenu={userMenu} />

      <main className="relative flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm mb-5 cursor-pointer transition-colors duration-150"
            style={{ color: "rgba(55,89,60,0.7)" }}
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </button>

          {loading ? (
            <div
              className="h-8 w-48 rounded-lg animate-pulse"
              style={{ background: "rgba(255,255,255,0.5)" }}
            />
          ) : overview ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}
                  >
                    <Layout size={14} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-[#0e2114] leading-tight">
                    {overview.title}
                  </h1>
                </div>
                {overview.description && (
                  <p className="text-sm mt-1 ml-9" style={{ color: "rgba(55,89,60,0.7)" }}>
                    {overview.description}
                  </p>
                )}
              </div>
              {overview.is_owner && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer text-white transition-all duration-200 hover:shadow-[0_4px_16px_rgba(55,89,60,0.3)] active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #6ea976, #37593c)",
                    boxShadow: "0 2px 8px rgba(110,169,118,0.35)",
                  }}
                >
                  <Plus size={15} /> Add Category
                </button>
              )}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl animate-pulse"
                style={{
                  background: "rgba(255,255,255,0.4)",
                  border: "1px solid rgba(163,209,165,0.3)",
                }}
              />
            ))}
          </div>
        ) : overview?.categories.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.35)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(163,209,165,0.4)",
            }}
          >
            <p className="text-[#37593c]/70 text-sm font-medium mb-4">No categories yet.</p>
            {overview.is_owner && (
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}
              >
                <Plus size={15} /> Add first category
              </button>
            )}
          </div>
        ) : overview ? (
          <CategoryList
            categories={overview.categories}
            spaceId={spaceId}
            isOwner={overview.is_owner}
            onReorder={handleReorder}
          />
        ) : null}
      </main>

      {overview?.is_owner && (
        <AddCategoryModal
          spaceId={spaceId}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}