import { query } from "$lib/server/db";
import {
  isCatalogDbConfigured,
  sincronizarProveedoresLocales,
} from "$lib/server/catalogSources.js";

const CACHE_TTL_MINUTES = 30;
const CACHE_TTL_MS = CACHE_TTL_MINUTES * 60 * 1000;

/** Evita COUNT/MAX/sync en cada request dentro del mismo proceso. */
let lastCheckedAt = 0;

export async function cacheVacio(tabla) {
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM ${tabla}`);
  return rows[0]?.total === 0;
}

export async function cacheExpirado(tabla) {
  const { rows } = await query(`
    SELECT MAX(actualizado_en) AS ultimo
    FROM ${tabla}
  `);

  const ultimo = rows[0]?.ultimo ? new Date(rows[0].ultimo) : null;
  if (!ultimo) return true;

  const limite = Date.now() - CACHE_TTL_MINUTES * 60 * 1000;
  return ultimo.getTime() < limite;
}

/**
 * @param {boolean} force
 * @returns {Promise<{ syncError: Error | null }>}
 */
export async function maybeRefreshProveedores(force = false) {
  if (!isCatalogDbConfigured()) {
    return {
      syncError: new Error("PUBLIC_SUPABASE_URL no configurada (catalog_items)"),
    };
  }

  if (!force && lastCheckedAt && Date.now() - lastCheckedAt < CACHE_TTL_MS) {
    return { syncError: null };
  }

  const vacio = await cacheVacio("proveedores");
  const expirado = vacio ? true : await cacheExpirado("proveedores");
  lastCheckedAt = Date.now();

  if (!force && !vacio && !expirado) {
    return { syncError: null };
  }

  if (!force && !vacio && expirado) {
    sincronizarProveedoresLocales().catch((err) => {
      console.warn("[catalog] refresh en segundo plano:", err?.message || err);
    });
    return { syncError: null };
  }

  try {
    await sincronizarProveedoresLocales();
    lastCheckedAt = Date.now();
    return { syncError: null };
  } catch (err) {
    return {
      syncError: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/** Refresca proveedores desde facturas_proveedor del catálogo. */
export async function sincronizarCatalogoCompleto() {
  if (!isCatalogDbConfigured()) {
    throw new Error("PUBLIC_SUPABASE_URL no configurada");
  }
  const proveedores = await sincronizarProveedoresLocales();
  return { proveedores, productos: 0, completo: true };
}
