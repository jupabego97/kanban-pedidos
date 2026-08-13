import {
  catalogQuery,
  getCatalogApiKey,
  getCatalogUrl,
  isCatalogDbConfigured,
  isCatalogPostgresConfigured,
  isHttpCatalogUrl,
  isSupabaseCatalog,
} from "$lib/server/catalogDb.js";
import {
  barcodeWhereSql,
  discoverCatalogSource,
  escapeLike,
  nombreWhereSql,
} from "$lib/server/catalogDiscover.js";
import {
  filterByBarcode,
  filterByNombre,
  mapCatalogItem,
  normalizeCatalogPayload,
} from "$lib/server/catalogItemMap.js";
import {
  buscarItemsPorCodigoSupabase,
  buscarItemsPorNombreSupabase,
} from "$lib/server/catalogSupabase.js";
import { query } from "$lib/server/db.js";

export { isCatalogDbConfigured };

const HTTP_CACHE_TTL_MS = 60_000;

/** @type {{ items: ReturnType<typeof mapCatalogItem>[]; expiresAt: number } | null} */
let httpCatalogCache = null;

/**
 * @param {string} codigo
 */
async function buscarItemsPorCodigoPostgres(codigo) {
  const source = await discoverCatalogSource();
  const codigoTrim = String(codigo ?? "").trim();
  const { rows } = await catalogQuery(
    `
      SELECT to_jsonb(c) AS item
      FROM ${source.quoted} c
      WHERE ${barcodeWhereSql(source, 1)}
      LIMIT 40
    `,
    [codigoTrim],
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
  const source = await discoverCatalogSource();
  const q = String(texto ?? "").trim();
  const { rows } = await catalogQuery(
    `
      SELECT to_jsonb(c) AS item
      FROM ${source.quoted} c
      WHERE ${nombreWhereSql(source, 1)}
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
    `${cleaned}/rest/v1/catalog_items`,
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
  if (isCatalogPostgresConfigured()) {
    return buscarItemsPorCodigoPostgres(codigo);
  }
  if (isSupabaseCatalog()) {
    return buscarItemsPorCodigoSupabase(codigo);
  }
  if (isHttpCatalogUrl()) {
    return filterByBarcode(await loadHttpCatalogItems(), codigo);
  }
  return buscarItemsPorCodigoPostgres(codigo);
}

/**
 * @param {string} texto
 */
export async function buscarItemsPorNombre(texto) {
  if (isCatalogPostgresConfigured()) {
    return buscarItemsPorNombrePostgres(texto);
  }
  if (isSupabaseCatalog()) {
    return buscarItemsPorNombreSupabase(texto);
  }
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
  if (!isCatalogPostgresConfigured()) return 0;

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
