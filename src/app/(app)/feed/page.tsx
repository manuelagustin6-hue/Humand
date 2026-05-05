import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import AppShell from "@/components/layout/AppShell";
import FeedClient from "@/components/feed/FeedClient";

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("feed");

  return (
    <AppShell title={t("title")}>
      <FeedClient currentUserId={session!.user.id} currentUserRole={(session!.user as { role: string }).role} />
    </AppShell>
  );
}
