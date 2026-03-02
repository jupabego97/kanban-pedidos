import { writable, derived } from 'svelte/store';

// Todas las solicitudes cargadas desde Supabase
export const solicitudes = writable([]);

// Proveedores disponibles
export const proveedores = writable([]);

// Filtro activo de proveedor en el Kanban
export const filtroProveedor = writable(null);

// Vista activa: 'mostrador' | 'kanban'
export const vistaActiva = writable('mostrador');

// Cargando datos iniciales
export const cargando = writable(true);

// Columnas del kanban con sus metadatos
export const COLUMNAS = [
  { id: 'solicitudes', label: 'Nuevas Solicitudes', emoji: '📋', color: 'bg-slate-100 border-slate-300' },
  { id: 'analisis',    label: 'En Análisis',        emoji: '🔍', color: 'bg-yellow-50 border-yellow-300' },
  { id: 'por_pedir',   label: 'Lista de Compras',   emoji: '🛒', color: 'bg-orange-50 border-orange-300' },
  { id: 'en_camino',   label: 'Pedido Realizado',   emoji: '🚚', color: 'bg-blue-50 border-blue-300' },
  { id: 'recibido',    label: 'Recibido',            emoji: '✅', color: 'bg-green-50 border-green-300' }
];

// Solicitudes agrupadas por columna, con filtro de proveedor aplicado
export const tableroData = derived(
  [solicitudes, filtroProveedor],
  ([$solicitudes, $filtroProveedor]) => {
    return COLUMNAS.map((col) => {
      let items = $solicitudes.filter((s) => s.estado === col.id);
      if ($filtroProveedor && col.id === 'por_pedir') {
        items = items.filter((s) => s.proveedor_id === $filtroProveedor);
      }
      return { ...col, items };
    });
  }
);
