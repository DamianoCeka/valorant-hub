import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create postgres client
const client = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 30,
});

// Create drizzle instance
export const db = drizzle(client);

export default db;
