/**
 * Applies all SQL files in supabase/migrations/ (sorted by filename) to your hosted project.
 *
 * Option A — direct Postgres:
 *   DATABASE_URL from Dashboard → Settings → Database → Connection string → URI.
 *   For the pooler (port 6543), the username MUST be postgres.[PROJECT_REF], not plain "postgres",
 *   or you get: FATAL "Tenant or user not found".
 *   This script auto-fixes plain "postgres" on *.pooler.supabase.com if NEXT_PUBLIC_SUPABASE_URL is set.
 *   Prefer "Session" pooler mode for migrations (many statements in one batch).
 *
 * Option B — Management API (personal access token):
 *   SUPABASE_ACCESS_TOKEN=...  (Account → Access Tokens)
 *   NEXT_PUBLIC_SUPABASE_URL must already be set (for project ref).
 *   Use this when DATABASE_URL hits ETIMEDOUT — many networks block Postgres ports; HTTPS (443) usually works.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const migrationsDir = path.join(root, "supabase", "migrations");

function listMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function readAllMigrationsSql() {
  const files = listMigrationFiles();
  if (files.length === 0) {
    throw new Error(`No .sql files in ${migrationsDir}`);
  }
  return files
    .map((f) => {
      const full = path.join(migrationsDir, f);
      return `-- --- ${f} ---\n${fs.readFileSync(full, "utf8")}`;
    })
    .join("\n\n");
}

function projectRefFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(/https:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : null;
}

/**
 * Supavisor pooler identifies the project via the DB user. Plain "postgres" → XX000 Tenant or user not found.
 */
function normalizeSupabasePoolerDatabaseUrl(raw, supabasePublicUrl) {
  const ref = projectRefFromUrl(supabasePublicUrl);
  if (!ref) return raw;

  let u;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }

  if (!u.hostname.endsWith("pooler.supabase.com")) return raw;

  const user = decodeURIComponent(u.username || "");
  if (user !== "postgres") return raw;

  u.username = `postgres.${ref}`;
  const fixed = u.toString();
  console.log(
    "[db:apply] Adjusted DATABASE_URL user from postgres to postgres.%s for pooler (required by Supabase).",
    ref,
  );
  return fixed;
}

function printTenantOrUserHint() {
  const ref = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const refBit = ref ? `postgres.${ref}` : "postgres.YOUR_PROJECT_REF";
  console.error(`
Supabase returned: "Tenant or user not found"

This almost always means the pooler username is wrong. Use:
  • Dashboard → Project Settings → Database → Connection string → URI → Session pooler (port 6543)
  • Username in the URI must be "${refBit}" (not plain "postgres").

Or use Direct connection (port 5432, host db.${ref ?? "REF"}.supabase.co, user "postgres").

If your DB password contains @ # : etc., URL-encode it in DATABASE_URL.

If that still fails, add SUPABASE_ACCESS_TOKEN — db:apply will use HTTPS if Postgres cannot connect.
`);
}

function collectErrorCodes(err) {
  const codes = new Set();
  if (!err || typeof err !== "object") return codes;
  if ("code" in err && err.code) codes.add(String(err.code));
  if (err instanceof AggregateError && Array.isArray(err.errors)) {
    for (const e of err.errors) {
      if (e && typeof e === "object" && "code" in e && e.code) {
        codes.add(String(e.code));
      }
    }
  }
  return codes;
}

function isConnectionTimeoutError(err) {
  if (collectErrorCodes(err).has("ETIMEDOUT")) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("ETIMEDOUT");
}

function isConnectionRefusedError(err) {
  return collectErrorCodes(err).has("ECONNREFUSED");
}

function printConnectionTimeoutHint() {
  console.error(`
Postgres connection timed out or was refused. Outbound TCP on ports 5432 / 6543 is often blocked
(school/work Wi‑Fi, ISP, VPN, or firewall).

What to do:
  1) Add SUPABASE_ACCESS_TOKEN to my-app/.env
     (Supabase Dashboard → Account → Access Tokens → generate with project/database access)
     Then run: npm run db:apply
     The script tries DATABASE_URL first, then applies the same SQL over HTTPS (port 443).

  2) Or temporarily comment out DATABASE_URL if you only want the Management API path.

  3) Or run from a network that allows Postgres, or paste migrations in Dashboard → SQL Editor.
`);
}

async function runViaDatabaseUrl() {
  let connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return false;

  connectionString = normalizeSupabasePoolerDatabaseUrl(
    connectionString,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  try {
    await client.connect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Tenant or user not found")) {
      printTenantOrUserHint();
      return false;
    }
    if (isConnectionTimeoutError(err) || isConnectionRefusedError(err)) {
      printConnectionTimeoutHint();
      return false;
    }
    throw err;
  }
  try {
    await client.query(readAllMigrationsSql());
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
  console.log("Applied schema via DATABASE_URL.");
  return true;
}

async function runViaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!token || !ref) return false;

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: readAllMigrationsSql() }),
    },
  );

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${body}`);
  }
  console.log("Applied schema via Supabase Management API.");
  return true;
}

async function main() {
  const hadDbUrl = Boolean(process.env.DATABASE_URL?.trim());
  if (await runViaDatabaseUrl()) return;
  if (await runViaManagementApi()) return;

  if (hadDbUrl) {
    console.error(`
DATABASE_URL is set but could not be used (see messages above).
Set SUPABASE_ACCESS_TOKEN to run migrations over HTTPS, or apply SQL in the Supabase SQL Editor.
`);
  }

  let migrationList = "";
  try {
    migrationList = listMigrationFiles().join(", ");
  } catch {
    migrationList = "(unreadable)";
  }

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceRoleHint = hasServiceRole
    ? `
Note: SUPABASE_SERVICE_ROLE_KEY is for the app/sync route only — it cannot run migrations.
      You still need DATABASE_URL or SUPABASE_ACCESS_TOKEN below.
`
    : "";

  console.error(`
Could not apply schema: no credentials found.
${serviceRoleHint}
Add one of the following to my-app/.env (or .env.local), then run:
  npm run db:apply

1) DATABASE_URL — Postgres URI from Dashboard → Settings → Database → Connection string
   (URI tab, Session mode pooler). Replace [YOUR-PASSWORD] with your database password.

2) SUPABASE_ACCESS_TOKEN — Dashboard → Account → Access Tokens (scope: include database / project access),
   plus NEXT_PUBLIC_SUPABASE_URL (you already have a project URL).

Or open the SQL editor for your project and paste the contents of each file in:
  ${migrationsDir}
  (lexicographic order: ${migrationList})
`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
