import "server-only";

const AI_SERVER_URL = process.env.AI_SERVER_URL!;
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET!;

function headers() {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${AI_SERVICE_SECRET}`,
  };
}

export async function mintSession(agent: string, serverContext: unknown): Promise<{ session_token: string; expires_in: number }> {
  const res = await fetch(`${AI_SERVER_URL}/v1/session`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ agent, server_context: serverContext }),
  });
  if (!res.ok) throw new Error(`session mint failed: ${res.status}`);
  return res.json();
}

export async function runAgent(agent: string, userMessage: string): Promise<{ text: string }> {
  const res = await fetch(`${AI_SERVER_URL}/v1/run`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ agent, user_message: userMessage }),
  });
  if (!res.ok) throw new Error(`run failed: ${res.status}`);
  return res.json();
}

export async function embedTexts(texts: string[]): Promise<{ vectors: number[][] }> {
  const res = await fetch(`${AI_SERVER_URL}/v1/embed`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status}`);
  return res.json();
}

export const aiServerPublicUrl = AI_SERVER_URL;