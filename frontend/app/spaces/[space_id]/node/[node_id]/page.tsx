import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserMenu } from "@/features/auth";
import { NodePage } from "@/features/spaces";

export default async function NodeRoute(props: {
  params: Promise<{ space_id: string; node_id: string }>;
}) {
  const params = await props.params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <NodePage spaceId={params.space_id} nodeId={params.node_id} userMenu={<UserMenu />} />;
}