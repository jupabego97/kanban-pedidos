import { catalogQuery } from "$lib/server/catalogDb.js";

export { isCatalogDbConfigured } from "$lib/server/catalogDb.js";
import { query } from "$lib/server/db.js";

const ITEMS_SELECT = `
  SELECT
    id,
    nombre,
    codigo_barras,
    familia
  FROM items
`;

/**
 * @param {string} codigo
 */
export async function buscarItemsPorCodigo(codigo) {
  const { rows } = await catalogQuery(
    `
      ${ITEMS_SELECT}
      WHERE codigo_barras = $1
         OR CAST(id AS TEXT) = $1
      ORDER BY nombre ASC
      LIMIT 8
    `,
    [codigo],
  );
  return rows.map(mapItemRow);
}

/**
 * @param {string} texto
 */
export async function buscarItemsPorNombre(texto) {
  const patron = `%${texto}%`;
  const { rows } = await catalogQuery(
    `
      ${ITEMS_SELECT}
      WHERE nombre ILIKE $1
         OR codigo_barras ILIKE $1
         OR familia ILIKE $1
      ORDER BY nombre ASC
      LIMIT 8
    `,
    [patron],
  );
  return rows.map(mapItemRow);
}

/** @param {Record<string, unknown>} row */
function mapItemRow(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    barcode: row.codigo_barras ?? null,
    referencia: row.familia ?? null,
    proveedor_id: null,
    proveedores: null,
  };
}

/** Lista distinta de proveedores desde facturas_proveedor. */
export async function listarNombresProveedorCatalogo() {
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
