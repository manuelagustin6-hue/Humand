import { getTranslations } from "next-intl/server";
import AppShell from "@/components/layout/AppShell";
import RecognitionsClient from "@/components/recognitions/RecognitionsClient";

export default async function RecognitionsPage() {
  const t = await getTranslations("recognitions");
  return (
    <AppShell title={t("title")}>
      <RecognitionsClient />
    </AppShell>
  );
}
