import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;
const dir = "supabase/migrations";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const connectionString = process.env.POSTGRES_URL_NON_POOLING;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("[v0] connected, applying", files.length, "migrations");

for (const f of files) {
  const sql = readFileSync(join(dir, f), "utf8");
  try {
    await client.query(sql);
    console.log("[v0] OK   ", f);
  } catch (e) {
    console.log("[v0] FAIL ", f, "->", e.message);
    await client.end();
    process.exit(1);
  }
}

const r = await client.query(
  "select count(*)::int as n from information_schema.tables where table_schema='public'"
);
console.log("[v0] public tables now:", r.rows[0].n);
await client.end();
console.log("[v0] done");
