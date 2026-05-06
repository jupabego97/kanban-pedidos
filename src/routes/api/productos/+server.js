import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";
import { buscarProductosAlegra } from "$lib/server/alegra";
import { guardarProductos } from "$lib/server/catalogCache";

export async function GET({ url }) {
  const rawQuery = url.searchParams.get("query")?.trim() || "";
  if (rawQuery.length < 2) return json([]);

  try {
    try {
      const productosAlegra = await buscarProductosAlegra(rawQuery);
      if (productosAlegra.length > 0) {
        await guardarProductos(productosAlegra);
      }
    } catch {
      // Si Alegra falla, usar cache local para no interrumpir el autocompletado.
    }

    const { rows } = await query(
      `
        SELECT
          pc.id,
          pc.nombre,
          pc.proveedor_id,
          CASE
            WHEN p.id IS NULL THEN NULL
            ELSE json_build_object('nombre', p.nombre)
          END AS proveedores
        FROM productos_catalogo pc
        LEFT JOIN proveedores p ON p.id = pc.proveedor_id
        WHERE pc.nombre ILIKE $1
        ORDER BY pc.nombre ASC
        LIMIT 8
      `,
      [`%${rawQuery}%`],
    );
    return json(rows);
  } catch (error) {
    return json(
      { message: "No se pudo consultar el catalogo", detail: error.message },
      { status: 500 },
    );
  }
}
