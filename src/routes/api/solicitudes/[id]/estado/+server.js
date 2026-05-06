import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";

export async function PATCH({ params, request }) {
  try {
    const { estado } = await request.json();
    await query(
      `
        UPDATE solicitudes
        SET estado = $1
        WHERE id = $2
      `,
      [estado, params.id],
    );
    return json({ ok: true });
  } catch (error) {
    return json(
      { message: "No se pudo actualizar el estado", detail: error.message },
      { status: 500 },
    );
  }
}
