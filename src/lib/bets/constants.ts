export const GLOBAL_BET_TYPES = [
  "Champion",
  "MVP",
  "EastChampion",
  "WestChampion",
] as const;

export type GlobalBetType = (typeof GLOBAL_BET_TYPES)[number];

export const GLOBAL_BET_LABELS: Record<GlobalBetType, string> = {
  Champion: "NBA champion",
  MVP: "Finals MVP",
  EastChampion: "Eastern Conference champion",
  WestChampion: "Western Conference champion",
};

export function fieldNameForGlobalBet(betType: GlobalBetType): string {
  return `prediction_${betType}`;
}
