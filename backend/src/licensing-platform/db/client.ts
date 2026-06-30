import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

// Shares the AORMS Postgres (the hlp_ tables live in the same DB); its own pool.
const client = postgres(env.DATABASE_URL, { max: 5 });
export const db = drizzle(client, { schema });
export type DB = typeof db;
export { schema };
