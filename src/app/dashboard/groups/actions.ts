"use server";

import {
  ACTIVE_GROUP_COOKIE,
  activeGroupCookieOptions,
  resolveActiveGroupId,
} from "@/lib/groups/active-group";
import { generateInviteCodeCandidate } from "@/lib/groups/invite-code";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const MAX_INVITE_ATTEMPTS = 8;

export type GroupActionState = { error: string | null };

export async function setActiveGroupId(groupId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .maybeSingle();

  if (!data) {
    return { error: "You are not in that group." };
  }

  cookieStore.set(ACTIVE_GROUP_COOKIE, groupId, activeGroupCookieOptions);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function createGroup(
  _prev: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard/groups/new");
  }

  const raw = formData.get("name");
  const name =
    typeof raw === "string" ? raw.trim() : "";
  if (!name || name.length > 200) {
    return { error: "Enter a group name (1–200 characters)." };
  }

  for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
    const invite = generateInviteCodeCandidate();
    const { data, error } = await supabase.rpc("create_group_with_owner", {
      p_name: name,
      p_invite: invite,
    });

    if (!error && data?.length) {
      const row = data[0] as {
        group_id: string;
        invite_code: string;
        group_name: string;
      };
      cookieStore.set(ACTIVE_GROUP_COOKIE, row.group_id, activeGroupCookieOptions);
      revalidatePath("/dashboard");
      redirect(`/dashboard/groups/${row.group_id}`);
    }

    const msg = error?.message ?? "";
    const isUniqueViolation =
      error?.code === "23505" || msg.toLowerCase().includes("duplicate");
    if (isUniqueViolation) {
      continue;
    }

    return { error: msg || "Could not create group." };
  }

  return { error: "Could not allocate a unique invite code." };
}

export async function leaveGroupFormAction(
  _prev: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
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
    redirect("/login");
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const { data: remaining } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const orderedIds = (remaining ?? []).map((r) => r.group_id);
  const nextActive = resolveActiveGroupId(undefined, orderedIds);
  if (nextActive) {
    cookieStore.set(ACTIVE_GROUP_COOKIE, nextActive, activeGroupCookieOptions);
  } else {
    cookieStore.delete(ACTIVE_GROUP_COOKIE);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/groups");
  redirect("/dashboard/groups");
}

export async function renameGroup(
  groupId: string,
  _prev: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const raw = formData.get("name");
  const name =
    typeof raw === "string" ? raw.trim() : "";
  if (!name || name.length > 200) {
    return { error: "Invalid name." };
  }

  const { error } = await supabase.rpc("rename_group", {
    p_group_id: groupId,
    p_name: name,
  });

  if (error) {
    return {
      error:
        error.message.includes("forbidden") || error.message.includes("403")
          ? "Only the group creator can rename the group."
          : error.message,
    };
  }

  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/dashboard/groups");
  return { error: null };
}

export async function regenerateGroupInvite(groupId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt++) {
    const invite = generateInviteCodeCandidate();
    const { error } = await supabase.rpc("set_group_invite_code", {
      p_group_id: groupId,
      p_invite: invite,
    });

    if (!error) {
      revalidatePath(`/dashboard/groups/${groupId}`);
      return { error: null as string | null };
    }

    const msg = error.message ?? "";
    const isUniqueViolation =
      error.code === "23505" || msg.toLowerCase().includes("duplicate");
    if (isUniqueViolation) {
      continue;
    }

    return {
      error:
        msg.includes("forbidden") || msg.includes("exception")
          ? "Only the group creator can regenerate the invite link."
          : msg,
    };
  }

  return { error: "Could not allocate a unique invite code." };
}

export async function removeGroupMember(groupId: string, memberUserId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("remove_group_member", {
    p_group_id: groupId,
    p_user_id: memberUserId,
  });

  if (error) {
    return {
      error:
        error.message.includes("forbidden") ||
        error.message.includes("not authenticated")
          ? "Only the group creator can remove members."
          : error.message,
    };
  }

  revalidatePath(`/dashboard/groups/${groupId}`);
  return { error: null as string | null };
}
