<script>
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { actualizarEstado } from '$lib/supabase.js';
  import { solicitudes, proveedores, filtroProveedor, tableroData, COLUMNAS } from '$lib/stores.js';
  import KanbanCard from './KanbanCard.svelte';

  // Estado local de columnas para el DnD (necesita ser reactivo y mutable)
  let columnas = [];
  $: columnas = $tableroData.map((col) => ({ ...col, items: [...col.items] }));

  const flipDuration = 200;

  function handleDndConsider(colId, e) {
    columnas = columnas.map((c) =>
      c.id === colId ? { ...c, items: e.detail.items } : c
    );
  }

  async function handleDndFinalize(colId, e) {
    const items = e.detail.items;
    columnas = columnas.map((c) => (c.id === colId ? { ...c, items } : c));

    // Actualizar en Supabase y en el store global
    for (const item of items) {
      if (item.estado !== colId) {
        await actualizarEstado(item.id, colId);
        solicitudes.update((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, estado: colId } : s))
        );
      }
    }
  }

  const COLOR_HEADER = {
    solicitudes: 'bg-slate-600',
    analisis:    'bg-yellow-500',
    por_pedir:   'bg-orange-500',
    en_camino:   'bg-blue-600',
    recibido:    'bg-green-600'
  };
</script>

<div class="flex flex-col h-full">

  <!-- TOOLBAR -->
  <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-wrap">
    <span class="text-sm font-semibold text-gray-600">Filtrar "Lista de Compras":</span>
    <div class="flex gap-2 flex-wrap">
      <button
        on:click={() => filtroProveedor.set(null)}
        class="px-3 py-1 rounded-full text-xs font-medium transition-colors border"
        class:bg-blue-700={$filtroProveedor === null}
        class:text-white={$filtroProveedor === null}
        class:border-blue-700={$filtroProveedor === null}
        class:bg-white={$filtroProveedor !== null}
        class:text-gray-600={$filtroProveedor !== null}
        class:border-gray-300={$filtroProveedor !== null}
      >
        Todos
      </button>
      {#each $proveedores as p}
        <button
          on:click={() => filtroProveedor.set(p.id)}
          class="px-3 py-1 rounded-full text-xs font-medium transition-colors border"
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
            class="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2 min-h-[120px]"
            use:dndzone={{ items: col.items, flipDuration }}
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
