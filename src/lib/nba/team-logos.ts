/**
 * Static team marks under `public/nba logos/` plus a few remote fallbacks
 * where a local SVG is not checked in. Keys are BallDontLie-style abbrevs (uppercase).
 */
const LOCAL = (file: string) => encodeURI(`/nba logos/${file}`);

/** Abbrev (NBA / BallDontLie) → image URL (path under `public/` or absolute). */
export const TEAM_LOGO_BY_ABBREV: Record<string, string> = {
  ATL: LOCAL("Atlanta Hawks Logo.svg"),
  BOS: LOCAL("Boston Celtics Logo.svg"),
  BKN: LOCAL("Brooklyn Nets Logo.svg"),
  CHA: LOCAL("Charlotte Hornets Logo.svg"),
  CHO: LOCAL("Charlotte Hornets Logo.svg"),
  CHI: LOCAL("Chicago Bulls Logo.svg"),
  CLE: LOCAL("Cleveland Cavaliers Logo.svg"),
  DAL: LOCAL("Dallas Mavericks Logo.svg"),
  DEN: LOCAL("Denver Nuggets Logo.svg"),
  DET: LOCAL("Detroit Pistons Logo.svg"),
  GSW:
    "https://content.sportslogos.net/logos/6/237/full/1000_golden_state_warriors-primary-2017.png",
  HOU: LOCAL("Houston Rockets Logo.svg"),
  IND: LOCAL("Indiana Pacers Logo.svg"),
  LAC: LOCAL("Los Angles Clippers Logo.svg"),
  LAL: LOCAL("Los Angles Lakers Logo.svg"),
  MEM: LOCAL("Memphis Grizzlies Logo.svg"),
  MIA: LOCAL("Miami Heat Logo.svg"),
  MIL: LOCAL("Milwaukee Bucks Logo.svg"),
  MIN: LOCAL("Minnesota Timberwolves Logo.svg"),
  NOP: LOCAL("New Orleans Pelicans Logo.svg"),
  NOH: LOCAL("New Orleans Pelicans Logo.svg"),
  NYK: LOCAL("New York Knicks Logo.svg"),
  OKC: LOCAL("Oklahoma City Thunder Logo.svg"),
  ORL: LOCAL("Orlando Magic Logo.svg"),
  PHI: LOCAL("Philadephia 76ers Logo.svg"),
  PHX: "https://content.sportslogos.net/logos/6/238/full/4370_phoenix_suns-primary-2014.png",
  POR: LOCAL("Portland TrailBlazers Logo.svg"),
  SAC: "https://content.sportslogos.net/logos/6/240/full/832.gif",
  SAS: LOCAL("San Antonio Spurs Logo.svg"),
  TOR: LOCAL("Toronto Raptors Logo.svg"),
  UTA: LOCAL("Utah Jazz Logo.svg"),
  WAS: LOCAL("Washington Wizards Logo.svg"),
};

export function teamLogoUrl(
  abbrev: string | null | undefined,
): string | null {
  if (!abbrev?.trim()) return null;
  return TEAM_LOGO_BY_ABBREV[abbrev.trim().toUpperCase()] ?? null;
}
