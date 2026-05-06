import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";

export async function DELETE({ params }) {
  try {
    await query(
      `
        DELETE FROM solicitudes
        WHERE id = $1
      `,
      [params.id],
    );
    return json({ ok: true });
  } catch (error) {
    return json(
      { message: "No se pudo eliminar la solicitud", detail: error.message },
      { status: 500 },
    );
  }
}
