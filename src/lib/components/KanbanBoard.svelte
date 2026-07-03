<script>
  import { onMount } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { actualizarEstado } from '$lib/apiClient.js';
  import { browser } from '$app/environment';
  import { solicitudes, proveedores, filtroProveedor, tableroData, notificacion } from '$lib/stores.js';
  import { iniciarMedicion, finalizarMedicion } from '$lib/uxMetrics.js';
  import KanbanCard from './KanbanCard.svelte';

  // Estado local de columnas para el DnD (necesita ser reactivo y mutable)
  let columnas = [];
  $: columnas = $tableroData.map((col) => ({ ...col, items: [...col.items] }));

  const flipDuration = 200;
  let columnaActiva = '';
  let busquedaProveedor = '';

  function normalizarTexto(texto) {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  $: proveedoresFiltrados = (() => {
    const q = normalizarTexto(busquedaProveedor);
    if (!q) return $proveedores;
    return $proveedores.filter(
      (p) =>
        normalizarTexto(p.nombre).includes(q) || p.id === $filtroProveedor
    );
  })();

  onMount(() => {
    if (!browser) return;
    const guardado = window.localStorage.getItem('filtroProveedorKanban');
    if (guardado) {
      const numero = Number(guardado);
      filtroProveedor.set(Number.isNaN(numero) ? null : numero);
    }
  });

  $: if (browser) {
    const valor = $filtroProveedor === null ? '' : String($filtroProveedor);
    window.localStorage.setItem('filtroProveedorKanban', valor);
  }

  function handleDndConsider(colId, e) {
    columnaActiva = colId;
    columnas = columnas.map((c) =>
      c.id === colId ? { ...c, items: e.detail.items } : c
    );
  }

  async function handleDndFinalize(colId, e) {
    columnaActiva = '';
    const items = e.detail.items;
    columnas = columnas.map((c) => (c.id === colId ? { ...c, items } : c));

    const cambios = items.filter((item) => item.estado !== colId);
    if (cambios.length === 0) return;
    const medicion = iniciarMedicion('movimientoMs');

    const resultados = await Promise.allSettled(
      cambios.map((item) => actualizarEstado(item.id, colId))
    );

    const exitosos = cambios.filter((_, idx) => resultados[idx].status === 'fulfilled');
    const fallidos = cambios.length - exitosos.length;

    if (exitosos.length > 0) {
      solicitudes.update((prev) =>
        prev.map((s) => {
          const cambio = exitosos.find((item) => item.id === s.id);
          return cambio ? { ...s, estado: colId } : s;
        })
      );
    }

    if (fallidos > 0) {
      solicitudes.update((prev) => prev);
      notificacion.set({
        tipo: 'error',
        mensaje: 'No se pudo guardar el cambio de estado. Intenta otra vez.'
      });
      return;
    }

    const cantidadTexto = exitosos.length === 1 ? '1 tarjeta movida' : `${exitosos.length} tarjetas movidas`;
    finalizarMedicion(medicion);
    notificacion.set({ tipo: 'success', mensaje: `${cantidadTexto} a "${COLOR_LABEL[colId]}".` });
  }

  const COLOR_HEADER = {
    solicitudes: 'bg-slate-600',
    analisis:    'bg-yellow-500',
    por_pedir:   'bg-orange-500',
    en_camino:   'bg-blue-600',
    recibido:    'bg-green-600'
  };

  const COLOR_LABEL = {
    solicitudes: 'Nuevas Solicitudes',
    analisis: 'En Analisis',
    por_pedir: 'Lista de Compras',
    en_camino: 'Pedido Realizado',
    recibido: 'Recibido'
  };
</script>

<div class="flex flex-col h-full">

  <!-- TOOLBAR -->
  <div class="bg-white border-b border-gray-200 px-4 py-3 space-y-2">
    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <span class="text-sm font-semibold text-gray-600 shrink-0">Filtrar "Lista de Compras":</span>
      <div class="relative flex-1 max-w-md">
        <input
          type="search"
          bind:value={busquedaProveedor}
          placeholder="Buscar proveedor..."
          aria-label="Buscar proveedor"
          class="input-field text-sm py-2 pl-9 pr-8"
        />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true">🔍</span>
        {#if busquedaProveedor}
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-1"
            aria-label="Limpiar busqueda de proveedor"
            on:click={() => { busquedaProveedor = ''; }}
          >
            ✕
          </button>
        {/if}
      </div>
      {#if busquedaProveedor.trim()}
        <span class="text-xs text-gray-500 shrink-0">
          {proveedoresFiltrados.length} de {$proveedores.length}
        </span>
      {/if}
    </div>

    <div class="flex gap-2 flex-wrap items-center">
      <button
        on:click={() => filtroProveedor.set(null)}
        class="px-3 py-1 rounded-full text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        class:bg-blue-700={$filtroProveedor === null}
        class:text-white={$filtroProveedor === null}
        class:border-blue-700={$filtroProveedor === null}
        class:bg-white={$filtroProveedor !== null}
        class:text-gray-600={$filtroProveedor !== null}
        class:border-gray-300={$filtroProveedor !== null}
      >
        Todos
      </button>
      {#each proveedoresFiltrados as p}
        <button
          on:click={() => filtroProveedor.set(p.id)}
          class="px-3 py-1 rounded-full text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          class:bg-blue-700={$filtroProveedor === p.id}
          class:text-white={$filtroProveedor === p.id}
          class:border-blue-700={$filtroProveedor === p.id}
          class:bg-white={$filtroProveedor !== p.id}
          class:text-gray-600={$filtroProveedor !== p.id}
          class:border-gray-300={$filtroProveedor !== p.id}
        >
          {p.nombre}
        </button>
      {/each}
      {#if busquedaProveedor.trim() && proveedoresFiltrados.length === 0}
        <span class="text-xs text-gray-500 italic px-1">Sin proveedores que coincidan.</span>
      {/if}
    </div>
  </div>

  <!-- TABLERO -->
  <div class="flex-1 overflow-x-auto overflow-y-hidden">
    <div class="flex gap-3 h-full p-4 min-w-max">
      {#each columnas as col (col.id)}
        <div class="flex flex-col w-72 flex-shrink-0 rounded-2xl border {col.color} overflow-hidden">

          <!-- CABECERA COLUMNA -->
          <div class="px-3 py-2.5 {COLOR_HEADER[col.id]} flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-base">{col.emoji}</span>
              <span class="text-sm font-bold text-white">{col.label}</span>
            </div>
            <span class="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {col.items.length}
            </span>
          </div>

          <!-- ZONA DnD -->
          <div
            class="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2 min-h-[120px] transition-colors"
            class:bg-blue-50={columnaActiva === col.id}
            use:dndzone={{ items: col.items, flipDurationMs: flipDuration }}
            on:consider={(e) => handleDndConsider(col.id, e)}
            on:finalize={(e) => handleDndFinalize(col.id, e)}
          >
            {#each col.items as item (item.id)}
              <div animate:flip={{ duration: flipDuration }}>
                <KanbanCard {item} />
              </div>
            {/each}

            {#if col.items.length === 0}
              <div class="flex items-center justify-center h-16 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl">
                Sin elementos
              </div>
            {/if}
          </div>

        </div>
      {/each}
    </div>
  </div>

</div>
