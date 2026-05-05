import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import RequestsClient from "@/components/requests/RequestsClient";

export default async function RequestsPage() {
  const t = await getTranslations("requests");
  const session = await getServerSession(authOptions);
  const role = (session!.user as { role: string }).role;

  return (
    <AppShell title={t("title")}>
      <RequestsClient
        currentUserId={session!.user.id}
        isManagerOrAdmin={["ADMIN", "MANAGER"].includes(role)}
      />
    </AppShell>
  );
}
