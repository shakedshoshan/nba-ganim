/**
 * Checks Supabase-related env vars and tests REST + Postgres (no secret values printed).
 * Run: npm run verify:supabase
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbUrl = process.env.DATABASE_URL?.trim();

function line(name, ok, detail = "") {
  const mark = ok ? "ok" : "missing";
  console.log(`  ${name}: ${mark}${detail ? ` — ${detail}` : ""}`);
}

console.log("\nSupabase env (presence only)\n");

line("NEXT_PUBLIC_SUPABASE_URL", Boolean(url));
line(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY or …PUBLISHABLE_DEFAULT_KEY",
  Boolean(anon),
);
line("SUPABASE_SERVICE_ROLE_KEY", Boolean(service));
line("DATABASE_URL", Boolean(dbUrl));
line("SUPABASE_ACCESS_TOKEN", Boolean(process.env.SUPABASE_ACCESS_TOKEN?.trim()));

async function restProbe(label, key) {
  if (!url || !key) return;
  const target = `${url.replace(/\/$/, "")}/rest/v1/series?select=id&limit=1`;
  const res = await fetch(target, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  const ok = res.ok || res.status === 406; // some configs
  const detail = `HTTP ${res.status}${ok ? "" : " (check RLS or key)"}`;
  console.log(`  REST ${label}: ${detail}`);
}

async function tryPg(connectionString, label) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    const { rows } = await client.query(
      "select current_database() as db, current_user as user",
    );
    console.log(
      `  Postgres (${label}): ok — connected as ${rows[0]?.user} to ${rows[0]?.db}`,
    );
    return true;
  } catch (e) {
    console.log(
      `  Postgres (${label}): failed — ${e instanceof Error ? e.message : e}`,
    );
    return false;
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

/** Pooler + wrong port often yields "Tenant or user not found". */
function alternatePoolerPort(urlStr) {
  try {
    const u = new URL(urlStr);
    if (!u.hostname.includes("pooler.supabase.com")) return null;
    const port = u.port || "5432";
    if (port === "5432") {
      u.port = "6543";
      return u.toString();
    }
    if (port === "6543") {
      u.port = "5432";
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function pgProbe() {
  if (!dbUrl) return false;
  let ok = await tryPg(dbUrl, "DATABASE_URL");
  if (ok) return true;

  const alt = alternatePoolerPort(dbUrl);
  if (alt && alt !== dbUrl) {
    console.log("  Retrying DATABASE_URL with alternate pooler port…");
    ok = await tryPg(alt, "DATABASE_URL (alternate port)");
    console.log(
      "  If alternate port worked, update DATABASE_URL in .env to use that port (Dashboard → Database → Connection string).",
    );
    if (ok) return true;
  }

  console.log(
    "  Hint: ETIMEDOUT usually means this network blocks Postgres ports. Use SUPABASE_ACCESS_TOKEN in .env so `npm run db:apply` can run over HTTPS (443).",
  );
  return false;
}

console.log("\nLive checks\n");

try {
  await restProbe("anon/publishable", anon);
} catch (e) {
  console.log(
    `  REST anon: error — ${e instanceof Error ? e.message : e}`,
  );
}

try {
  await restProbe("service role", service);
} catch (e) {
  console.log(
    `  REST service: error — ${e instanceof Error ? e.message : e}`,
  );
}

await pgProbe();

const syncUrl = process.env.SYNC_API_URL?.trim();
if (syncUrl?.includes("supabase.co") && syncUrl.includes("sync-nba-data")) {
  console.log(
    "\n  Note: SYNC_API_URL looks like a Supabase host. It should be your Next.js app URL + /api/sync-nba-data (for GitHub Actions).\n",
  );
}

console.log("");
