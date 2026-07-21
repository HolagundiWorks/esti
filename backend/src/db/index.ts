import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

const client = postgres(env.DATABASE_URL, { max: 10 });
export const db = drizzle(client, { schema });

/**
 * The shared database handle type. Uses the `PgDatabase` base (rather than
 * `typeof db`) so that both the root connection and a `db.transaction(tx => …)`
 * transaction satisfy it — drizzle 0.45 added a `$client` field to the concrete
 * postgres-js type that transactions do not carry.
 */
export type DB = PgDatabase<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
export { schema };
