import { writable, derived } from "svelte/store";

// Todas las solicitudes cargadas desde la API
export const solicitudes = writable([]);

// Proveedores disponibles
export const proveedores = writable([]);

// Vista activa: 'mostrador' | 'kanban'
export const vistaActiva = writable("mostrador");

// Cargando datos iniciales
export const cargando = writable(true);
export const errorCargaInicial = writable("");

// Notificaciones globales para feedback no intrusivo
export const notificacion = writable(null);

// Columnas del kanban con sus metadatos
export const COLUMNAS = [
  {
    id: "solicitudes",
    label: "Nuevas Solicitudes",
    emoji: "📋",
    color: "bg-slate-100 border-slate-300",
  },
  {
    id: "analisis",
    label: "En Análisis",
    emoji: "🔍",
    color: "bg-yellow-50 border-yellow-300",
  },
  {
    id: "por_pedir",
    label: "Lista de Compras",
    emoji: "🛒",
    color: "bg-orange-50 border-orange-300",
  },
  {
    id: "en_camino",
    label: "Pedido Realizado",
    emoji: "🚚",
    color: "bg-blue-50 border-blue-300",
  },
  {
    id: "recibido",
    label: "Recibido",
    emoji: "✅",
    color: "bg-green-50 border-green-300",
  },
];

// Solicitudes agrupadas por columna
export const tableroData = derived(solicitudes, ($solicitudes) => {
  return COLUMNAS.map((col) => ({
    ...col,
    items: $solicitudes.filter((s) => s.estado === col.id),
  }));
});
