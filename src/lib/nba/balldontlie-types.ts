/** Shapes aligned with https://www.balldontlie.io/openapi/nba.yml */

export type NBATeam = {
  id: number;
  conference?: string;
  division?: string;
  city?: string;
  name?: string;
  full_name?: string;
  abbreviation?: string;
};

export type NBAGame = {
  id: number;
  date?: string;
  season?: number;
  status?: string | null;
  period?: number | null;
  time?: string | null;
  period_detail?: string | null;
  datetime?: string | null;
  postseason?: boolean;
  home_team_score?: number | null;
  visitor_team_score?: number | null;
  home_team?: NBATeam;
  visitor_team?: NBATeam;
};

export type PaginationMeta = {
  next_cursor?: number | null;
  prev_cursor?: number | null;
  per_page?: number;
};

export type GamesListResponse = {
  data: NBAGame[];
  meta?: PaginationMeta;
};

export type FetchGamesParams = {
  cursor?: number;
  perPage?: number;
  dates?: string[];
  seasons?: number[];
  postseason?: boolean;
  startDate?: string;
  endDate?: string;
  teamIds?: number[];
};
