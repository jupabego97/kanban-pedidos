import { json } from "@sveltejs/kit";
import { query } from "$lib/server/db";

const TIPOS_VALIDOS = new Set(["Agotado", "Nuevo"]);
const ESTADOS_VALIDOS = new Set([
  "solicitudes",
  "analisis",
  "por_pedir",
  "en_camino",
  "recibido",
]);

function validarSolicitud(payload) {
  const producto_nombre = payload.producto_nombre?.trim();
  if (!producto_nombre) {
    return { ok: false, message: "El nombre del producto es obligatorio." };
  }

  const tipo = payload.tipo ?? "Agotado";
  if (!TIPOS_VALIDOS.has(tipo)) {
    return { ok: false, message: "Tipo de solicitud invalido." };
  }

  const estado = payload.estado ?? "solicitudes";
  if (!ESTADOS_VALIDOS.has(estado)) {
    return { ok: false, message: "Estado de solicitud invalido." };
  }

  const cantidad_pedida = Number(payload.cantidad_pedida ?? 1);
  if (!Number.isInteger(cantidad_pedida) || cantidad_pedida < 1) {
    return {
      ok: false,
      message: "La cantidad pedida debe ser un entero positivo.",
    };
  }

  return {
    ok: true,
    data: {
      producto_nombre,
      tipo,
      proveedor_id: payload.proveedor_id ?? null,
      contacto_cliente: payload.contacto_cliente?.trim() || null,
      cantidad_pedida,
      estado,
    },
  };
}

export async function GET() {
  try {
    const { rows } = await query(
      `
        SELECT
          s.*,
          CASE
            WHEN p.id IS NULL THEN NULL
            ELSE json_build_object(
              'nombre', p.nombre,
              'dias_entrega', p.dias_entrega
            )
          END AS proveedores
        FROM solicitudes s
        LEFT JOIN proveedores p ON p.id = s.proveedor_id
        ORDER BY s.creado_en DESC
      `,
    );
    return json(rows);
  } catch (error) {
    return json(
      {
        message: "No se pudieron cargar las solicitudes",
        detail: error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST({ request }) {
  try {
    const payload = await request.json();
    const validacion = validarSolicitud(payload);

    if (!validacion.ok) {
      return json({ message: validacion.message }, { status: 400 });
    }

    const {
      producto_nombre,
      tipo,
      proveedor_id,
      contacto_cliente,
      cantidad_pedida,
      estado,
    } = validacion.data;

    const { rows } = await query(
      `
        INSERT INTO solicitudes (
          producto_nombre,
          tipo,
          proveedor_id,
          contacto_cliente,
          cantidad_pedida,
          estado
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        producto_nombre,
        tipo,
        proveedor_id,
        contacto_cliente,
        cantidad_pedida,
        estado,
      ],
    );

    return json(rows[0], { status: 201 });
  } catch (error) {
    return json(
      { message: "No se pudo crear la solicitud", detail: error.message },
      { status: 500 },
    );
  }
}
