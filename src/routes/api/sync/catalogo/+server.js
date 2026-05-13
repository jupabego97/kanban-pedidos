import { json } from "@sveltejs/kit";
import { sincronizarCatalogoCompleto } from "$lib/server/catalogCache.js";

export async function POST() {
  try {
    const resultado = await sincronizarCatalogoCompleto();
    return json({ ok: true, ...resultado });
  } catch (error) {
    return json(
      {
        ok: false,
        message: "No se pudo sincronizar el catálogo",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}
