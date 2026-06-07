"use client";
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
import { useSpaces } from "../hooks/use-spaces";
import type { Space } from "../types";

export function SpacesPage() {
  const { owned, joined } = useSpaces();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);

  function handleCreated(space: Space) {
    setCreateOpen(false);
    owned.mutate([...owned.spaces, space], false);
    setShareCode(space.share_code);
  }

  function handleJoined(space: Space) {
    setJoinOpen(false);
    joined.mutate([...joined.spaces, space], false);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SpacesHeader onJoinOpen={() => setJoinOpen(true)} />

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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {owned.spaces.map((s) => (
                  <SpaceCardOwned key={s.id} space={s} onShareCode={setShareCode} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared">
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {joined.spaces.map((s) => (
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

function EmptyState({ message, action }: { message: string; action: React.ReactNode }) {
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