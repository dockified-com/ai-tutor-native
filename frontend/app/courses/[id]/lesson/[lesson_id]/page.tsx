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

  const mockBlocks: Block[] = [
    {
      id: "b1",
      type: "markdown",
      content: {
        text: "## Welcome to the AI Tutor\n\nThis is a mock lesson. Let's start by understanding how state works in React."
      }
    },
    {
      id: "b2",
      type: "mermaid",
      content: {
        code: "graph TD\n  A[State] --> B[Component]\n  B --> C[UI]"
      }
    },
    {
      id: "b3",
      type: "concept_check",
      content: {
        question: "Which of the following describes state in React?",
        options: [
          { id: "o1", text: "State is persistent across browser reloads.", is_correct: false, explanation: "State is lost on reload." },
          { id: "o2", text: "State holds data that can change over time.", is_correct: true, explanation: "Correct!" }
        ]
      }
    },
    {
      id: "b4",
      type: "code",
      content: {
        starter_code: "function App() { return <div />; }"
      }
    }
  ];

  try {
    // For testing, we just use mock blocks directly
    lessonBlocks = mockBlocks as Block[];
    enrollId = 'test-enrollment-id';
    hasError = false;
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
