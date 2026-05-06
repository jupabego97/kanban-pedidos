import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";
import { obtenerProveedoresAlegra } from "$lib/server/alegra";
import {
  cacheExpirado,
  cacheVacio,
  guardarProveedores,
} from "$lib/server/catalogCache";

export async function GET() {
  try {
    const debeSincronizar =
      (await cacheVacio("proveedores")) || (await cacheExpirado("proveedores"));

    if (debeSincronizar) {
      try {
        const proveedoresAlegra = await obtenerProveedoresAlegra();
        if (proveedoresAlegra.length > 0) {
          await guardarProveedores(proveedoresAlegra);
        }
      } catch (syncError) {
        // Permitir responder desde cache local si Alegra no está disponible.
      }
    }

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
