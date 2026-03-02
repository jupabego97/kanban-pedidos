import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

// Inicialización lazy: el cliente se crea la primera vez que se usa,
// garantizando que las variables de entorno ya están disponibles.
let _client = null;

function getClient() {
  if (!_client) {
    _client = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
  }
  return _client;
}

// ─── PROVEEDORES ────────────────────────────────────────────
export async function getProveedores() {
  const { data, error } = await getClient()
    .from('proveedores')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

// ─── CATÁLOGO (autocompletado) ───────────────────────────────
export async function buscarProductos(query) {
  if (!query || query.length < 2) return [];
  const { data, error } = await getClient()
    .from('productos_catalogo')
    .select('id, nombre, proveedor_id, proveedores(nombre)')
    .ilike('nombre', `%${query}%`)
    .limit(8);
  if (error) throw error;
  return data;
}

// ─── SOLICITUDES ─────────────────────────────────────────────
export async function getSolicitudes() {
  const { data, error } = await getClient()
    .from('solicitudes')
    .select('*, proveedores(nombre, dias_entrega)')
    .order('creado_en', { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearSolicitud(solicitud) {
  const { data, error } = await getClient()
    .from('solicitudes')
    .insert([solicitud])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarEstado(id, estado) {
  const { error } = await getClient()
    .from('solicitudes')
    .update({ estado })
    .eq('id', id);
  if (error) throw error;
}

export async function actualizarCantidad(id, cantidad_pedida) {
  const { error } = await getClient()
    .from('solicitudes')
    .update({ cantidad_pedida })
    .eq('id', id);
  if (error) throw error;
}

export async function eliminarSolicitud(id) {
  const { error } = await getClient().from('solicitudes').delete().eq('id', id);
  if (error) throw error;
}

// ─── TIEMPO REAL ─────────────────────────────────────────────
/**
 * Suscribirse a cambios en la tabla solicitudes.
 * @param {(payload: object) => void} callback
 * @returns {() => void} función para cancelar la suscripción
 */
export function suscribirSolicitudes(callback) {
  const channel = getClient()
    .channel('solicitudes-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'solicitudes' },
      callback
    )
    .subscribe();

  return () => getClient().removeChannel(channel);
}
