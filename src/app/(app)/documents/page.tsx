import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import DocumentsClient from "@/components/documents/DocumentsClient";

export default async function DocumentsPage() {
  const t = await getTranslations("documents");
  const session = await getServerSession(authOptions);
  const role = (session!.user as { role: string }).role;

  return (
    <AppShell title={t("title")}>
      <DocumentsClient canUpload={["ADMIN", "MANAGER"].includes(role)} />
    </AppShell>
  );
}
