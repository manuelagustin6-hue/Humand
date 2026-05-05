"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Home,
  Users,
  Calendar,
  FileText,
  Award,
  ClipboardList,
  MessageCircle,
  DollarSign,
  LogOut,
  Building2,
  X,
} from "lucide-react";
import { cn, getInitials, avatarUrl } from "@/lib/utils";
import Image from "next/image";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const navItems = [
  { href: "/feed", icon: Home, key: "feed" },
  { href: "/directory", icon: Users, key: "directory" },
  { href: "/events", icon: Calendar, key: "events" },
  { href: "/documents", icon: FileText, key: "documents" },
  { href: "/recognitions", icon: Award, key: "recognitions" },
  { href: "/requests", icon: ClipboardList, key: "requests" },
  { href: "/chat", icon: MessageCircle, key: "chat" },
  { href: "/salaries", icon: DollarSign, key: "salaries" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("nav");

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-brand-900 text-white z-30 flex flex-col transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-800" />
            </div>
            <span className="font-bold text-lg tracking-tight">HA RRHH</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-brand-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map(({ href, icon: Icon, key }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all",
                  active
                    ? "bg-brand-700 text-white"
                    : "text-brand-200 hover:bg-brand-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {t(key)}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + language */}
        <div className="border-t border-brand-700 p-3 space-y-2">
          <LanguageSwitcher />

          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-800 transition-colors"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  fill
                  className="object-cover"
                />
              ) : (
                <img
                  src={avatarUrl(session?.user?.name ?? "?")}
                  alt={session?.user?.name ?? ""}
                  className="w-full h-full"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-brand-300 truncate">
                {(session?.user as { position?: string })?.position ?? session?.user?.email}
              </p>
            </div>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-brand-200 hover:bg-brand-800 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            {t("logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
