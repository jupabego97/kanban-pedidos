import { Pool } from "pg";
import { env } from "$env/dynamic/private";

let pool;

function getConnectionString() {
  return env.DATABASE_PUBLIC_URL || env.DATABASE_URL;
}

export function getPool() {
  if (!pool) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      throw new Error(
        "Falta DATABASE_PUBLIC_URL o DATABASE_URL en el entorno.",
      );
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : {
            rejectUnauthorized: false,
          },
    });
  }
  return pool;
}

export async function query(text, values = []) {
  return getPool().query(text, values);
}
