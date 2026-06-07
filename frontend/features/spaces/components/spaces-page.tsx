"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-white flex flex-col">
      <SpacesHeader onJoinOpen={() => setJoinOpen(true)} userMenu={userMenu} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <Tabs defaultValue="my-spaces">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-transparent p-0 gap-6">
              <TabsTrigger
                value="my-spaces"
                className="bg-transparent px-0 pb-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none rounded-none text-slate-500"
              >
                My Spaces
              </TabsTrigger>
              <TabsTrigger
                value="shared"
                className="bg-transparent px-0 pb-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none rounded-none text-slate-500"
              >
                Shared With Me
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-spaces" className="mt-0">
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Plus size={16} />
                Create Space
              </Button>
            </TabsContent>
          </div>

          <TabsContent value="my-spaces">
            {owned.spaces.length > 0 && (
              <div className="mb-5">
                <FilterChips
                  options={OWNED_FILTERS}
                  active={ownedFilter}
                  onChange={setOwnedFilter}
                />
              </div>
            )}
            {owned.loading ? (
              <SpacesGridSkeleton />
            ) : owned.spaces.length === 0 ? (
              <EmptyState
                message="No spaces yet."
                action={
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <Plus size={16} /> Create your first space
                  </Button>
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
                <FilterChips
                  options={JOINED_FILTERS}
                  active={joinedFilter}
                  onChange={setJoinedFilter}
                />
              </div>
            )}
            {joined.loading ? (
              <SpacesGridSkeleton />
            ) : joined.spaces.length === 0 ? (
              <EmptyState
                message="You haven't joined any spaces yet."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setJoinOpen(true)}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1.5"
                  >
                    Join with a code
                  </Button>
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

      <CreateSpaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <JoinSpaceModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={handleJoined}
      />
      <ShareCodeModal code={shareCode} onClose={() => setShareCode(null)} />
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action: React.ReactNode | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-slate-500 text-sm">{message}</p>
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
          className="h-32 rounded-xl bg-slate-100 animate-pulse"
        />
      ))}
    </div>
  );
}