import { query } from "$lib/server/db";
import {
  obtenerProductosAlegraFull,
  obtenerProveedoresAlegra,
} from "$lib/server/alegra.js";

const CACHE_TTL_MINUTES = 30;
const CACHE_TTL_PRODUCTOS_MS = 6 * 60 * 60 * 1000;

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

/** Catálogo de productos: TTL largo (6 h) para sync completo. */
export async function cacheExpiradoProductos() {
  const { rows } = await query(`
    SELECT MAX(actualizado_en) AS ultimo
    FROM productos_catalogo
  `);

  const ultimo = rows[0]?.ultimo ? new Date(rows[0].ultimo) : null;
  if (!ultimo) return true;

  const limite = Date.now() - CACHE_TTL_PRODUCTOS_MS;
  return ultimo.getTime() < limite;
}

export async function guardarProveedores(items) {
  for (const item of items) {
    await query(
      `
        INSERT INTO proveedores (alegra_id, nombre, dias_entrega, actualizado_en)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (alegra_id)
        DO UPDATE SET
          nombre = EXCLUDED.nombre,
          dias_entrega = COALESCE(EXCLUDED.dias_entrega, proveedores.dias_entrega),
          actualizado_en = NOW()
      `,
      [item.alegra_id, item.nombre, item.dias_entrega],
    );
  }
}

async function proveedorIdPorAlegraId(alegraId) {
  if (!alegraId) return null;
  const { rows } = await query(
    `
      SELECT id
      FROM proveedores
      WHERE alegra_id = $1
      LIMIT 1
    `,
    [alegraId],
  );
  return rows[0]?.id || null;
}

export async function guardarProductos(items) {
  for (const item of items) {
    const proveedorId = await proveedorIdPorAlegraId(item.proveedor_alegra_id);
    await query(
      `
        INSERT INTO productos_catalogo (
          alegra_id,
          nombre,
          proveedor_id,
          proveedor_alegra_id,
          barcode,
          referencia,
          actualizado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (alegra_id)
        DO UPDATE SET
          nombre = EXCLUDED.nombre,
          proveedor_id = COALESCE(EXCLUDED.proveedor_id, productos_catalogo.proveedor_id),
          proveedor_alegra_id = EXCLUDED.proveedor_alegra_id,
          barcode = EXCLUDED.barcode,
          referencia = EXCLUDED.referencia,
          actualizado_en = NOW()
      `,
      [
        item.alegra_id,
        item.nombre,
        proveedorId,
        item.proveedor_alegra_id,
        item.barcode ?? null,
        item.referencia ?? null,
      ],
    );
  }
}

/**
 * Sincroniza todo el catálogo de ítems desde Alegra y elimina filas obsoletas si el sync fue completo.
 * @returns {Promise<{ total: number; completo: boolean }>}
 */
export async function sincronizarProductosCompleto() {
  const syncStart = new Date();
  const { productos, completo } = await obtenerProductosAlegraFull();

  if (productos.length > 0) {
    await guardarProductos(productos);
  }

  if (completo && productos.length > 0) {
    await query(`DELETE FROM productos_catalogo WHERE actualizado_en < $1`, [
      syncStart,
    ]);
  }

  return { total: productos.length, completo };
}

/**
 * Sincroniza proveedores (contactos no exclusivamente cliente) y catálogo de productos.
 * @returns {Promise<{ proveedores: number; productos: number; completo: boolean }>}
 */
export async function sincronizarCatalogoCompleto() {
  const proveedores = await obtenerProveedoresAlegra();
  if (proveedores.length > 0) {
    await guardarProveedores(proveedores);
  }
  const { total, completo } = await sincronizarProductosCompleto();
  return {
    proveedores: proveedores.length,
    productos: total,
    completo,
  };
}
