import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BuilderPage } from "@/features/builder";

export default async function BuilderRoute(props: {
  params: Promise<{ component_id: string }>;
}) {
  const params = await props.params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <BuilderPage lessonId={params.component_id} />;
}