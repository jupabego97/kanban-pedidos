/**
 * Detecta si un texto es un código de barras (solo dígitos, 6 o más).
 * @param {unknown} value
 */
export function pareceCodigoBarras(value) {
  const t = String(value ?? "").trim();
  return t.length >= 6 && /^\d+$/.test(t);
}

/**
 * El código de barras solo se consulta al pulsar Enter, no en cada tecla.
 * Los nombres sí disparan el autocompletado desde 2 caracteres.
 * @param {unknown} value
 */
export function debeBuscarMientrasEscribe(value) {
  const t = String(value ?? "").trim();
  if (pareceCodigoBarras(t)) return false;
  return t.length >= 2;
}

/**
 * Al confirmar el producto del catálogo se rellena el campo; no se envía el faltante.
 * @param {{ nombre?: string, proveedor_id?: number | null } | null | undefined} producto
 * @returns {{ ok: false, error: string } | { ok: true, productoNombre: string, proveedorId: number | null, enviarFaltante: false }}
 */
export function aplicarConfirmacionCatalogo(producto) {
  const nombre = String(producto?.nombre ?? "").trim();
  if (!nombre || pareceCodigoBarras(nombre)) {
    return {
      ok: false,
      error: "No se puede registrar un código de barras como nombre del producto.",
    };
  }
  return {
    ok: true,
    productoNombre: nombre,
    proveedorId: producto?.proveedor_id ?? null,
    enviarFaltante: false,
  };
}
