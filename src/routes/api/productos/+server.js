import { json } from "@sveltejs/kit";
import { buscarItemsPorCodigo, buscarItemsPorNombre } from "$lib/server/catalogSources.js";
import { isCatalogDbConfigured } from "$lib/server/catalogDb.js";

/** @param {string} q */
function esSoloDigitosLargo(q) {
  const t = q.trim();
  return t.length >= 6 && /^\d+$/.test(t);
}

export async function GET({ url }) {
  const rawBarcode = url.searchParams.get("barcode")?.trim() || "";
  const rawQuery = url.searchParams.get("query")?.trim() || "";

  const codigo =
    rawBarcode.length >= 1
      ? rawBarcode
      : esSoloDigitosLargo(rawQuery)
        ? rawQuery.trim()
        : "";

  const buscarNombre = rawQuery.length >= 2;
  if (!codigo && !buscarNombre) return json([]);

  if (!isCatalogDbConfigured()) {
    return json(
      {
        message: "Catálogo no configurado",
        detail:
          "Define PUBLIC_SUPABASE_URL. Los productos se leen de catalog_items.",
      },
      { status: 503 },
    );
  }

  try {
    const rows = codigo
      ? await buscarItemsPorCodigo(codigo)
      : await buscarItemsPorNombre(rawQuery);

    return json(rows);
  } catch (error) {
    return json(
      { message: "No se pudo consultar el catalogo", detail: error.message },
      { status: 500 },
    );
  }
}
