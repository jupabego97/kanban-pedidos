function toUserError(error, fallback) {
  const partes = [error?.message, error?.detail].filter(Boolean);
  if (partes.length > 0) return new Error(partes.join(": "));
  return new Error(fallback);
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw toUserError(body || {}, "Error de comunicacion con el servidor");
  }

  return body;
}

// ─── PROVEEDORES ────────────────────────────────────────────
/** @param {{ refresh?: boolean }} [opts] */
export async function getProveedores(opts = {}) {
  const q = opts.refresh ? "?refresh=1" : "";
  return apiFetch(`/api/proveedores${q}`);
}

// ─── CATÁLOGO (autocompletado) ───────────────────────────────
/** @param {string} query */
export async function buscarProductos(query) {
  const t = (query || "").trim();
  const soloDigitosLargo = t.length >= 6 && /^\d+$/.test(t);
  if (t.length < 2 && !soloDigitosLargo) return [];
  const params = new URLSearchParams();
  if (soloDigitosLargo) {
    params.set("barcode", t);
  }
  params.set("query", t);
  return apiFetch(`/api/productos?${params.toString()}`);
}

// ─── SOLICITUDES ─────────────────────────────────────────────
export async function getSolicitudes() {
  return apiFetch("/api/solicitudes");
}

export async function crearSolicitud(solicitud) {
  return apiFetch("/api/solicitudes", {
    method: "POST",
    body: JSON.stringify(solicitud),
  });
}

export async function actualizarEstado(id, estado) {
  await apiFetch(`/api/solicitudes/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export async function actualizarCantidad(id, cantidad_pedida) {
  await apiFetch(`/api/solicitudes/${id}/cantidad`, {
    method: "PATCH",
    body: JSON.stringify({ cantidad_pedida }),
  });
}

export async function eliminarSolicitud(id) {
  await apiFetch(`/api/solicitudes/${id}`, { method: "DELETE" });
}

// ─── SINCRONIZACION PERIODICA ────────────────────────────────
/**
 * Actualiza la lista de solicitudes cada N segundos.
 * @param {(solicitudes: object[]) => void} callback
 * @param {number} intervalMs
 * @returns {() => void} función para cancelar la suscripción
 */
export function suscribirSolicitudes(callback, intervalMs = 7000) {
  let activo = true;

  const tick = async () => {
    try {
      const data = await getSolicitudes();
      if (activo) callback(data);
    } catch {
      // Evitar romper la UI por fallos transitorios de red.
    }
  };

  const timer = setInterval(tick, intervalMs);

  return () => {
    activo = false;
    clearInterval(timer);
  };
}
