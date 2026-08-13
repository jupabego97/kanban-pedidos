import { pareceCodigoBarras } from "../pareceCodigoBarras.js";

const NOMBRE_KEYS = [
  "nombre",
  "name",
  "product_name",
  "producto",
  "producto_nombre",
  "item_name",
  "Nombre",
  "Name",
  "descripcion",
  "description",
  "title",
];

const BARCODE_KEYS = [
  "codigo_barras",
  "codigoBarras",
  "codigo_de_barras",
  "codigodebarras",
  "codigobarras",
  "barcode",
  "barCode",
  "ean",
  "ean13",
  "EAN",
  "codigo",
  "gtin",
];

const REF_KEYS = [
  "referencia",
  "reference",
  "ref",
  "sku",
  "familia",
  "family_name",
  "FAMILIA",
];

const PROVEEDOR_KEYS = [
  "preferred_supplier_name",
  "PROVEEDOR",
  "proveedor",
  "supplier",
];

/** @param {unknown} v */
function maybeParseJson(v) {
  if (v && typeof v === "object") return v;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** @param {string} key */
function normalizeKey(key) {
  return String(key)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Convierte customFields de Alegra [{ name, value }] en claves planas.
 * @param {Record<string, unknown>} obj
 */
function flattenCustomFields(obj) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of ["customFields", "custom_fields"]) {
    const fields = obj[key];
    if (!Array.isArray(fields)) continue;
    for (const field of fields) {
      if (!field || typeof field !== "object") continue;
      const rec = /** @type {Record<string, unknown>} */ (field);
      const name = rec.name ?? rec.key ?? rec.label;
      const value = rec.value ?? rec.valor;
      if (name == null || value == null || String(value).trim() === "") continue;
      const label = String(name);
      out[label] = value;
      out[normalizeKey(label)] = value;
    }
  }
  return out;
}

/**
 * Une columnas del registro con JSON anidado (data, payload, etc.).
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
export function unwrapItem(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  /** @type {Record<string, unknown>} */
  const row = /** @type {Record<string, unknown>} */ (raw);
  /** @type {Record<string, unknown>} */
  let nested = {};
  for (const value of Object.values(row)) {
    const parsed = maybeParseJson(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      nested = { ...nested, ...parsed };
    }
  }
  const custom = {
    ...flattenCustomFields(nested),
    ...flattenCustomFields(row),
  };
  const merged = { ...nested, ...row, ...custom };
  /** @type {Record<string, unknown>} */
  const withNormalized = { ...merged };
  for (const [key, value] of Object.entries(merged)) {
    withNormalized[normalizeKey(key)] = value;
  }
  return withNormalized;
}

/** @param {Record<string, unknown>} obj @param {string[]} keys */
function firstString(obj, keys) {
  for (const key of keys) {
    const value = obj[key] ?? obj[normalizeKey(key)];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

/**
 * @typedef {{
 *   id: unknown;
 *   nombre: string;
 *   barcode: string | null;
 *   referencia: string | null;
 *   proveedor_id: null;
 *   proveedores: { nombre: string } | null;
 * }} CatalogItem
 */

/**
 * @param {unknown} raw
 * @param {string | number} [fallbackId]
 * @returns {CatalogItem | null}
 */
export function mapCatalogItem(raw, fallbackId) {
  const obj = unwrapItem(raw);
  const nombre = firstString(obj, NOMBRE_KEYS);
  const barcodeFromFields = firstString(obj, BARCODE_KEYS);
  const barcode =
    barcodeFromFields ||
    (pareceCodigoBarras(fallbackId) ? String(fallbackId).trim() : "");
  if (!nombre) return null;

  const proveedorNombre = firstString(obj, PROVEEDOR_KEYS);
  return {
    id: obj.id ?? fallbackId ?? barcode ?? nombre,
    nombre,
    barcode: barcode || null,
    referencia: firstString(obj, REF_KEYS) || null,
    proveedor_id: null,
    proveedores: proveedorNombre ? { nombre: proveedorNombre } : null,
  };
}

/**
 * Normaliza un JSON de catálogo (lista, { data }, o mapa id → producto).
 * @param {unknown} payload
 */
export function normalizeCatalogPayload(payload) {
  if (Array.isArray(payload)) {
    return payload
      .map((row, index) => mapCatalogItem(row, index))
      .filter(Boolean);
  }
  if (!payload || typeof payload !== "object") return [];

  const asRecord = /** @type {Record<string, unknown>} */ (payload);
  for (const key of ["data", "records", "items", "rows", "results"]) {
    if (Array.isArray(asRecord[key])) {
      return normalizeCatalogPayload(asRecord[key]);
    }
  }

  return Object.entries(asRecord)
    .map(([key, value]) => {
      if (value && typeof value === "object") {
        return mapCatalogItem({ id: key, ...value }, key);
      }
      if (typeof value === "string" && value.trim()) {
        return mapCatalogItem(
          { id: key, nombre: value, codigo_barras: key },
          key,
        );
      }
      return null;
    })
    .filter(Boolean);
}

/** @param {unknown} left @param {unknown} right */
function mismosCodigos(left, right) {
  const a = String(left ?? "").trim();
  const b = String(right ?? "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const stripA = a.replace(/^0+/, "") || "0";
  const stripB = b.replace(/^0+/, "") || "0";
  return stripA === stripB;
}

/**
 * @param {(CatalogItem | null)[]} items
 * @param {string} codigo
 * @returns {CatalogItem[]}
 */
export function filterByBarcode(items, codigo) {
  const code = String(codigo ?? "").trim();
  if (!code) return [];
  return items
    .filter(
      (item) =>
        item &&
        (mismosCodigos(item.barcode, code) || mismosCodigos(item.id, code)),
    )
    .slice(0, 8);
}

/**
 * @param {(CatalogItem | null)[]} items
 * @param {string} texto
 * @returns {CatalogItem[]}
 */
export function filterByNombre(items, texto) {
  const q = String(texto ?? "").trim().toLowerCase();
  if (!q) return [];
  return items
    .filter((item) => {
      if (!item) return false;
      return (
        item.nombre.toLowerCase().includes(q) ||
        String(item.barcode ?? "")
          .toLowerCase()
          .includes(q)
      );
    })
    .slice(0, 8);
}
