import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";

export async function GET() {
  try {
    const { rows } = await query(
      `
        SELECT id, nombre, dias_entrega
        FROM proveedores
        ORDER BY nombre ASC
      `,
    );
    return json(rows);
  } catch (error) {
    return json(
      {
        message: "No se pudieron cargar los proveedores",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}
