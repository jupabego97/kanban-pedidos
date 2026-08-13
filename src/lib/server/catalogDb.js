import { Pool } from "pg";
import { env } from "$env/dynamic/private";

let catalogPool;

export function getCatalogUrl() {
  return (
    env.CATALOGO_ITEMS_URL ||
    env.DATABASE_CATALOGO_URL ||
    env.DATABASE_CATALOGO_PUBLIC_URL ||
    env.CATALOGO_DATABASE_URL ||
    ""
  ).trim();
}

export function isHttpCatalogUrl(url = getCatalogUrl()) {
  return /^https?:\/\//i.test(url);
}

export function isCatalogDbConfigured() {
  return Boolean(getCatalogUrl());
}

export function isCatalogPostgresConfigured() {
  const url = getCatalogUrl();
  return Boolean(url) && !isHttpCatalogUrl(url);
}

export function getCatalogApiKey() {
  return (
    env.CATALOGO_API_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
}

export function getCatalogPool() {
  if (!catalogPool) {
    const connectionString = getCatalogUrl();
    if (!connectionString) {
      throw new Error(
        "Falta DATABASE_CATALOGO_URL (BD con Tables/catalog_items).",
      );
    }
    if (isHttpCatalogUrl(connectionString)) {
      throw new Error(
        "DATABASE_CATALOGO_URL es HTTP; no se puede usar como PostgreSQL.",
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
