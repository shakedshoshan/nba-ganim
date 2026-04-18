export const ACTIVE_GROUP_COOKIE = "active_group_id";

export const activeGroupCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 400, // ~400 days
};

/** Prefer cookie when it is a current membership; else first listed group. */
export function resolveActiveGroupId(
  cookieValue: string | undefined,
  memberGroupIdsOrdered: string[],
): string | null {
  if (memberGroupIdsOrdered.length === 0) {
    return null;
  }
  if (cookieValue && memberGroupIdsOrdered.includes(cookieValue)) {
    return cookieValue;
  }
  return memberGroupIdsOrdered[0] ?? null;
}
