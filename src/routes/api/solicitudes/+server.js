import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";

export async function GET() {
  try {
    const { rows } = await query(
      `
        SELECT
          s.*,
          CASE
            WHEN p.id IS NULL THEN NULL
            ELSE json_build_object(
              'nombre', p.nombre,
              'dias_entrega', p.dias_entrega
            )
          END AS proveedores
        FROM solicitudes s
        LEFT JOIN proveedores p ON p.id = s.proveedor_id
        ORDER BY s.creado_en DESC
      `,
    );
    return json(rows);
  } catch (error) {
    return json(
      {
        message: "No se pudieron cargar las solicitudes",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST({ request }) {
  try {
    const payload = await request.json();
    const {
      producto_nombre,
      tipo,
      proveedor_id = null,
      contacto_cliente = null,
      cantidad_pedida = 1,
      estado = "solicitudes",
    } = payload;

    const { rows } = await query(
      `
        INSERT INTO solicitudes (
          producto_nombre,
          tipo,
          proveedor_id,
          contacto_cliente,
          cantidad_pedida,
          estado
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        producto_nombre?.trim(),
        tipo,
        proveedor_id,
        contacto_cliente?.trim() || null,
        cantidad_pedida,
        estado,
      ],
    );

    return json(rows[0], { status: 201 });
  } catch (error) {
    return json(
      { message: "No se pudo crear la solicitud", detail: error.message },
      { status: 500 },
    );
  }
}
