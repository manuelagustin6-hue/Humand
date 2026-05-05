import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import ChatClient from "@/components/chat/ChatClient";

export default async function ChatPage() {
  const t = await getTranslations("chat");
  const session = await getServerSession(authOptions);

  return (
    <AppShell title={t("title")}>
      <ChatClient currentUserId={session!.user.id} currentUserName={session!.user.name ?? ""} />
    </AppShell>
  );
}
