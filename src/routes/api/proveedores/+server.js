import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";
import { maybeRefreshProveedores } from "$lib/server/catalogCache.js";

export async function GET({ url }) {
  try {
    const force = url.searchParams.get("refresh") === "1";
    const { syncError } = await maybeRefreshProveedores(force);

    const { rows } = await query(
      `
        SELECT id, nombre, dias_entrega
        FROM proveedores
        ORDER BY nombre ASC
      `,
    );

    if (rows.length === 0 && syncError) {
      throw new Error(
        `Fallo de sincronización con Alegra: ${syncError.message}`,
      );
    }

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
