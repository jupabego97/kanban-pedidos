import {
  getCatalogUrl,
  getSupabaseAnonKey,
  isSupabaseCatalog,
} from "$lib/server/catalogDb.js";
import {
  filterByBarcode,
  filterByNombre,
  mapCatalogItem,
} from "$lib/server/catalogItemMap.js";

const TABLE = "catalog_items";
const BARCODE_COLUMNS = [
  "codigo_barras",
  "barcode",
  "barCode",
  "ean",
  "ean13",
  "codigo",
];
const NAME_COLUMNS = ["nombre", "name", "product_name", "producto"];

/** @type {string | null} */
let barcodeColumn = null;
/** @type {string | null} */
let nombreColumn = null;

function restUrl(params) {
  const base = getCatalogUrl().replace(/\/+$/, "");
  const url = new URL(`${base}/rest/v1/${TABLE}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function restHeaders() {
  const key = getSupabaseAnonKey();
  if (!key) {
    throw new Error(
      "Falta PUBLIC_SUPABASE_ANON_KEY para consultar catalog_items en Supabase.",
    );
  }
  return {
    Accept: "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

/**
 * @param {Record<string, string>} params
 * @returns {Promise<{ ok: boolean; status: number; data: unknown }>}
 */
async function restGet(params) {
  const response = await fetch(restUrl(params), { headers: restHeaders() });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = await response.text().catch(() => "");
  }
  return { ok: response.ok, status: response.status, data };
}

function errorDetail(data) {
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "message" in data) {
    const message = /** @type {{ message?: unknown }} */ (data).message;
    if (message != null) return String(message);
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function mapRows(data) {
  if (!Array.isArray(data)) return [];
  return data.map((row) => mapCatalogItem(row)).filter(Boolean);
}

/** @param {unknown} rows */
function rememberColumnsFrom(rows) {
  const first = Array.isArray(rows) ? rows[0] : null;
  if (!first || typeof first !== "object") return;
  const keys = Object.keys(first);
  if (!barcodeColumn) {
    barcodeColumn = BARCODE_COLUMNS.find((col) => keys.includes(col)) ?? null;
  }
  if (!nombreColumn) {
    nombreColumn = NAME_COLUMNS.find((col) => keys.includes(col)) ?? null;
  }
}

/**
 * @param {string} codigo
 */
export async function buscarItemsPorCodigoSupabase(codigo) {
  if (!isSupabaseCatalog()) {
    throw new Error("Catálogo de Supabase no configurado.");
  }
  const code = String(codigo ?? "").trim();
  const columns = barcodeColumn ? [barcodeColumn] : BARCODE_COLUMNS;

  for (const column of columns) {
    const result = await restGet({
      [column]: `eq.${code}`,
      select: "*",
      limit: "8",
    });
    if (!result.ok) continue;
    rememberColumnsFrom(result.data);
    const mapped = mapRows(result.data);
    if (mapped.length > 0) {
      barcodeColumn = column;
      return mapped;
    }
  }

  const fallback = await restGet({ select: "*", limit: "500" });
  if (!fallback.ok) {
    throw new Error(
      `No se pudo leer catalog_items (${fallback.status}): ${errorDetail(fallback.data)}`,
    );
  }
  rememberColumnsFrom(fallback.data);
  return filterByBarcode(mapRows(fallback.data), code);
}

/**
 * @param {string} texto
 */
export async function buscarItemsPorNombreSupabase(texto) {
  if (!isSupabaseCatalog()) {
    throw new Error("Catálogo de Supabase no configurado.");
  }
  const q = String(texto ?? "").trim().replace(/[%_*,()]/g, " ");
  const columns = nombreColumn ? [nombreColumn] : NAME_COLUMNS;

  for (const column of columns) {
    const result = await restGet({
      [column]: `ilike.*${q}*`,
      select: "*",
      limit: "8",
    });
    if (!result.ok) continue;
    rememberColumnsFrom(result.data);
    const mapped = mapRows(result.data);
    if (mapped.length > 0) {
      nombreColumn = column;
      return mapped;
    }
  }

  const fallback = await restGet({ select: "*", limit: "500" });
  if (!fallback.ok) {
    throw new Error(
      `No se pudo leer catalog_items (${fallback.status}): ${errorDetail(fallback.data)}`,
    );
  }
  rememberColumnsFrom(fallback.data);
  return filterByNombre(mapRows(fallback.data), texto);
}
