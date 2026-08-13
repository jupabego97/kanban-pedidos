import { env } from "$env/dynamic/private";
import {
  catalogQuery,
  getCatalogApiKey,
  getCatalogUrl,
  isCatalogDbConfigured,
  isCatalogPostgresConfigured,
  isHttpCatalogUrl,
} from "$lib/server/catalogDb.js";
import {
  filterByBarcode,
  filterByNombre,
  mapCatalogItem,
  normalizeCatalogPayload,
} from "$lib/server/catalogItemMap.js";
import { query } from "$lib/server/db.js";

export { isCatalogDbConfigured };

const HTTP_CACHE_TTL_MS = 60_000;

/** @type {{ items: ReturnType<typeof mapCatalogItem>[]; expiresAt: number } | null} */
let httpCatalogCache = null;
/** @type {string | null} */
let resolvedPgRelation = null;

function quoteIdentPath(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(name)) {
    throw new Error("Nombre de tabla de catálogo inválido.");
  }
  return name
    .split(".")
    .map((part) => `"${part}"`)
    .join(".");
}

function catalogTableCandidates() {
  const configured = env.CATALOGO_ITEMS_TABLE?.trim();
  if (configured) return [configured.replace(/\//g, ".")];
  return ["catalog_items", "Tables.catalog_items"];
}

function isUndefinedTable(error) {
  return error?.code === "42P01" || /does not exist/i.test(String(error?.message));
}

async function resolveCatalogItemsRelation() {
  if (resolvedPgRelation) return resolvedPgRelation;

  let lastError = null;
  for (const candidate of catalogTableCandidates()) {
    const quoted = quoteIdentPath(candidate);
    try {
      await catalogQuery(`SELECT 1 FROM ${quoted} LIMIT 0`);
      resolvedPgRelation = quoted;
      return resolvedPgRelation;
    } catch (error) {
      lastError = error;
      if (!isUndefinedTable(error)) throw error;
    }
  }

  throw new Error(
    lastError?.message ||
      "No se encontró Tables/catalog_items. Define DATABASE_CATALOGO_URL y, si hace falta, CATALOGO_ITEMS_TABLE.",
  );
}

function escapeLike(value) {
  return String(value ?? "").replace(/[%_\\]/g, "\\$&");
}

/**
 * @param {string} codigo
 */
async function buscarItemsPorCodigoPostgres(codigo) {
  const table = await resolveCatalogItemsRelation();
  const codigoTrim = String(codigo ?? "").trim();
  const { rows } = await catalogQuery(
    `
      SELECT to_jsonb(c) AS item
      FROM ${table} c
      WHERE to_jsonb(c)::text LIKE $1 ESCAPE '\\'
      LIMIT 40
    `,
    [`%${escapeLike(codigoTrim)}%`],
  );
  return filterByBarcode(
    rows.map((row) => mapCatalogItem(row.item)).filter(Boolean),
    codigoTrim,
  );
}

/**
 * @param {string} texto
 */
async function buscarItemsPorNombrePostgres(texto) {
  const table = await resolveCatalogItemsRelation();
  const q = String(texto ?? "").trim();
  const { rows } = await catalogQuery(
    `
      SELECT to_jsonb(c) AS item
      FROM ${table} c
      WHERE to_jsonb(c)::text ILIKE $1 ESCAPE '\\'
      LIMIT 40
    `,
    [`%${escapeLike(q)}%`],
  );
  return filterByNombre(
    rows.map((row) => mapCatalogItem(row.item)).filter(Boolean),
    q,
  );
}

function catalogHttpUrls(base) {
  const cleaned = base.replace(/\/+$/, "");
  const urls = [];
  if (/catalog_items/i.test(cleaned)) {
    urls.push(cleaned);
    if (!cleaned.endsWith(".json")) urls.push(`${cleaned}.json`);
  }
  urls.push(
    `${cleaned}/Tables/catalog_items.json`,
    `${cleaned}/Tables/catalog_items`,
    `${cleaned}/tables/catalog_items`,
  );
  return [...new Set(urls)];
}

function catalogHttpHeaders() {
  /** @type {Record<string, string>} */
  const headers = { Accept: "application/json" };
  const apiKey = getCatalogApiKey();
  if (apiKey) {
    headers.apikey = apiKey;
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

async function loadHttpCatalogItems() {
  if (httpCatalogCache && httpCatalogCache.expiresAt > Date.now()) {
    return httpCatalogCache.items;
  }

  const base = getCatalogUrl();
  const headers = catalogHttpHeaders();
  let lastError = new Error("No se pudo leer Tables/catalog_items.");

  for (const url of catalogHttpUrls(base)) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        lastError = new Error(
          `Catálogo ${response.status} al consultar ${url.replace(base, "")}`,
        );
        continue;
      }
      const payload = await response.json();
      const items = normalizeCatalogPayload(payload);
      httpCatalogCache = {
        items,
        expiresAt: Date.now() + HTTP_CACHE_TTL_MS,
      };
      return items;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError;
}

/**
 * @param {string} codigo
 */
export async function buscarItemsPorCodigo(codigo) {
  if (isHttpCatalogUrl()) {
    return filterByBarcode(await loadHttpCatalogItems(), codigo);
  }
  return buscarItemsPorCodigoPostgres(codigo);
}

/**
 * @param {string} texto
 */
export async function buscarItemsPorNombre(texto) {
  if (isHttpCatalogUrl()) {
    return filterByNombre(await loadHttpCatalogItems(), texto);
  }
  return buscarItemsPorNombrePostgres(texto);
}

/** Lista distinta de proveedores desde facturas_proveedor. */
export async function listarNombresProveedorCatalogo() {
  if (!isCatalogPostgresConfigured()) return [];
  const { rows } = await catalogQuery(`
    SELECT DISTINCT TRIM(proveedor) AS nombre
    FROM facturas_proveedor
    WHERE proveedor IS NOT NULL AND TRIM(proveedor) <> ''
    ORDER BY nombre ASC
  `);
  return rows.map((r) => String(r.nombre).trim()).filter(Boolean);
}

/** Copia proveedores del catálogo a la tabla local (FK de solicitudes). */
export async function sincronizarProveedoresLocales() {
  const nombres = await listarNombresProveedorCatalogo();

  if (nombres.length === 0) {
    await query(`DELETE FROM proveedores`);
    return 0;
  }

  await query(
    `
      INSERT INTO proveedores (alegra_id, nombre, dias_entrega, actualizado_en)
      SELECT 'catalog:' || n, n, NULL, NOW()
      FROM unnest($1::text[]) AS n
      ON CONFLICT (nombre)
      DO UPDATE SET actualizado_en = NOW()
    `,
    [nombres],
  );

  await query(
    `
      DELETE FROM proveedores
      WHERE NOT (nombre = ANY($1::text[]))
    `,
    [nombres],
  );

  return nombres.length;
}
