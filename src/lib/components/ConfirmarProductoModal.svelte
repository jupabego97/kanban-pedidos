<script>
  import { createEventDispatcher, onMount } from 'svelte';

  /** @type {{ nombre: string, barcode?: string | null, referencia?: string | null, proveedores?: { nombre: string } | null }} */
  export let producto;

  const dispatch = createEventDispatcher();

  let confirmBtnRef;

  onMount(() => {
    confirmBtnRef?.focus();
  });

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      dispatch('reject');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
  role="presentation"
  on:click|self={() => dispatch('reject')}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirmar-producto-titulo"
    aria-describedby="confirmar-producto-desc"
    class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
  >
    <div class="px-5 py-5">
      <h2 id="confirmar-producto-titulo" class="text-lg font-bold text-gray-900 leading-snug">
        ¿Quieres registrar el producto con nombre
        <span class="text-blue-800">{producto.nombre}</span>?
      </h2>
      <p id="confirmar-producto-desc" class="text-sm text-gray-600 mt-2">
        Si eliges Sí, el nombre quedará en el campo Producto. Luego puedes elegir tipo, proveedor y pulsar Registrar Faltante.
      </p>
    </div>

    <div class="px-5 py-4 bg-gray-50 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t border-gray-100">
      <button
        type="button"
        class="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        on:click={() => dispatch('reject')}
      >
        No
      </button>
      <button
        bind:this={confirmBtnRef}
        type="button"
        class="px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        on:click={() => dispatch('confirm')}
      >
        Sí
      </button>
    </div>
  </div>
</div>
