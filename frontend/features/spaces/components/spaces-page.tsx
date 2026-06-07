"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpacesHeader } from "./spaces-header";
import { SpaceCardOwned } from "./space-card-owned";
import { SpaceCardJoined } from "./space-card-joined";
import { CreateSpaceModal } from "./create-space-modal";
import { JoinSpaceModal } from "./join-space-modal";
import { ShareCodeModal } from "./share-code-modal";
import { FilterChips } from "./filter-chips";
import { useSpaces } from "../hooks/use-spaces";
import type { Space } from "../types";

const OWNED_FILTERS = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
];

const JOINED_FILTERS = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

function applyOwnedFilter(spaces: Space[], filter: string): Space[] {
  if (filter === "recent") return [...spaces].slice(-5).reverse();
  return spaces;
}

function applyJoinedFilter(spaces: Space[], filter: string): Space[] {
  if (filter === "recent") return [...spaces].slice(-5).reverse();
  if (filter === "in-progress") return spaces.filter((s) => (s.progress_pct ?? 0) > 0 && (s.progress_pct ?? 0) < 100);
  if (filter === "completed") return spaces.filter((s) => (s.progress_pct ?? 0) >= 100);
  return spaces;
}

export function SpacesPage({ userMenu }: { userMenu: ReactNode }) {
  const { owned, joined } = useSpaces();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [ownedFilter, setOwnedFilter] = useState("all");
  const [joinedFilter, setJoinedFilter] = useState("all");

  function handleCreated(space: Space) {
    setCreateOpen(false);
    owned.mutate([...owned.spaces, space], false);
    setShareCode(space.share_code);
  }

  function handleJoined(space: Space) {
    setJoinOpen(false);
    joined.mutate([...joined.spaces, space], false);
  }

  const visibleOwned = applyOwnedFilter(owned.spaces, ownedFilter);
  const visibleJoined = applyJoinedFilter(joined.spaces, joinedFilter);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #edf5ea 0%, #d1eace 40%, #c8e6c5 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #a3d1a5, transparent)" }}
        />
        <div
          className="absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #6ea976, transparent)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #a3d1a5, transparent)" }}
        />
      </div>

      <SpacesHeader onJoinOpen={() => setJoinOpen(true)} userMenu={userMenu} />

      <main className="relative flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <Tabs defaultValue="my-spaces">
          <div className="flex items-center justify-between mb-6">
            {/* Glass tab bar */}
            <div
              className="flex items-center rounded-full px-1.5 py-1.5 gap-1"
              style={{
                background: "rgba(255,255,255,0.45)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(163,209,165,0.5)",
                boxShadow: "0 2px 12px rgba(110,169,118,0.12)",
              }}
            >
              <TabsList className="bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="my-spaces"
                  className="rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-200
                    text-[#37593c] data-[state=active]:text-white data-[state=active]:shadow-sm
                    data-[state=active]:bg-[#6ea976] data-[state=inactive]:hover:bg-white/50
                    data-[state=active]:shadow-[0_2px_8px_rgba(110,169,118,0.4)]"
                >
                  My Spaces
                </TabsTrigger>
                <TabsTrigger
                  value="shared"
                  className="rounded-full px-5 py-1.5 text-sm font-medium transition-all duration-200
                    text-[#37593c] data-[state=active]:text-white data-[state=active]:shadow-sm
                    data-[state=active]:bg-[#6ea976] data-[state=inactive]:hover:bg-white/50
                    data-[state=active]:shadow-[0_2px_8px_rgba(110,169,118,0.4)]"
                >
                  Shared With Me
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="my-spaces" className="mt-0">
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer
                  text-white transition-all duration-200
                  hover:shadow-[0_4px_16px_rgba(55,89,60,0.3)] active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #6ea976, #37593c)",
                  boxShadow: "0 2px 8px rgba(110,169,118,0.35)",
                }}
              >
                <Plus size={15} />
                Create Space
              </button>
            </TabsContent>
          </div>

          <TabsContent value="my-spaces">
            {owned.spaces.length > 0 && (
              <div className="mb-5">
                <FilterChips options={OWNED_FILTERS} active={ownedFilter} onChange={setOwnedFilter} />
              </div>
            )}
            {owned.loading ? (
              <SpacesGridSkeleton />
            ) : owned.spaces.length === 0 ? (
              <EmptyState
                message="No spaces yet. Create one to get started."
                action={
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white cursor-pointer
                      transition-all duration-200 hover:shadow-[0_4px_16px_rgba(55,89,60,0.3)] active:scale-95"
                    style={{ background: "linear-gradient(135deg, #6ea976, #37593c)", boxShadow: "0 2px 8px rgba(110,169,118,0.35)" }}
                  >
                    <Plus size={15} /> Create your first space
                  </button>
                }
              />
            ) : visibleOwned.length === 0 ? (
              <EmptyState message="No spaces match this filter." action={null} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleOwned.map((s) => (
                  <SpaceCardOwned key={s.id} space={s} onShareCode={setShareCode} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared">
            {joined.spaces.length > 0 && (
              <div className="mb-5">
                <FilterChips options={JOINED_FILTERS} active={joinedFilter} onChange={setJoinedFilter} />
              </div>
            )}
            {joined.loading ? (
              <SpacesGridSkeleton />
            ) : joined.spaces.length === 0 ? (
              <EmptyState
                message="You haven't joined any spaces yet."
                action={
                  <button
                    onClick={() => setJoinOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer
                      transition-all duration-200 active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.6)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(110,169,118,0.5)",
                      color: "#37593c",
                      boxShadow: "0 2px 8px rgba(110,169,118,0.15)",
                    }}
                  >
                    Join with a code
                  </button>
                }
              />
            ) : visibleJoined.length === 0 ? (
              <EmptyState message="No spaces match this filter." action={null} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleJoined.map((s) => (
                  <SpaceCardJoined key={s.id} space={s} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <CreateSpaceModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      <JoinSpaceModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={handleJoined} />
      <ShareCodeModal code={shareCode} onClose={() => setShareCode(null)} />
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action: React.ReactNode | null }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-5 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.35)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(163,209,165,0.4)",
      }}
    >
      <p className="text-[#37593c]/70 text-sm font-medium">{message}</p>
      {action}
    </div>
  );
}

function SpacesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-36 rounded-2xl animate-pulse"
          style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(163,209,165,0.3)" }}
        />
      ))}
    </div>
  );
}
