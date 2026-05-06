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

function toArray(payload) {
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

function mapProducto(item) {
  const nombre = item?.name || item?.nombre;
  if (!nombre) return null;

  let proveedorAlegraId = null;
  if (item?.provider?.id) proveedorAlegraId = String(item.provider.id);
  else if (item?.supplier?.id) proveedorAlegraId = String(item.supplier.id);
  else if (item?.contact?.id) proveedorAlegraId = String(item.contact.id);
  else if (item?.providerId) proveedorAlegraId = String(item.providerId);

  return {
    alegra_id: String(item.id),
    nombre: String(nombre).trim(),
    proveedor_alegra_id: proveedorAlegraId,
  };
}

export async function obtenerProveedoresAlegra() {
  const payload = await alegraFetch("/contacts", {
    order_direction: "ASC",
    type: "provider",
    start: 0,
    limit: 200,
  });

  return toArray(payload).map(mapProveedor).filter(Boolean);
}

export async function buscarProductosAlegra(query) {
  const payload = await alegraFetch("/items", {
    start: 0,
    limit: 200,
  });

  const texto = query.trim().toLowerCase();
  return toArray(payload)
    .map(mapProducto)
    .filter(Boolean)
    .filter((item) => item.nombre.toLowerCase().includes(texto));
}
