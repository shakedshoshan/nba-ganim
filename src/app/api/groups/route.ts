import { createClient } from "@/utils/supabase/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const MAX_ATTEMPTS = 8;

type CreateGroupRow = {
  group_id: string;
  invite_code: string;
  group_name: string;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : "";

  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const invite = randomBytes(9).toString("base64url").slice(0, 12);

    const { data, error } = await supabase.rpc("create_group_with_owner", {
      p_name: name,
      p_invite: invite,
    });

    if (!error && data?.length) {
      const row = data[0] as CreateGroupRow;
      return NextResponse.json({
        id: row.group_id,
        invite_code: row.invite_code,
        name: row.group_name,
      });
    }

    const msg = error?.message ?? "";
    const isUniqueViolation =
      error?.code === "23505" || msg.includes("duplicate key");
    if (isUniqueViolation) {
      continue;
    }

    return NextResponse.json(
      { error: msg || "Failed to create group" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { error: "Could not allocate a unique invite code" },
    { status: 500 },
  );
}
