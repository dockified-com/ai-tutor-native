'use server';

import { apiFetch } from '@/shared/api/client';
import { auth } from '@clerk/nextjs/server';

export async function markBlockComplete(blockId: string, enrollmentId: string) {
  const { getToken } = await auth();
  const token = await getToken();
  
  await apiFetch(`/api/progress/blocks/${blockId}/complete`, {
    method: 'POST',
    token,
    body: JSON.stringify({ enrollment_id: enrollmentId }),
  });
}
