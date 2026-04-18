export const ACTIVE_GROUP_COOKIE = "active_group_id";

export const activeGroupCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 400, // ~400 days
};

/**
 * Prefer a valid cookie, else a favorite that is still a membership, else the
 * first listed group id.
 */
export function resolveActiveGroupId(
  cookieValue: string | undefined,
  memberGroupIdsOrdered: string[],
  favoriteGroupId?: string | null,
): string | null {
  if (memberGroupIdsOrdered.length === 0) {
    return null;
  }
  if (cookieValue && memberGroupIdsOrdered.includes(cookieValue)) {
    return cookieValue;
  }
  if (
    favoriteGroupId &&
    memberGroupIdsOrdered.includes(favoriteGroupId)
  ) {
    return favoriteGroupId;
  }
  return memberGroupIdsOrdered[0] ?? null;
}
