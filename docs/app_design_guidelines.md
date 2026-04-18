# App design rules & instructions

**Audience:** Designers, frontend engineers, and anyone shipping UI for the **NBA Playoff Challenge** — a social, private-group competition for **series** and **tournament (breadth)** predictions, not a sportsbook.

**Canonical product/tech context:** [`project_context.md`](project_context.md). **Data, locks, and RLS:** [`Technical_specification.md`](Technical_specification.md), [`System_characterization.md`](System_characterization.md).

---

## 1. Design intent

### What the product is

Users join **private groups** via invite, submit **picks** (per-series winner + series length 4–7; plus global picks like champion and MVP), and compete on **points** after real games settle. **Locks** and **privacy** are strict: others must not see picks until the rules allow it.

### What the UI must optimize for

1. **Confidence at submit time** — Users need to know *what* they picked, *when* it locks, and *who* can see it afterward.
2. **Speed on mobile** — Most usage will be glance-and-tap between games; avoid deep nesting and tiny controls.
3. **Honest states** — Open vs locked vs “hidden until lock” must never be ambiguous.

Avoid visual language that implies **real-money gambling** (chips, flashing odds, urgency timers that feel manipulative). Prefer **league / bracket / friends league** cues: clarity, team identity, and calm hierarchy.

---

## 2. Responsive & mobile-first rules

### Layout

- **Design at the smallest breakpoint first** (roughly 320–390px width), then scale up. Do not ship flows that only work comfortably on desktop.
- **Single primary column** on phone: one main task per screen (e.g. “edit this series pick,” “review global picks”).
- **Touch targets:** Minimum **44×44 CSS px** for tappable controls (buttons, segmented choices, disclosure toggles). Spacing between targets ≥ **8px** to prevent mis-taps.
- **Thumb zones:** Place primary actions (Save, Join, Continue) in the **lower half** of the viewport when possible; destructive or rare actions higher or behind confirmation.
- **Avoid hover-only affordances** — Every critical action must be reachable via tap and keyboard.

### Navigation

- **Keep dashboard depth shallow:** Home → My bets / Groups / Join should be reachable in **one or two taps** from a persistent shell (top bar or bottom nav when you add it).
- **Sticky context** on long pages: When scrolling series lists or forms, keep **active group** and **lock status** visible in the chrome (already aligned with `DashboardTopBar` + group switcher).
- **Dashboard header (signed-in):** Below **`lg`**, **logo + menu** only; menu lists Dashboard / My bets / Bracket / Groups / Home + **Sign out**. **No active-group control in the header** — multi-group users change it on **group home** (`GroupSwitcher` card when they belong to 2+ groups). At **`lg+`**, horizontal nav + sign out.

### Tables and leaderboards (future / Phase 5)

- **Do not squeeze wide tables** onto narrow screens. Use **card rows** (user, rank, points, tie-break hint) or horizontal scroll **only** as a last resort, with a visible scroll hint.
- **Round filters** (overall vs round-scoped standings): Use **segmented control** or clearly labeled chips, not a tiny native `<select>` as the only option on mobile.

---

## 3. Ease of use & cognitive load

### Progressive disclosure

- **Series summary first** (e.g. “BOS leads 2-1”, user’s pick if allowed). **Game log** second, behind an **expand** pattern (per `Technical_specification.md` §5).
- **Global (breadth) bets** are one mental “bucket”; **series bets** are another. Visually **separate** them on My bets with headings and spacing, not one undifferentiated form wall.

### Language

- Prefer **plain words:** “Locked at tip-off,” “Your pick,” “Group can see this after lock.”
- **Avoid internal table names** (`global_bets`, `series_id`) in user-facing copy.
- **Lock times:** Show **local time with timezone** or explicit “in your local time” if you store UTC — users miss picks when copy says “8:00” without zone.

### Defaults and safety

- **Primary button** = one clear action per form (e.g. **Save pick**). If nothing changed, disable or de-emphasize submit.
- **Destructive or irreversible** actions (leave group, regenerate invite): Require **confirmation** and plain explanation of impact (old link stops working).

---

## 4. States that must be designed explicitly

Every surface that shows predictions or scores needs specs for **all** of these:

| State | User expectation |
|--------|-------------------|
| **Open for editing** | Controls enabled; show lock deadline if known. |
| **Locked (own row)** | Read-only summary; optional “locked at …” subtext. |
| **Hidden (peer, pre-lock)** | Do not show other users’ values; use neutral placeholder (“Hidden until Game 1”) — **never** empty layout that looks like a bug. |
| **Visible (peer, post-lock)** | Clear label that the group can see; show username + pick. |
| **Loading** | Skeleton or inline spinner; preserve layout to avoid jump. |
| **Empty** | No series seeded: explain **why** and what admins/sync do — not a blank page. |
| **Error** | Actionable message (retry, contact admin); don’t only toast for critical failures. |

Global vs series locks differ (see `System_characterization.md` §3). **UI copy and disabled states must match:** global lock affects breadth only; series lock is per matchup.

---

## 5. Components & patterns (product-aligned)

### Series card

- **Header:** Matchup identity (teams, round), **live or final series score** when available.
- **Body:** User’s winner + games prediction; **badge** for open / locked / scored (points if shipped).
- **Footer / expand:** Per-game scores and statuses; keep **arena home/visitor** visually distinct from **bracket home/away** if both appear — abbreviations alone confuse; use labels or icons.

### Pick controls

- **Winner:** Two large choices (team A / team B), not a cramped dropdown.
- **Series length:** **4 / 5 / 6 / 7** as a **segmented control** or radio row; show which option is selected with high contrast.

### Global bets form

- **One field per bet type** with consistent order (see `my-app/src/lib/bets/constants.ts` for shipped types).
- When locked, show **saved value** read-only; if unset before lock, show explicit **“No pick saved”** (if product allows) — don’t fake a value.

### Join flow (`/join/[invite_code]`)

- **Logged out:** Clear path: sign in or sign up, preserve `next` to return to join.
- **Logged in:** Single primary **Join group**; after success, land on **group home** with active group set — confirm success briefly (toast or banner).

### Group home

- **Join link** copy: full URL, one-tap copy, short note that regenerating invite invalidates old links.
- **Member list:** Readable usernames; creator/member affordances separated so **remove** is never mistaken for **leave**.

---

## 6. Visual system (baseline without mandating a rebrand)

### Brand and team marks

- **Site mark:** [`my-app/public/nba.png`](../my-app/public/nba.png) — used in the **marketing home header**, **dashboard top bar** (`SiteLogo`), and as **`metadata.icons`** in [`my-app/src/app/layout.tsx`](../my-app/src/app/layout.tsx) so the browser tab shows the same asset.
- **Team marks:** SVGs under [`my-app/public/nba logos/`](../my-app/public/nba%20logos/) (paths are URL-encoded in code). **Canonical abbrev → file map:** [`my-app/src/lib/nba/team-logos.ts`](../my-app/src/lib/nba/team-logos.ts) (`teamLogoUrl`, `TEAM_LOGO_BY_ABBREV`). A few teams without a checked-in vector use **remote** assets; `next.config.ts` whitelists `content.sportslogos.net` for `next/image`.
- **UI:** [`TeamLogo`](../my-app/src/components/ui/team-logo.tsx) beside abbreviations on schedule rows, series headers, winner tiles, and expandable game logs. Use **abbrev + logo** (not logo alone) so text remains the source of truth if a file is missing.
- **Legacy table:** [`my-app/src/assets/NBA-logos.ts`](../my-app/src/assets/NBA-logos.ts) (nickname → path) is retained for reference; new code should use **`team-logos.ts`** with API-style abbrevs (`BOS`, `LAL`, …).

### Hierarchy

- **One H1 per route.** Section titles (`h2` / `h3`) mirror IA: My bets → Tournament picks / Series picks.
- **Numerical data** (scores, games, points): Use **tabular figures** where the font supports it; align numbers right in lists.

### Color & status

- **Semantic color** only with **text or icon** — never color alone (accessibility).
- **Live game** vs **final:** Distinct but calm (e.g. dot + “Live” label vs muted “Final”).
- **Locked:** Neutral or informational hue; **avoid red** unless error.

### Density

- **Mobile:** Generous vertical rhythm; **16px** minimum horizontal page gutter.
- **Desktop:** Constrain content width (e.g. `max-w-*`) so line length stays readable; don’t stretch forms to full ultra-wide monitors.

---

## 7. Accessibility (non-optional)

- **Keyboard:** All interactive elements focusable; visible focus ring; logical tab order.
- **Forms:** Associate `<label>` with inputs; announce errors with `aria-live` where appropriate.
- **Contrast:** Meet **WCAG 2.2 AA** for text and interactive states.
- **Motion:** Respect `prefers-reduced-motion` for non-essential animations.

---

## 8. Content & trust

- **No dark patterns** — Don’t fake scarcity on picks; locks are real deadlines from data.
- **Privacy copy** should match backend: if RLS hides picks, the UI must not leak hints (e.g. don’t show “edited 2 min ago” for hidden peers).

---

## 9. Handoff checklist (for each new screen or feature)

1. Mobile layout at **360px** and desktop at **1280px** considered.
2. All **lock / visibility** states specified and labeled.
3. **Empty** and **error** states designed, not left to engineering improvisation.
4. Touch targets and spacing verified.
5. Copy reviewed for **plain language** and timezone clarity on deadlines.

---

## Implementation status (code)

- **Design tokens:** Semantic CSS variables and Tailwind `@theme` colors live in [`my-app/src/app/globals.css`](../my-app/src/app/globals.css) (`background`, `surface`, `accent`, `success`/`info` for states, `danger` for errors).
- **Shared primitives:** [`my-app/src/components/ui/`](../my-app/src/components/ui/) — `PageContainer`, `Card`, `Button`, `Badge` (Open/Locked), `SegmentedGames`, `WinnerTiles`, **`SiteLogo`**, **`TeamLogo`**.
- **Bets UX:** [`series-bet-card.tsx`](../my-app/src/components/bets/series-bet-card.tsx) + [`series-game-log.tsx`](../my-app/src/components/bets/series-game-log.tsx); global form in [`global-bets-form.tsx`](../my-app/src/components/bets/global-bets-form.tsx).
- **Dashboard shell:** [`authenticated-top-bar.tsx`](../my-app/src/components/layout/authenticated-top-bar.tsx) + [`app-top-bar.tsx`](../my-app/src/components/layout/app-top-bar.tsx) — mobile drawer below `lg`; no group switcher in header.
- **Group home:** [`[groupId]/page.tsx`](../my-app/src/app/dashboard/groups/[groupId]/page.tsx) + [`group-leaderboard.tsx`](../my-app/src/app/dashboard/groups/[groupId]/group-leaderboard.tsx) + [`group-client.tsx`](../my-app/src/app/dashboard/groups/[groupId]/group-client.tsx) — card layout, full-width primary actions on small screens, standings as tappable rows (not a squeezed table).
- **Team logo map:** [`my-app/src/lib/nba/team-logos.ts`](../my-app/src/lib/nba/team-logos.ts).

*Document owner: product/design alignment with engineering. Update when phases add leaderboard, bracket, or peer inspection (`project_context.md` Phase 5+). Last touched: 2026-04-18 — group home layout + dashboard mobile nav drawer.*
