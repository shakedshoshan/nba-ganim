"use server";

import {
  ACTIVE_GROUP_COOKIE,
  activeGroupCookieOptions,
} from "@/lib/groups/active-group";
import { randomTestingBotAvatarUrl } from "@/lib/profiles/testingbot-avatar";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const MAX_NAME_LEN = 80;
const USERNAME_MIN = 2;
const USERNAME_MAX = 40;

export type ProfileSettingsState = { error: string | null; saved: boolean };

export type AvatarRefreshState = { error: string | null };

export async function refreshRandomAvatar(): Promise<AvatarRefreshState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  const avatar_url = randomTestingBotAvatarUrl(user.id);
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url })
    .eq("id", user.id);

  if (error) {
    return { error: error.message || "Could not update avatar." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/groups");

  return { error: null };
}

function trimToNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t.slice(0, MAX_NAME_LEN);
}

export async function updateProfileSettings(
  _prev: ProfileSettingsState,
  formData: FormData,
): Promise<ProfileSettingsState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in.", saved: false };
  }

  const firstRaw = formData.get("firstName");
  const lastRaw = formData.get("lastName");
  const userRaw = formData.get("username");
  const favRaw = formData.get("favoriteGroupId");

  const first_name =
    typeof firstRaw === "string" ? trimToNull(firstRaw) : null;
  const last_name = typeof lastRaw === "string" ? trimToNull(lastRaw) : null;

  if (typeof userRaw !== "string") {
    return { error: "Username is required.", saved: false };
  }
  const username = userRaw.trim();
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return {
      error: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`,
      saved: false,
    };
  }
  if (/\s/.test(username)) {
    return { error: "Username cannot contain spaces.", saved: false };
  }

  let favorite_group_id: string | null = null;
  if (typeof favRaw === "string" && favRaw.trim() !== "") {
    const gid = favRaw.trim();
    const { data: mem } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .eq("group_id", gid)
      .maybeSingle();
    if (!mem) {
      return {
        error: "Favorite group must be one you belong to.",
        saved: false,
      };
    }
    favorite_group_id = gid;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name,
      last_name,
      username,
      favorite_group_id,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "That username is already taken. Try another.",
        saved: false,
      };
    }
    return {
      error: error.message || "Could not save profile.",
      saved: false,
    };
  }

  if (favorite_group_id) {
    cookieStore.set(
      ACTIVE_GROUP_COOKIE,
      favorite_group_id,
      activeGroupCookieOptions,
    );
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bets");
  revalidatePath("/dashboard/groups");

  return { error: null, saved: true };
}
