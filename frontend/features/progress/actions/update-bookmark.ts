'use server';

import { apiFetch } from '@/shared/api/client';
import { auth } from '@clerk/nextjs/server';

export async function updateBookmark(enrollmentId: string, blockId: string) {
  const { getToken } = await auth();
  const token = await getToken();
  
  await apiFetch(`/api/enrollments/${enrollmentId}/bookmark`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ block_id: blockId }),
  });
}
