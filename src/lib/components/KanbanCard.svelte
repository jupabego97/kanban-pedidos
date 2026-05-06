<script>
  import { actualizarCantidad, eliminarSolicitud } from '$lib/supabase.js';
  import { solicitudes, notificacion } from '$lib/stores.js';

  export let item;

  let editandoCantidad = false;
  let cantidadTmp = item.cantidad_pedida;
  let errorCantidad = '';
  let eliminando = false;
  let confirmarEliminar = false;
  let confirmarTimer;

  const whatsappUrl = (tel) => {
    const limpio = tel.replace(/\D/g, '');
    return `https://wa.me/57${limpio}`;
  };

  async function guardarCantidad() {
    errorCantidad = '';
    const val = parseInt(cantidadTmp);
    if (!val || val < 1) {
      errorCantidad = 'La cantidad debe ser mayor a 0.';
      return;
    }
    try {
      await actualizarCantidad(item.id, val);
      solicitudes.update((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, cantidad_pedida: val } : s))
      );
      editandoCantidad = false;
      notificacion.set({ tipo: 'success', mensaje: 'Cantidad actualizada.' });
    } catch (error) {
      errorCantidad = 'No se pudo guardar la cantidad.';
    }
  }

  async function onEliminar() {
    if (!confirmarEliminar) {
      confirmarEliminar = true;
      clearTimeout(confirmarTimer);
      confirmarTimer = setTimeout(() => {
        confirmarEliminar = false;
      }, 4000);
      return;
    }
    clearTimeout(confirmarTimer);
    eliminando = true;
    try {
      await eliminarSolicitud(item.id);
      solicitudes.update((prev) => prev.filter((s) => s.id !== item.id));
      notificacion.set({ tipo: 'success', mensaje: 'Solicitud eliminada.' });
    } catch (error) {
      eliminando = false;
      confirmarEliminar = false;
      notificacion.set({ tipo: 'error', mensaje: 'No se pudo eliminar la solicitud.' });
    }
  }

  function formatFecha(ts) {
    return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });
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
        class="w-20 text-center text-xl font-black border-2 border-blue-400 rounded-lg py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-invalid={Boolean(errorCantidad)}
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
  {#if errorCantidad}
    <p class="text-xs text-red-600 mb-2" role="alert">{errorCantidad}</p>
  {/if}

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
        class="transition-colors text-sm font-semibold px-2 py-1 rounded-md border"
        class:text-red-700={confirmarEliminar}
        class:border-red-300={confirmarEliminar}
        class:bg-red-50={confirmarEliminar}
        class:text-gray-400={!confirmarEliminar}
        class:border-gray-200={!confirmarEliminar}
        class:hover:text-red-500={!confirmarEliminar}
        title={confirmarEliminar ? 'Click de nuevo para confirmar' : 'Eliminar'}
        disabled={eliminando}
      >
        {confirmarEliminar ? 'Confirmar' : '✕'}
      </button>
    </div>
  </div>
</div>
