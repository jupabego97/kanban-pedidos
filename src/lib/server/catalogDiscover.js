import { env } from "$env/dynamic/private";
import { catalogQuery } from "$lib/server/catalogDb.js";

const PREFERRED_TABLES = [
  { schema: "public", name: "catalog_items", score: 100 },
  { schema: "Tables", name: "catalog_items", score: 95 },
  { schema: "public", name: "items", score: 80 },
  { schema: "public", name: "productos_catalogo", score: 55 },
  { schema: "public", name: "productos", score: 40 },
];

const NAME_HINTS = [
  "nombre",
  "name",
  "product_name",
  "producto",
  "descripcion",
  "description",
  "title",
];
const BARCODE_HINTS = [
  "codigo_barras",
  "barcode",
  "bar_code",
  "ean",
  "ean13",
  "gtin",
  "codigo",
];
const JSON_TYPES = new Set(["json", "jsonb"]);

/** @type {CatalogSource | null} */
let cachedSource = null;

/**
 * @typedef {{
 *   schema: string;
 *   table: string;
 *   quoted: string;
 *   barcodeColumns: string[];
 *   nombreColumns: string[];
 *   jsonColumns: string[];
 * }} CatalogSource
 */

function quoteIdent(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Identificador SQL inválido: ${name}`);
  }
  return `"${name}"`;
}

function quoteRelation(schema, table) {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}

function looksLikeNameColumn(columnName) {
  const n = columnName.toLowerCase();
  return NAME_HINTS.includes(n) || n.includes("nombre");
}

function looksLikeBarcodeColumn(columnName) {
  const n = columnName.toLowerCase();
  return (
    BARCODE_HINTS.includes(n) ||
    n.includes("barcode") ||
    n.includes("codigo_barras") ||
    n.includes("ean")
  );
}

/**
 * @param {Array<{ table_schema: string; table_name: string; column_name: string; data_type: string }>} columns
 * @returns {CatalogSource[]}
 */
function groupTables(columns) {
  /** @type {Map<string, CatalogSource>} */
  const tables = new Map();
  for (const col of columns) {
    const key = `${col.table_schema}.${col.table_name}`;
    if (!tables.has(key)) {
      tables.set(key, {
        schema: col.table_schema,
        table: col.table_name,
        quoted: quoteRelation(col.table_schema, col.table_name),
        barcodeColumns: [],
        nombreColumns: [],
        jsonColumns: [],
      });
    }
    const source = tables.get(key);
    if (!source) continue;
    if (JSON_TYPES.has(col.data_type)) source.jsonColumns.push(col.column_name);
    if (looksLikeBarcodeColumn(col.column_name)) {
      source.barcodeColumns.push(col.column_name);
    }
    if (looksLikeNameColumn(col.column_name)) {
      source.nombreColumns.push(col.column_name);
    }
  }
  return [...tables.values()];
}

/** @param {CatalogSource} source */
function scoreSource(source) {
  const preferred = PREFERRED_TABLES.find(
    (item) =>
      item.name === source.table &&
      item.schema.toLowerCase() === source.schema.toLowerCase(),
  );
  let score = preferred?.score ?? 0;
  if (source.table === "catalog_items") score = Math.max(score, 90);
  if (source.barcodeColumns.length) score += 20;
  if (source.nombreColumns.length) score += 20;
  if (source.jsonColumns.length) score += 10;
  return score;
}

/** @param {CatalogSource} source */
function isUsable(source) {
  return (
    source.barcodeColumns.length > 0 ||
    source.nombreColumns.length > 0 ||
    source.jsonColumns.length > 0
  );
}

/**
 * Detecta la tabla de catálogo y las columnas de nombre / código de barras.
 * @returns {Promise<CatalogSource>}
 */
export async function discoverCatalogSource() {
  if (cachedSource) return cachedSource;

  const { rows } = await catalogQuery(
    `
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    `,
  );

  const sources = groupTables(rows).filter(isUsable);
  sources.sort((a, b) => scoreSource(b) - scoreSource(a));

  const configured = env.CATALOGO_ITEMS_TABLE?.trim().replace(/\//g, ".");
  if (configured) {
    const forced = sources.find((source) => {
      const full = `${source.schema}.${source.table}`;
      return source.table === configured || full === configured;
    });
    if (forced) {
      cachedSource = forced;
      console.info("[catalog] tabla forzada", { relation: forced.quoted });
      return forced;
    }
  }

  const chosen = sources[0];
  if (!chosen) {
    throw new Error(
      "No se encontró una tabla de catálogo con nombre y código de barras. Se buscó catalog_items e items en DATABASE_URL.",
    );
  }

  console.info("[catalog] tabla detectada", {
    relation: chosen.quoted,
    barcodeColumns: chosen.barcodeColumns,
    nombreColumns: chosen.nombreColumns,
    jsonColumns: chosen.jsonColumns,
  });

  cachedSource = chosen;
  return chosen;
}

/** @param {string} value */
export function escapeLike(value) {
  return String(value ?? "").replace(/[%_\\]/g, "\\$&");
}

/**
 * @param {CatalogSource} source
 * @param {number} param
 */
export function barcodeWhereSql(source, param = 1) {
  /** @type {string[]} */
  const parts = [];
  for (const col of source.barcodeColumns) {
    const q = quoteIdent(col);
    parts.push(`TRIM(CAST(${q} AS TEXT)) = $${param}`);
    parts.push(
      `TRIM(LEADING '0' FROM COALESCE(TRIM(CAST(${q} AS TEXT)), '')) = TRIM(LEADING '0' FROM $${param})`,
    );
  }
  for (const col of source.jsonColumns) {
    const q = quoteIdent(col);
    parts.push(`${q}->>'codigo_barras' = $${param}`);
    parts.push(`${q}->>'barcode' = $${param}`);
    parts.push(`${q}->>'ean' = $${param}`);
    parts.push(`${q}->>'nombre' ILIKE '%' || $${param} || '%'`);
    parts.push(`CAST(${q} AS TEXT) LIKE '%' || $${param} || '%' ESCAPE '\\'`);
  }
  if (parts.length === 0) {
    parts.push(`to_jsonb(c)::text LIKE '%' || $${param} || '%' ESCAPE '\\'`);
  }
  return parts.join("\n        OR ");
}

/**
 * @param {CatalogSource} source
 * @param {number} param
 */
export function nombreWhereSql(source, param = 1) {
  /** @type {string[]} */
  const parts = [];
  for (const col of source.nombreColumns) {
    const q = quoteIdent(col);
    parts.push(`CAST(${q} AS TEXT) ILIKE $${param} ESCAPE '\\'`);
  }
  for (const col of source.barcodeColumns) {
    const q = quoteIdent(col);
    parts.push(`CAST(${q} AS TEXT) ILIKE $${param} ESCAPE '\\'`);
  }
  for (const col of source.jsonColumns) {
    const q = quoteIdent(col);
    parts.push(`CAST(${q} AS TEXT) ILIKE $${param} ESCAPE '\\'`);
  }
  if (parts.length === 0) {
    parts.push(`to_jsonb(c)::text ILIKE $${param} ESCAPE '\\'`);
  }
  return parts.join("\n        OR ");
}
