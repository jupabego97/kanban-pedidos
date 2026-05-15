import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";
import { maybeRefreshProductosCatalog } from "$lib/server/catalogCache.js";

const SELECT_CATALOGO = `
  SELECT
    pc.id,
    pc.nombre,
    pc.barcode,
    pc.referencia,
    pc.proveedor_id,
    CASE
      WHEN p.id IS NULL THEN NULL
      ELSE json_build_object('nombre', p.nombre)
    END AS proveedores
  FROM productos_catalogo pc
  LEFT JOIN proveedores p ON p.id = pc.proveedor_id
`;

/** @param {string} q */
function esSoloDigitosLargo(q) {
  const t = q.trim();
  return t.length >= 6 && /^\d+$/.test(t);
}

/** @param {string} codigo */
async function buscarPorCodigo(codigo) {
  const { rows } = await query(
    `
      ${SELECT_CATALOGO}
      WHERE pc.barcode = $1 OR pc.referencia = $1
      ORDER BY (pc.barcode = $1) DESC, pc.nombre ASC
      LIMIT 8
    `,
    [codigo],
  );
  return rows;
}

/** @param {string} texto */
async function buscarPorNombre(texto) {
  const { rows } = await query(
    `
      ${SELECT_CATALOGO}
      WHERE pc.nombre ILIKE $1
      ORDER BY pc.nombre ASC
      LIMIT 8
    `,
    [`%${texto}%`],
  );
  return rows;
}

export async function GET({ url }) {
  const rawBarcode = url.searchParams.get("barcode")?.trim() || "";
  const rawQuery = url.searchParams.get("query")?.trim() || "";

  const codigo =
    rawBarcode.length >= 6
      ? rawBarcode
      : esSoloDigitosLargo(rawQuery)
        ? rawQuery.trim()
        : "";

  const buscarNombre = rawQuery.length >= 2;
  if (!codigo && !buscarNombre) return json([]);

  try {
    await maybeRefreshProductosCatalog();

    const rows = codigo
      ? await buscarPorCodigo(codigo)
      : await buscarPorNombre(rawQuery);

    return json(rows);
  } catch (error) {
    return json(
      { message: "No se pudo consultar el catalogo", detail: error.message },
      { status: 500 },
    );
  }
}
