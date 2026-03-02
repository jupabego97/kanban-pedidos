<script>
  import { actualizarCantidad, eliminarSolicitud } from '$lib/supabase.js';
  import { solicitudes } from '$lib/stores.js';

  export let item;

  let editandoCantidad = false;
  let cantidadTmp = item.cantidad_pedida;
  let eliminando = false;

  const whatsappUrl = (tel) => {
    const limpio = tel.replace(/\D/g, '');
    return `https://wa.me/57${limpio}`;
  };

  async function guardarCantidad() {
    const val = parseInt(cantidadTmp);
    if (!val || val < 1) { cantidadTmp = item.cantidad_pedida; editandoCantidad = false; return; }
    await actualizarCantidad(item.id, val);
    solicitudes.update((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, cantidad_pedida: val } : s))
    );
    editandoCantidad = false;
  }

  async function onEliminar() {
    if (!confirm(`¿Eliminar "${item.producto_nombre}"?`)) return;
    eliminando = true;
    await eliminarSolicitud(item.id);
    solicitudes.update((prev) => prev.filter((s) => s.id !== item.id));
  }

  function formatFecha(ts) {
    return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }
</script>

<div
  class="bg-white rounded-xl border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
  class:opacity-50={eliminando}
>
  <!-- ENCABEZADO: nombre + badge tipo -->
  <div class="flex items-start justify-between gap-2 mb-2">
    <p class="text-sm font-semibold text-gray-900 leading-snug flex-1">{item.producto_nombre}</p>
    <span class={item.tipo === 'Agotado' ? 'badge-agotado' : 'badge-nuevo'}>
      {item.tipo === 'Agotado' ? '🔴' : '🔵'} {item.tipo}
    </span>
  </div>

  <!-- CANTIDAD (grande y clickeable) -->
  <div class="flex items-center gap-2 mb-2">
    {#if editandoCantidad}
      <input
        type="number"
        bind:value={cantidadTmp}
        min="1"
        on:blur={guardarCantidad}
        on:keydown={(e) => e.key === 'Enter' && guardarCantidad()}
        class="w-20 text-center text-xl font-black border-2 border-blue-400 rounded-lg py-0.5 focus:outline-none"
      />
    {:else}
      <button
        on:click={() => { editandoCantidad = true; cantidadTmp = item.cantidad_pedida; }}
        class="text-2xl font-black text-blue-700 hover:text-blue-900 transition-colors leading-none"
        title="Click para editar cantidad"
      >
        ×{item.cantidad_pedida}
      </button>
    {/if}

    {#if item.proveedores}
      <span class="text-xs text-gray-400 font-medium truncate">
        {item.proveedores.nombre}
        {#if item.proveedores.dias_entrega}
          · {item.proveedores.dias_entrega}d
        {/if}
      </span>
    {/if}
  </div>

  <!-- PIE: fecha + whatsapp + eliminar -->
  <div class="flex items-center justify-between gap-2">
    <span class="text-xs text-gray-400">{formatFecha(item.creado_en)}</span>

    <div class="flex items-center gap-2">
      {#if item.contacto_cliente}
        <a
          href={whatsappUrl(item.contacto_cliente)}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
          title="Avisar por WhatsApp"
        >
          <span>💬</span>
          <span class="hidden sm:inline">{item.contacto_cliente}</span>
        </a>
      {/if}

      <button
        on:click|stopPropagation={onEliminar}
        class="text-gray-300 hover:text-red-400 transition-colors text-sm"
        title="Eliminar"
        disabled={eliminando}
      >
        ✕
      </button>
    </div>
  </div>
</div>
