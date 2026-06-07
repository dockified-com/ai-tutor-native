import { UserMenu } from "@/features/auth";
import { SpacesPage } from "@/features/spaces";

export default function DashboardPage() {
  return <SpacesPage userMenu={<UserMenu />} />;
}
