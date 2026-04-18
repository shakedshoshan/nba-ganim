/**
 * TestingBot free random avatar API (square size in URL path, max 1000).
 * @see https://testingbot.com/free-online-tools/free-avatar-generator
 */
const BASE = "https://testingbot.com/free-online-tools/random-avatar";

export const TESTINGBOT_AVATAR_DISPLAY_SIZE = 160;

export function testingBotAvatarUrl(size: number, seed: string): string {
  const s = Math.min(1000, Math.max(1, Math.floor(size)));
  return `${BASE}/${s}?u=${encodeURIComponent(seed)}`;
}

/** Deterministic image per user when they have not saved a custom avatar yet. */
export function defaultTestingBotAvatarUrl(
  userId: string,
  size = TESTINGBOT_AVATAR_DISPLAY_SIZE,
): string {
  return testingBotAvatarUrl(size, userId);
}

/** New avatar on each call (unique seed). */
export function randomTestingBotAvatarUrl(
  userId: string,
  size = TESTINGBOT_AVATAR_DISPLAY_SIZE,
): string {
  return testingBotAvatarUrl(size, `${userId}:${crypto.randomUUID()}`);
}
