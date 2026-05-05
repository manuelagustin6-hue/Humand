"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function switchLocale(locale: string) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1 px-3 py-1.5">
      <Globe className="w-4 h-4 text-brand-300 shrink-0" />
      <button
        onClick={() => switchLocale("es")}
        className="text-xs text-brand-300 hover:text-white px-1 transition-colors"
      >
        ES
      </button>
      <span className="text-brand-600 text-xs">/</span>
      <button
        onClick={() => switchLocale("en")}
        className="text-xs text-brand-300 hover:text-white px-1 transition-colors"
      >
        EN
      </button>
    </div>
  );
}
