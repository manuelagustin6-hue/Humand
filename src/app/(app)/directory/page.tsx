import { getTranslations } from "next-intl/server";
import AppShell from "@/components/layout/AppShell";
import DirectoryClient from "@/components/directory/DirectoryClient";

export default async function DirectoryPage() {
  const t = await getTranslations("directory");
  return (
    <AppShell title={t("title")}>
      <DirectoryClient />
    </AppShell>
  );
}
