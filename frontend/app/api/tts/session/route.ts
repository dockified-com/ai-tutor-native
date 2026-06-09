import { auth } from "@clerk/nextjs/server";
import { mintSession, aiServerPublicUrl } from "@/shared/api/ai-server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { session_token } = await mintSession("ask", {});
  return Response.json({ ai_url: `${aiServerPublicUrl}/v1/speak`, session_token });
}
