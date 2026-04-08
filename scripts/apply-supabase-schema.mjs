/**
 * Applies supabase/migrations/20260408120000_initial_schema.sql to your hosted project.
 *
 * Option A — direct Postgres (recommended):
 *   Add to my-app/.env:
 *   DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
 *   (Supabase Dashboard → Project Settings → Database → Connection string → URI, Session mode.)
 *
 * Option B — Management API (personal access token):
 *   SUPABASE_ACCESS_TOKEN=...  (Account → Access Tokens)
 *   NEXT_PUBLIC_SUPABASE_URL must already be set (for project ref).
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

const migrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "20260408120000_initial_schema.sql",
);

function readSql() {
  return fs.readFileSync(migrationPath, "utf8");
}

function projectRefFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(/https:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : null;
}

async function runViaDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return false;

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(readSql());
  } finally {
    await client.end();
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
      body: JSON.stringify({ query: readSql() }),
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
  if (await runViaDatabaseUrl()) return;
  if (await runViaManagementApi()) return;

  console.error(`
Could not apply schema: no credentials found.

Add one of the following to my-app/.env (or .env.local), then run:
  npm run db:apply

1) DATABASE_URL — Postgres URI from Dashboard → Settings → Database (use pooler URI + your DB password).

2) SUPABASE_ACCESS_TOKEN — Dashboard → Account → Access Tokens (needs database_write),
   plus NEXT_PUBLIC_SUPABASE_URL (already set).

Or open the SQL editor for your project and paste the contents of:
  ${migrationPath}
`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
