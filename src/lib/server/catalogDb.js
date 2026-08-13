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

/** URL de la BD de catálogo. En Railway: DATABASE_URL. */
export function getCatalogUrl() {
  return firstEnv(
    privateEnv.DATABASE_URL,
    privateEnv.DATABASE_PUBLIC_URL,
    privateEnv.DATABASE_CATALOGO_URL,
    privateEnv.DATABASE_CATALOGO_PUBLIC_URL,
    privateEnv.CATALOGO_DATABASE_URL,
    privateEnv.CATALOGO_ITEMS_URL,
    getSupabaseUrl(),
  );
}

export function isHttpCatalogUrl(url = getCatalogUrl()) {
  return /^https?:\/\//i.test(url);
}

export function isCatalogPostgresConfigured() {
  const url = getCatalogUrl();
  return Boolean(url) && !isHttpCatalogUrl(url);
}

export function isSupabaseCatalog() {
  if (isCatalogPostgresConfigured()) return false;
  return Boolean(getSupabaseUrl()) || /supabase\.(co|in)/i.test(getCatalogUrl());
}

export function isCatalogDbConfigured() {
  return Boolean(getCatalogUrl());
}

export function getCatalogApiKey() {
  return getSupabaseAnonKey();
}

export function getCatalogPool() {
  if (!catalogPool) {
    const connectionString = getCatalogUrl();
    if (!connectionString) {
      throw new Error("Falta DATABASE_URL (tabla catalog_items).");
    }
    if (isHttpCatalogUrl(connectionString)) {
      throw new Error(
        "DATABASE_URL no es PostgreSQL; no se puede consultar catalog_items.",
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
