import { sql } from "drizzle-orm";
import type { db } from "../db/index.js";
import { runMigrations } from "../db/migrate.js";

type Db = typeof db;

/** Apply pending SQL migrations before demo seed mutates the schema. */
export async function ensureDemoSchema(): Promise<void> {
  await runMigrations();
}

export async function companionMeasurementSchemaReady(database: Db): Promise<boolean> {
  const rows = await database.execute<{ ok: number }>(sql`
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'esti_measurement'
      AND column_name = 'source'
    LIMIT 1
  `);
  return rows.length > 0;
}

export async function aiSettingsColumnReady(database: Db): Promise<boolean> {
  const rows = await database.execute<{ ok: number }>(sql`
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'esti_orgsettings'
      AND column_name = 'ai_settings'
    LIMIT 1
  `);
  return rows.length > 0;
}
