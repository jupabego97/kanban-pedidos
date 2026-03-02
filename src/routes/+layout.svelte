<script>
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { getSolicitudes, getProveedores, suscribirSolicitudes } from '$lib/supabase.js';
  import { solicitudes, proveedores, cargando, vistaActiva } from '$lib/stores.js';

  let cancelarSuscripcion;

  onMount(async () => {
    cargando.set(true);
    try {
      const [sols, provs] = await Promise.all([getSolicitudes(), getProveedores()]);
      solicitudes.set(sols);
      proveedores.set(provs);
    } finally {
      cargando.set(false);
    }

    // Suscripción en tiempo real
    cancelarSuscripcion = suscribirSolicitudes(async (payload) => {
      const { eventType, new: nueva, old } = payload;
      solicitudes.update((prev) => {
        if (eventType === 'INSERT') {
          return [{ ...nueva }, ...prev];
        }
        if (eventType === 'UPDATE') {
          return prev.map((s) => (s.id === nueva.id ? { ...s, ...nueva } : s));
        }
        if (eventType === 'DELETE') {
          return prev.filter((s) => s.id !== old.id);
        }
        return prev;
      });
    });
  });

  onDestroy(() => {
    if (cancelarSuscripcion) cancelarSuscripcion();
  });
</script>

<div class="min-h-screen flex flex-col">
  <!-- NAV -->
  <header class="bg-blue-800 text-white shadow-lg sticky top-0 z-50">
    <div class="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
      <span class="font-bold text-lg tracking-tight">📦 Pedidos</span>
      <nav class="flex gap-1">
        <button
          on:click={() => vistaActiva.set('mostrador')}
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          class:bg-white={$vistaActiva === 'mostrador'}
          class:text-blue-800={$vistaActiva === 'mostrador'}
          class:text-blue-200={$vistaActiva !== 'mostrador'}
          class:hover:bg-blue-700={$vistaActiva !== 'mostrador'}
        >
          Mostrador
        </button>
        <button
          on:click={() => vistaActiva.set('kanban')}
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          class:bg-white={$vistaActiva === 'kanban'}
          class:text-blue-800={$vistaActiva === 'kanban'}
          class:text-blue-200={$vistaActiva !== 'kanban'}
          class:hover:bg-blue-700={$vistaActiva !== 'kanban'}
        >
          Kanban
        </button>
      </nav>
    </div>
  </header>

  <!-- CONTENIDO -->
  <main class="flex-1">
    <slot />
  </main>
</div>
