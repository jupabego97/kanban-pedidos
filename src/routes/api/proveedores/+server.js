import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";
import { maybeRefreshProveedores } from "$lib/server/catalogCache.js";
import { isCatalogDbConfigured } from "$lib/server/catalogDb.js";

export async function GET({ url }) {
  if (!isCatalogDbConfigured()) {
    return json(
      {
        message: "Catálogo no configurado",
        detail: "Define DATABASE_CATALOGO_URL en el entorno.",
      },
      { status: 503 },
    );
  }

  try {
    const force = url.searchParams.get("refresh") === "1";
    const { syncError } = await maybeRefreshProveedores(force);

    if (syncError && force) {
      return json(
        {
          message: "No se pudieron sincronizar los proveedores",
          detail: syncError.message,
        },
        { status: 500 },
      );
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
