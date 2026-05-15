import { query } from "$lib/server/db";
import {
  isCatalogDbConfigured,
  sincronizarProveedoresLocales,
} from "$lib/server/catalogSources.js";

const CACHE_TTL_MINUTES = 30;

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
      syncError: new Error("DATABASE_CATALOGO_URL no configurada"),
    };
  }

  const debe =
    force ||
    (await cacheVacio("proveedores")) ||
    (await cacheExpirado("proveedores"));

  let syncError = null;
  if (debe) {
    try {
      await sincronizarProveedoresLocales();
    } catch (err) {
      syncError = err instanceof Error ? err : new Error(String(err));
    }
  }
  return { syncError };
}

/** Refresca proveedores desde facturas_proveedor del catálogo. */
export async function sincronizarCatalogoCompleto() {
  if (!isCatalogDbConfigured()) {
    throw new Error("DATABASE_CATALOGO_URL no configurada");
  }
  const proveedores = await sincronizarProveedoresLocales();
  return { proveedores, productos: 0, completo: true };
}
