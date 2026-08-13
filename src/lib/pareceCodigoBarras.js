/**
 * Detecta si un texto es un código de barras (solo dígitos, 6 o más).
 * @param {unknown} value
 */
export function pareceCodigoBarras(value) {
  const t = String(value ?? "").trim();
  return t.length >= 6 && /^\d+$/.test(t);
}
