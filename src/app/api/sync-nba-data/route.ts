import { runNbaDataSync } from "@/lib/nba/run-sync";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export const maxDuration = 60;

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const result = await runNbaDataSync(admin);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, errors: [message] },
      { status: 500 },
    );
  }
}
