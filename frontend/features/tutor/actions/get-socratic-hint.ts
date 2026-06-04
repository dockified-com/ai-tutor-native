export function getSocraticHintConfig(blockId: string) {
  return {
    url: `/api/blocks/${blockId}/socratic-hint`,
    options: {
      method: 'POST',
    },
  };
}
