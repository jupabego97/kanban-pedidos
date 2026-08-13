import { env as publicEnv } from "$env/dynamic/public";
import { env as privateEnv } from "$env/dynamic/private";
import { Pool } from "pg";

let catalogPool;

function firstEnv(...values) {
  for (const value of values) {
    const t = String(value ?? "").trim();
    if (t) return t;
  }
  return "";
}

export function getSupabaseUrl() {
  return firstEnv(publicEnv.PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey() {
  return firstEnv(
    publicEnv.PUBLIC_SUPABASE_ANON_KEY,
    publicEnv.PUBLIC_SUPABASE_KEY,
    privateEnv.SUPABASE_ANON_KEY,
    privateEnv.SUPABASE_SERVICE_ROLE_KEY,
    privateEnv.CATALOGO_API_KEY,
  );
}

export function getCatalogUrl() {
  return firstEnv(
    getSupabaseUrl(),
    privateEnv.CATALOGO_ITEMS_URL,
    privateEnv.DATABASE_CATALOGO_URL,
    privateEnv.DATABASE_CATALOGO_PUBLIC_URL,
    privateEnv.CATALOGO_DATABASE_URL,
  );
}

export function isHttpCatalogUrl(url = getCatalogUrl()) {
  return /^https?:\/\//i.test(url);
}

export function isSupabaseCatalog() {
  const url = getCatalogUrl();
  return Boolean(getSupabaseUrl()) || /supabase\.(co|in)/i.test(url);
}

export function isCatalogDbConfigured() {
  return Boolean(getCatalogUrl());
}

export function isCatalogPostgresConfigured() {
  const url = getCatalogUrl();
  return Boolean(url) && !isHttpCatalogUrl(url);
}

export function getCatalogApiKey() {
  return getSupabaseAnonKey();
}

export function getCatalogPool() {
  if (!catalogPool) {
    const connectionString = getCatalogUrl();
    if (!connectionString) {
      throw new Error(
        "Falta PUBLIC_SUPABASE_URL (tabla catalog_items).",
      );
    }
    if (isHttpCatalogUrl(connectionString)) {
      throw new Error(
        "PUBLIC_SUPABASE_URL es HTTP; no se puede usar como PostgreSQL.",
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
