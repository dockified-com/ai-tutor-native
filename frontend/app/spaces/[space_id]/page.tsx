import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserMenu } from "@/features/auth";
import { SpaceOverviewPage } from "@/features/spaces";

export default async function SpaceOverviewRoute(props: {
  params: Promise<{ space_id: string }>;
}) {
  const params = await props.params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <SpaceOverviewPage spaceId={params.space_id} userMenu={<UserMenu />} />;
}