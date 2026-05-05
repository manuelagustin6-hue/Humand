import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import EventsClient from "@/components/events/EventsClient";

export default async function EventsPage() {
  const t = await getTranslations("events");
  const session = await getServerSession(authOptions);
  const role = (session!.user as { role: string }).role;

  return (
    <AppShell title={t("title")}>
      <EventsClient canCreate={["ADMIN", "MANAGER"].includes(role)} />
    </AppShell>
  );
}
