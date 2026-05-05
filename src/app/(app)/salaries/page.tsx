import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import SalariesClient from "@/components/salaries/SalariesClient";

export default async function SalariesPage() {
  const t = await getTranslations("salaries");
  const session = await getServerSession(authOptions);
  const role = (session!.user as { role: string }).role;

  return (
    <AppShell title={t("title")}>
      <SalariesClient isAdmin={role === "ADMIN"} currentUserId={session!.user.id} />
    </AppShell>
  );
}
