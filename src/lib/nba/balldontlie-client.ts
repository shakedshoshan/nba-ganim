import type {
  FetchGamesParams,
  GamesListResponse,
  NBAGame,
} from "./balldontlie-types";

const BASE = "https://api.balldontlie.io";

function appendQueryParams(
  url: URL,
  params: FetchGamesParams,
): void {
  const p = params.perPage ?? 100;
  url.searchParams.set("per_page", String(Math.min(100, Math.max(1, p))));

  if (params.cursor != null) {
    url.searchParams.set("cursor", String(params.cursor));
  }
  if (params.postseason != null) {
    url.searchParams.set("postseason", String(params.postseason));
  }
  if (params.startDate) {
    url.searchParams.set("start_date", params.startDate);
  }
  if (params.endDate) {
    url.searchParams.set("end_date", params.endDate);
  }
  for (const d of params.dates ?? []) {
    url.searchParams.append("dates[]", d);
  }
  for (const s of params.seasons ?? []) {
    url.searchParams.append("seasons[]", String(s));
  }
  for (const id of params.teamIds ?? []) {
    url.searchParams.append("team_ids[]", String(id));
  }
}

export async function fetchGamesPage(
  apiKey: string,
  params: FetchGamesParams,
): Promise<GamesListResponse> {
  const url = new URL(`${BASE}/nba/v1/games`);
  appendQueryParams(url, params);

  const res = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `BallDontLie games ${res.status}: ${text.slice(0, 500)}`,
    );
  }

  return res.json() as Promise<GamesListResponse>;
}

/** Walk cursor pagination until no next_cursor. */
export async function fetchAllGames(
  apiKey: string,
  baseParams: Omit<FetchGamesParams, "cursor">,
): Promise<NBAGame[]> {
  const out: NBAGame[] = [];
  let cursor: number | undefined;

  for (;;) {
    const page = await fetchGamesPage(apiKey, { ...baseParams, cursor });
    out.push(...(page.data ?? []));
    const next = page.meta?.next_cursor;
    if (next == null || next === cursor) break;
    cursor = next;
  }

  return out;
}

export function getBalldontlieApiKey(): string | null {
  const k = process.env.BALLDONTLIE_API_KEY?.trim();
  return k || null;
}
