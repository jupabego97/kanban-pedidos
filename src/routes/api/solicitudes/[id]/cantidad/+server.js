import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";

export async function PATCH({ params, request }) {
  try {
    const { cantidad_pedida } = await request.json();
    await query(
      `
        UPDATE solicitudes
        SET cantidad_pedida = $1
        WHERE id = $2
      `,
      [cantidad_pedida, params.id],
    );
    return json({ ok: true });
  } catch (error) {
    return json(
      { message: "No se pudo actualizar la cantidad", detail: error.message },
      { status: 500 },
    );
  }
}
