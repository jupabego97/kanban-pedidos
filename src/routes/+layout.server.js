/** @type {import('./$types').LayoutServerLoad} */
export async function load({ fetch }) {
  try {
    const [solsRes, provsRes] = await Promise.all([
      fetch("/api/solicitudes"),
      fetch("/api/proveedores"),
    ]);

    if (!solsRes.ok) {
      const err = await solsRes.json().catch(() => ({}));
      return {
        solicitudes: [],
        proveedores: [],
        error: err.message || "No se pudieron cargar las solicitudes",
      };
    }

    if (!provsRes.ok) {
      const err = await provsRes.json().catch(() => ({}));
      return {
        solicitudes: [],
        proveedores: [],
        error: err.message || "No se pudieron cargar los proveedores",
      };
    }

    const [solicitudes, proveedores] = await Promise.all([
      solsRes.json(),
      provsRes.json(),
    ]);

    return { solicitudes, proveedores, error: "" };
  } catch (error) {
    return {
      solicitudes: [],
      proveedores: [],
      error: error instanceof Error ? error.message : "No se pudieron cargar los datos iniciales.",
    };
  }
}
