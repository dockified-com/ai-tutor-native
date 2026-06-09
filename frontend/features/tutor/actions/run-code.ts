export async function runCode(blockId: string, code: string, enrollmentId: string, language: string = "python") {
  const response = await fetch(`/api/blocks/${blockId}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, enrollmentId, language }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to run code');
  }
  
  return response.json();
}
