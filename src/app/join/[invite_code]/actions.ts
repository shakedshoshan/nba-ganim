"use server";

import {
  ACTIVE_GROUP_COOKIE,
  activeGroupCookieOptions,
} from "@/lib/groups/active-group";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type JoinGroupState = { error: string | null };

export async function joinGroup(
  inviteCode: string,
  _prev: JoinGroupState,
  formData: FormData,
): Promise<JoinGroupState> {
  const groupId = formData.get("groupId");
  if (typeof groupId !== "string" || !groupId) {
    return { error: "Missing group." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`);
  }

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
  });

  if (error) {
    const dup =
      error.code === "23505" ||
      error.message.toLowerCase().includes("duplicate");
    if (dup) {
      cookieStore.set(ACTIVE_GROUP_COOKIE, groupId, activeGroupCookieOptions);
      redirect(`/dashboard/groups/${groupId}`);
    }
    return { error: error.message };
  }

  cookieStore.set(ACTIVE_GROUP_COOKIE, groupId, activeGroupCookieOptions);
  redirect(`/dashboard/groups/${groupId}`);
}
