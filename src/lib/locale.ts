import { cookies } from "next/headers";

export async function getLocaleFromCookies(): Promise<string> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value ?? "es";
  return ["es", "en"].includes(locale) ? locale : "es";
}
