export async function runCode(blockId: string, code: string) {
  const response = await fetch(`/api/blocks/${blockId}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to run code');
  }
  
  return response.json();
}
