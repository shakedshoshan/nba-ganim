import { randomBytes } from "crypto";

/** URL-safe invite segment (matches existing API route length). */
export function generateInviteCodeCandidate(): string {
  return randomBytes(9).toString("base64url").slice(0, 12);
}
