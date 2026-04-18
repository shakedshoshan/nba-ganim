import { ProfileSettingsForm } from "@/app/dashboard/settings/profile-settings-form";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile settings",
};

export default async function ProfileSettingsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, username, favorite_group_id, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const memberIds = (memberships ?? []).map((m) => m.group_id);
  let groups: { id: string; name: string }[] = [];
  if (memberIds.length) {
    const { data: groupRows } = await supabase
      .from("groups")
      .select("id, name")
      .in("id", memberIds);
    groups = (groupRows ?? [])
      .filter((g): g is { id: string; name: string } => Boolean(g?.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const favoriteId = profile?.favorite_group_id ?? "";
  const favoriteInList =
    favoriteId && groups.some((g) => g.id === favoriteId);

  const initial = {
    userId: user.id,
    avatarUrl: profile?.avatar_url ?? null,
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    username: profile?.username ?? "",
    favoriteGroupId: favoriteInList ? favoriteId : "",
    groups,
  };

  return (
    <main className="flex flex-1 flex-col py-6 sm:py-10">
      <PageContainer>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Profile settings
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Update how you appear in groups and which group is your default when
          the app does not yet know your active group.
        </p>

        <Card className="mt-8 p-5 sm:p-6">
          <ProfileSettingsForm initial={initial} />
        </Card>
      </PageContainer>
    </main>
  );
}
