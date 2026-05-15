import { Pool } from "pg";
import { env } from "$env/dynamic/private";

let catalogPool;

function getConnectionString() {
  return (
    env.DATABASE_CATALOGO_URL ||
    env.DATABASE_CATALOGO_PUBLIC_URL ||
    env.CATALOGO_DATABASE_URL
  );
}

export function isCatalogDbConfigured() {
  return Boolean(getConnectionString());
}

export function getCatalogPool() {
  if (!catalogPool) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      throw new Error(
        "Falta DATABASE_CATALOGO_URL (PostgreSQL con tablas items y facturas_proveedor).",
      );
    }

    catalogPool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return catalogPool;
}

/**
 * @param {string} text
 * @param {unknown[]} [values]
 */
export async function catalogQuery(text, values = []) {
  return getCatalogPool().query(text, values);
}
