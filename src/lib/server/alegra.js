import { env } from "$env/dynamic/private";

const DEFAULT_API_URL = "https://api.alegra.com/api/v1";

function getConfig() {
  const user = env.ALEGRA_USER;
  const token = env.ALEGRA_TOKEN;
  const baseUrl = (env.ALEGRA_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");

  if (!user || !token) {
    throw new Error("Faltan ALEGRA_USER o ALEGRA_TOKEN");
  }

  return { user, token, baseUrl };
}

export function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function alegraFetch(path, params = {}) {
  const { user, token, baseUrl } = getConfig();
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const auth = Buffer.from(`${user}:${token}`).toString("base64");
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Alegra ${response.status}: ${detail}`);
  }

  return response.json();
}

/**
 * Pagina resultados de Alegra (start/limit).
 * @param {string} path
 * @param {Record<string, string | number>} baseParams
 * @param {{ pageSize?: number; hardCap?: number }} opts
 * @returns {Promise<{ items: unknown[]; completado: boolean }>}
 */
export async function alegraPaginado(path, baseParams = {}, opts = {}) {
  const pageSize = opts.pageSize ?? 30;
  const hardCap = opts.hardCap ?? 50000;
  /** @type {unknown[]} */
  const all = [];
  let start = 0;
  let completado = true;

  while (true) {
    if (start >= hardCap) {
      completado = false;
      break;
    }

    const payload = await alegraFetch(path, {
      ...baseParams,
      start,
      limit: pageSize,
    });
    const chunk = toArray(payload);
    if (!chunk.length) break;

    all.push(...chunk);
    if (chunk.length < pageSize) break;
    start += pageSize;
  }

  return { items: all, completado };
}

function mapProveedor(item) {
  const nombre =
    item?.name ||
    item?.nombre ||
    item?.fullName ||
    item?.legalName ||
    item?.commercialName;

  if (!nombre) return null;

  return {
    alegra_id: String(item.id),
    nombre: String(nombre).trim(),
    dias_entrega: null,
  };
}

/** @param {unknown} item */
function tiposContacto(item) {
  const t = /** @type {{ type?: unknown }} */ (item).type;
  if (Array.isArray(t)) return t.map((x) => String(x).toLowerCase());
  if (t == null || t === "") return [];
  return [String(t).toLowerCase()];
}

/** Excluye contactos cuyo tipo es únicamente "client". */
function esExclusivamenteCliente(types) {
  return types.length === 1 && types[0] === "client";
}

function pickStr(v) {
  if (v == null) return "";
  const s = String(v).trim();
  return s || "";
}

function mapProducto(item) {
  const row = /** @type {Record<string, unknown>} */ (item);
  const nombre = row?.name || row?.nombre;
  if (!nombre) return null;

  let proveedorAlegraId = null;
  const provider = /** @type {{ id?: unknown } | undefined} */ (row.provider);
  const supplier = /** @type {{ id?: unknown } | undefined} */ (row.supplier);
  const contact = /** @type {{ id?: unknown } | undefined} */ (row.contact);
  if (provider?.id) proveedorAlegraId = String(provider.id);
  else if (supplier?.id) proveedorAlegraId = String(supplier.id);
  else if (contact?.id) proveedorAlegraId = String(contact.id);
  else if (row.providerId) proveedorAlegraId = String(row.providerId);

  const barcode = pickStr(row.barCode ?? row.barcode ?? row.ean ?? row.ean13);
  const referencia = pickStr(row.reference ?? row.ref ?? row.sku ?? row.code);

  return {
    alegra_id: String(row.id),
    nombre: String(nombre).trim(),
    proveedor_alegra_id: proveedorAlegraId,
    barcode: barcode || null,
    referencia: referencia || null,
  };
}

/** Todos los contactos excepto los que son exclusivamente cliente. */
export async function obtenerProveedoresAlegra() {
  const { items, completado } = await alegraPaginado(
    "/contacts",
    { order_direction: "ASC" },
    { pageSize: 30, hardCap: 50000 },
  );

  if (!completado) {
    console.warn(
      "[alegra] obtenerProveedoresAlegra: paginación alcanzó hardCap; puede haber más contactos.",
    );
  }

  return toArray(items)
    .filter((raw) => !esExclusivamenteCliente(tiposContacto(raw)))
    .map(mapProveedor)
    .filter(Boolean);
}

/**
 * Descarga todos los ítems de Alegra (paginado).
 * @returns {Promise<{ productos: ReturnType<typeof mapProducto>[]; completo: boolean }>}
 */
export async function obtenerProductosAlegraFull() {
  const pageSize = 30;
  const hardCap = 50000;
  /** @type {NonNullable<ReturnType<typeof mapProducto>>[]} */
  const productos = [];
  let start = 0;
  let completo = true;

  while (true) {
    if (start >= hardCap) {
      completo = false;
      break;
    }

    try {
      const payload = await alegraFetch("/items", {
        start,
        limit: pageSize,
        order_direction: "ASC",
      });
      const chunk = toArray(payload);
      if (!chunk.length) break;

      for (const raw of chunk) {
        const p = mapProducto(raw);
        if (p) productos.push(p);
      }

      if (chunk.length < pageSize) break;
      start += pageSize;
    } catch (err) {
      console.warn("[alegra] obtenerProductosAlegraFull: error en página", {
        start,
        message: err?.message,
      });
      completo = false;
      break;
    }
  }

  return { productos, completo };
}
