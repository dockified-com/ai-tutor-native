export function getRoastConfig(blockId: string, code: string) {
  return {
    url: `/api/blocks/${blockId}/roast`,
    options: {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  };
}
