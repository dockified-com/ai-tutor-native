"use client";
import { useState, useRef } from "react";
import { CategoryRow } from "./category-row";
import { reorderCategories } from "../actions/reorder-categories";
import type { Category } from "../types";

interface Props {
  categories: Category[];
  spaceId: string;
  isOwner: boolean;
  onReorder: (updated: Category[]) => void;
}

export function CategoryList({ categories, spaceId, isOwner, onReorder }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const dragOver = useRef<number | null>(null);

  if (!isOwner) {
    return (
      <div className="flex flex-col gap-3">
        {categories.map((cat) => (
          <CategoryRow key={cat.id} category={cat} spaceId={spaceId} isOwner={false} />
        ))}
      </div>
    );
  }

  function handleDragEnd() {
    if (dragging === null || dragOver.current === null || dragging === dragOver.current) {
      setDragging(null);
      return;
    }
    const reordered = [...categories];
    const [moved] = reordered.splice(dragging, 1);
    reordered.splice(dragOver.current, 0, moved);
    onReorder(reordered);
    reorderCategories(spaceId, reordered.map((c) => c.id)).catch(() => {});
    setDragging(null);
    dragOver.current = null;
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.map((cat, idx) => (
        <div
          key={cat.id}
          draggable
          onDragStart={() => setDragging(idx)}
          onDragEnter={() => {
            dragOver.current = idx;
          }}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          style={{ opacity: dragging === idx ? 0.5 : 1, transition: "opacity 0.15s" }}
        >
          <CategoryRow
            category={cat}
            spaceId={spaceId}
            isOwner
            dragHandleProps={{ draggable: false }}
          />
        </div>
      ))}
    </div>
  );
}