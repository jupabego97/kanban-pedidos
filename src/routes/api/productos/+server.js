import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";
import {
  cacheExpiradoProductos,
  cacheVacio,
  sincronizarProductosCompleto,
} from "$lib/server/catalogCache.js";

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

export async function GET({ url }) {
  const rawBarcode = url.searchParams.get("barcode")?.trim() || "";
  const rawQuery = url.searchParams.get("query")?.trim() || "";

  const barcodeParam =
    rawBarcode.length >= 6
      ? rawBarcode
      : esSoloDigitosLargo(rawQuery)
        ? rawQuery.trim()
        : "";

  const minNombre = rawQuery.length >= 2;
  if (!barcodeParam && !minNombre) return json([]);

  try {
    const vacio = await cacheVacio("productos_catalogo");
    const expirado = await cacheExpiradoProductos();

    if (vacio) {
      await sincronizarProductosCompleto();
    } else if (expirado) {
      void sincronizarProductosCompleto().catch((e) => {
        console.warn(
          "[api/productos] sync en segundo plano falló:",
          e?.message || e,
        );
      });
    }

    const patronNombre = minNombre ? `%${rawQuery}%` : null;

    const { rows } = await query(
      `
        ${SELECT_CATALOGO}
        WHERE
          ($1::text IS NOT NULL AND (pc.barcode = $1 OR pc.referencia = $1))
          OR ($2::text IS NOT NULL AND pc.nombre ILIKE $2)
        ORDER BY
          CASE
            WHEN $1::text IS NOT NULL AND pc.barcode = $1 THEN 0
            WHEN $1::text IS NOT NULL AND pc.referencia = $1 THEN 1
            ELSE 2
          END,
          pc.nombre ASC
        LIMIT 8
      `,
      [barcodeParam || null, patronNombre],
    );

    return json(rows);
  } catch (error) {
    return json(
      { message: "No se pudo consultar el catalogo", detail: error.message },
      { status: 500 },
    );
  }
}
