import {
  ACTIVE_GROUP_COOKIE,
  resolveActiveGroupId,
} from "@/lib/groups/active-group";
import { createClient } from "@/utils/supabase/server";
import type { cookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export type SwitcherGroupRow = { id: string; name: string };

/**
 * Groups the user belongs to (for active-group cookie UI). Used on group home only.
 */
export async function loadUserGroupsForSwitcher(
  supabase: ReturnType<typeof createClient>,
  cookieStore: CookieStore,
  userId: string,
): Promise<{ groups: SwitcherGroupRow[]; activeGroupId: string | null }> {
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  const ids = (memberships ?? []).map((m) => m.group_id);
  let groups: SwitcherGroupRow[] = [];

  if (ids.length) {
    const { data: groupRows } = await supabase
      .from("groups")
      .select("id, name")
      .in("id", ids);
    groups = (groupRows ?? [])
      .filter((g): g is SwitcherGroupRow => Boolean(g?.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("favorite_group_id")
    .eq("id", userId)
    .maybeSingle();

  const rawCookie = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value;
  const activeGroupId = resolveActiveGroupId(
    rawCookie,
    groups.map((g) => g.id),
    profile?.favorite_group_id ?? null,
  );

  return { groups, activeGroupId };
}
