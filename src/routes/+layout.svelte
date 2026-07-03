<script>
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { getSolicitudes, getProveedores, suscribirSolicitudes } from '$lib/apiClient.js';
  import { solicitudes, proveedores, cargando, vistaActiva, errorCargaInicial, notificacion } from '$lib/stores.js';

  let cancelarSuscripcion;
  let notificacionTimer;

  async function cargarDatosIniciales() {
    cargando.set(true);
    errorCargaInicial.set('');
    try {
      const [sols, provs] = await Promise.all([getSolicitudes(), getProveedores()]);
      solicitudes.set(sols);
      proveedores.set(provs);
    } catch (error) {
      errorCargaInicial.set(error.message || 'No se pudieron cargar los datos iniciales.');
    } finally {
      cargando.set(false);
    }
  }

  $: if ($notificacion) {
    clearTimeout(notificacionTimer);
    notificacionTimer = setTimeout(() => notificacion.set(null), 2800);
  }

  onMount(async () => {
    await cargarDatosIniciales();

    // Sincronización periódica desde API propia
    cancelarSuscripcion = suscribirSolicitudes((data) => {
      solicitudes.set(data);
    });
  });

  onDestroy(() => {
    clearTimeout(notificacionTimer);
    if (cancelarSuscripcion) cancelarSuscripcion();
  });
</script>

<div class="min-h-screen flex flex-col">
  <!-- NAV -->
  <header class="bg-blue-800 text-white shadow-lg sticky top-0 z-50">
    <div class="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
      <span class="font-bold text-lg tracking-tight">⚡ Pedidos · Electrónica</span>
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
    {#if $notificacion}
      <div class="fixed right-4 top-16 z-[60] max-w-sm">
        <div
          class="rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm"
          class:bg-green-50={$notificacion.tipo === 'success'}
          class:border-green-200={$notificacion.tipo === 'success'}
          class:text-green-800={$notificacion.tipo === 'success'}
          class:bg-red-50={$notificacion.tipo === 'error'}
          class:border-red-200={$notificacion.tipo === 'error'}
          class:text-red-800={$notificacion.tipo === 'error'}
          role="status"
          aria-live="polite"
        >
          {$notificacion.mensaje}
        </div>
      </div>
    {/if}

    {#if $errorCargaInicial}
      <div class="mx-auto mt-4 max-w-screen-xl px-4">
        <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p class="font-semibold">No se pudo cargar la informacion inicial.</p>
          <p class="mt-1">{$errorCargaInicial}</p>
          <button
            class="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            on:click={cargarDatosIniciales}
          >
            Reintentar carga
          </button>
        </div>
      </div>
    {/if}
    <slot />
  </main>
</div>
