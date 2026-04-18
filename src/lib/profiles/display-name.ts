/** Shown name for lists: "First L." when both names exist, else partial or @username. */
export function profileDisplayName(p: {
  first_name: string | null | undefined;
  last_name: string | null | undefined;
  username: string;
}): string {
  const first = (p.first_name ?? "").trim();
  const last = (p.last_name ?? "").trim();
  if (first && last) {
    return `${first} ${last.charAt(0).toUpperCase()}.`;
  }
  if (first) return first;
  if (last) return last;
  return p.username;
}
