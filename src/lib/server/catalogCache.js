import { query } from "$lib/server/db";

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
          actualizado_en
        )
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (alegra_id)
        DO UPDATE SET
          nombre = EXCLUDED.nombre,
          proveedor_id = COALESCE(EXCLUDED.proveedor_id, productos_catalogo.proveedor_id),
          proveedor_alegra_id = EXCLUDED.proveedor_alegra_id,
          actualizado_en = NOW()
      `,
      [item.alegra_id, item.nombre, proveedorId, item.proveedor_alegra_id],
    );
  }
}
