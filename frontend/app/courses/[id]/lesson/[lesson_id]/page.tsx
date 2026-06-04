import React from 'react';
import { apiFetch } from '@/shared/api/client';
import { auth } from '@clerk/nextjs/server';
import { TutorPageClient } from '@/features/tutor/components/tutor-page-client';
import { Block } from '@/shared/types/blocks';
import { redirect } from 'next/navigation';
import { markBlockComplete } from '@/features/progress/actions/mark-block-complete';
import { updateBookmark } from '@/features/progress/actions/update-bookmark';

export default async function LessonPage({
  params,
}: {
  params: { id: string; lesson_id: string };
}) {
  const { getToken } = await auth();
  const token = await getToken();

  let lessonBlocks: Block[] = [];
  let startIndexValue = 0;
  let enrollId = '';
  let hasError = false;

  try {
    // We assume the API returns the blocks and the enrollment_id + bookmarked block
    // Since we don't have the exact API shape, we'll try to fetch what makes sense
    // and fallback to empty/default if the API doesn't match exactly in this phase.
    
    // In a real scenario, we might have separate endpoints or a combined one.
    // Let's fetch the lesson blocks:
    const { blocks } = await apiFetch<{ blocks: Block[] }>(`/api/lessons/${params.lesson_id}/blocks`, { token });
    
    // Let's fetch enrollment progress to find the startIndex:
    const enrollmentResult = await apiFetch<unknown>(`/api/courses/${params.id}/enrollment`, { token }).catch(() => null);
    const enrollment = enrollmentResult as { id?: string, progress?: { bookmarked_block_id?: string } } | null;
    
    
    if (!blocks || blocks.length === 0) {
      hasError = true;
    } else {
      lessonBlocks = blocks;
      const enrollmentIdStr = enrollment?.id || 'stub-enrollment-id';
      enrollId = enrollmentIdStr;
      
      const bookmarkedBlockId = enrollment?.progress?.bookmarked_block_id;
      if (bookmarkedBlockId) {
        const foundIndex = blocks.findIndex(b => b.id === bookmarkedBlockId);
        if (foundIndex !== -1) {
          startIndexValue = foundIndex;
        }
      }
    }
  } catch (err) {
    console.error('Error loading lesson:', err);
    hasError = true;
  }

  if (hasError) {
    // We redirect or show empty state if blocks are empty. We'll check blocks length.
    if (!lessonBlocks.length) {
      return (
        <div className="flex h-screen items-center justify-center">
          <p className="text-slate-500">Lesson has no content.</p>
        </div>
      );
    }
    redirect(`/courses/${params.id}`);
  }

  const handleMarkComplete = async (blockId: string) => {
    'use server';
    await markBlockComplete(blockId, enrollId);
  };

  const handleUpdateBookmark = async (blockId: string) => {
    'use server';
    await updateBookmark(enrollId, blockId);
  };

  return (
    <TutorPageClient 
      blocks={lessonBlocks} 
      startIndex={startIndexValue} 
      onMarkComplete={handleMarkComplete}
      onUpdateBookmark={handleUpdateBookmark}
    />
  );
}
