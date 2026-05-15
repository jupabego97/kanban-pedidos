import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";
import { sincronizarProveedoresLocales } from "$lib/server/catalogSources.js";
import { isCatalogDbConfigured } from "$lib/server/catalogDb.js";

export async function GET() {
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
    await sincronizarProveedoresLocales();

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
