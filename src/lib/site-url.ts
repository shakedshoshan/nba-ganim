import { headers } from "next/headers";

/** Base URL for shareable links (join URL). Prefer NEXT_PUBLIC_SITE_URL in production. */
export async function getPublicSiteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) {
    const safeProto = proto === "https" ? "https" : "http";
    return `${safeProto}://${host}`;
  }
  return "http://localhost:3000";
}
