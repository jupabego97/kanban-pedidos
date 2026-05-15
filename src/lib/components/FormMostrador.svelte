<script>
  import { buscarProductos, crearSolicitud } from '$lib/supabase.js';
  import { proveedores, notificacion } from '$lib/stores.js';
  import { iniciarMedicion, finalizarMedicion, registrarErrorFormulario } from '$lib/uxMetrics.js';

  let productoNombre = '';
  let tipo = 'Agotado';
  let contactoCliente = '';
  let proveedorId = null;
  let sugerencias = [];
  let mostrarSugerencias = false;
  let buscandoSugerencias = false;
  let sinResultados = false;
  let sugerenciaActiva = -1;
  let enviando = false;
  let exitoso = false;
  let error = '';
  let inputRef;
  let debounceTimer;

  /** @param {string} q */
  function pareceCodigoBarras(q) {
    const t = q.trim();
    return t.length >= 6 && /^\d+$/.test(t);
  }

  function limpiarSugerencias() {
    sugerencias = [];
    mostrarSugerencias = false;
    sugerenciaActiva = -1;
    sinResultados = false;
    buscandoSugerencias = false;
  }

  async function onInputProducto(e) {
    const q = e.target.value;
    productoNombre = q;
    clearTimeout(debounceTimer);
    if (q.length < 2 && !pareceCodigoBarras(q)) {
      limpiarSugerencias();
      return;
    }
    buscandoSugerencias = true;
    sinResultados = false;
    mostrarSugerencias = true;
    debounceTimer = setTimeout(async () => {
      try {
        sugerencias = await buscarProductos(q);
        sugerenciaActiva = sugerencias.length > 0 ? 0 : -1;
        sinResultados = sugerencias.length === 0;
        if (pareceCodigoBarras(q) && sugerencias.length === 1) {
          seleccionarSugerencia(sugerencias[0]);
        }
      } catch (e) {
        error = 'No se pudo buscar en el catálogo.';
        limpiarSugerencias();
      } finally {
        buscandoSugerencias = false;
      }
    }, 180);
  }

  function seleccionarSugerencia(s) {
    productoNombre = s.nombre;
    proveedorId = s.proveedor_id ?? null;
    limpiarSugerencias();
  }

  function cerrarSugerencias() {
    setTimeout(() => { mostrarSugerencias = false; sugerenciaActiva = -1; }, 150);
  }

  async function handleSubmit() {
    if (enviando) return;
    error = '';
    if (!productoNombre.trim()) {
      error = 'Ingresa el nombre del producto.';
      registrarErrorFormulario();
      return;
    }

    const medicion = iniciarMedicion('registroMs');
    enviando = true;
    try {
      await crearSolicitud({
        producto_nombre: productoNombre.trim(),
        tipo,
        proveedor_id: proveedorId || null,
        contacto_cliente: contactoCliente.trim() || null,
        cantidad_pedida: 1,
        estado: 'solicitudes'
      });
      exitoso = true;
      productoNombre = '';
      contactoCliente = '';
      proveedorId = null;
      tipo = 'Agotado';
      inputRef?.focus();
      setTimeout(() => { exitoso = false; }, 2500);
      finalizarMedicion(medicion);
      notificacion.set({
        tipo: 'success',
        mensaje: 'Solicitud registrada correctamente.'
      });
    } catch (e) {
      error = 'Error al registrar. Intenta de nuevo.';
      registrarErrorFormulario();
      notificacion.set({
        tipo: 'error',
        mensaje: 'No se pudo registrar la solicitud. Revisa tu conexion.'
      });
    } finally {
      enviando = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      mostrarSugerencias = false;
      sugerenciaActiva = -1;
      return;
    }
    if (e.key === 'ArrowDown' && (sugerencias.length || buscandoSugerencias)) {
      e.preventDefault();
      if (!mostrarSugerencias) mostrarSugerencias = true;
      sugerenciaActiva = Math.min(sugerenciaActiva + 1, sugerencias.length - 1);
      return;
    }
    if (e.key === 'ArrowUp' && sugerencias.length) {
      e.preventDefault();
      sugerenciaActiva = Math.max(sugerenciaActiva - 1, 0);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mostrarSugerencias && sugerenciaActiva >= 0 && sugerencias[sugerenciaActiva]) {
        seleccionarSugerencia(sugerencias[sugerenciaActiva]);
        return;
      }
      if (pareceCodigoBarras(productoNombre) && sugerencias.length === 1) {
        seleccionarSugerencia(sugerencias[0]);
        return;
      }
      handleSubmit();
    }
  }
</script>

<div class="max-w-md mx-auto px-4 pt-6 pb-10">
  <h1 class="text-2xl font-bold text-gray-900 mb-1">Registrar faltante</h1>
  <p class="text-sm text-gray-500 mb-6">
    Artículo de electrónica agotado o pedido por el cliente (cable, memoria, accesorio, etc.).
  </p>

  <!-- ALERTA ÉXITO -->
  {#if exitoso}
    <div class="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium flex items-center gap-2">
      <span class="text-lg">✅</span> ¡Registrado! Ya aparece en el tablero.
    </div>
  {/if}

  <!-- ALERTA ERROR -->
  {#if error}
    <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
      <span class="text-lg">⚠️</span> {error}
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="space-y-4">

    <!-- PRODUCTO (con autocompletado) -->
    <div class="relative">
      <label class="block text-sm font-semibold text-gray-700 mb-1.5" for="producto">
        Producto <span class="text-red-500">*</span>
      </label>
      <input
        id="producto"
        bind:this={inputRef}
        type="text"
        autocomplete="off"
        placeholder="Ej: Memoria Micro SD 128GB"
        value={productoNombre}
        on:input={onInputProducto}
        on:keydown={handleKeydown}
        on:blur={cerrarSugerencias}
        class="input-field text-base"
        role="combobox"
        aria-expanded={mostrarSugerencias}
        aria-controls="lista-sugerencias-producto"
        aria-activedescendant={sugerenciaActiva >= 0 ? `sugerencia-${sugerenciaActiva}` : undefined}
      />
      {#if mostrarSugerencias}
        <ul
          id="lista-sugerencias-producto"
          role="listbox"
          class="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden"
        >
          {#if buscandoSugerencias}
            <li class="px-4 py-3 text-sm text-gray-500">Buscando en inventario...</li>
          {:else if sinResultados}
            <li class="px-4 py-3 text-sm text-gray-500">Sin resultados para "{productoNombre}".</li>
          {/if}
          {#each sugerencias as s, idx}
            <li>
              <button
                type="button"
                on:mousedown={() => seleccionarSugerencia(s)}
                class="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors flex justify-between items-start gap-2"
                class:bg-blue-50={sugerenciaActiva === idx}
                role="option"
                aria-selected={sugerenciaActiva === idx}
                id={"sugerencia-" + idx}
              >
                <span class="min-w-0 flex-1">
                  <span class="font-medium block">{s.nombre}</span>
                  {#if s.barcode || s.referencia}
                    <span class="text-[11px] text-gray-500 block mt-0.5">
                      {#if s.barcode}
                        EAN: {s.barcode}
                      {/if}
                      {#if s.referencia && s.referencia !== s.barcode}
                        <span class:text-gray-400={s.barcode}> · Ref: {s.referencia}</span>
                      {:else if !s.barcode && s.referencia}
                        Ref: {s.referencia}
                      {/if}
                    </span>
                  {/if}
                </span>
                {#if s.proveedores}
                  <span class="text-xs text-gray-400 shrink-0">{s.proveedores.nombre}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- TIPO -->
    <div>
      <p class="block text-sm font-semibold text-gray-700 mb-1.5">Tipo</p>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          on:click={() => tipo = 'Agotado'}
          class="py-3 rounded-xl border-2 text-sm font-semibold transition-all"
          class:border-red-500={tipo === 'Agotado'}
          class:bg-red-50={tipo === 'Agotado'}
          class:text-red-700={tipo === 'Agotado'}
          class:border-gray-200={tipo !== 'Agotado'}
          class:text-gray-500={tipo !== 'Agotado'}
        >
          🔴 Agotado
        </button>
        <button
          type="button"
          on:click={() => tipo = 'Nuevo'}
          class="py-3 rounded-xl border-2 text-sm font-semibold transition-all"
          class:border-blue-500={tipo === 'Nuevo'}
          class:bg-blue-50={tipo === 'Nuevo'}
          class:text-blue-700={tipo === 'Nuevo'}
          class:border-gray-200={tipo !== 'Nuevo'}
          class:text-gray-500={tipo !== 'Nuevo'}
        >
          🔵 Nuevo
        </button>
      </div>
    </div>

    <!-- PROVEEDOR (opcional) -->
    <div>
      <label class="block text-sm font-semibold text-gray-700 mb-1.5" for="proveedor">
        Proveedor <span class="text-gray-400 font-normal text-xs">(opcional)</span>
      </label>
      <select id="proveedor" bind:value={proveedorId} class="input-field">
        <option value={null}>Sin asignar</option>
        {#each $proveedores as p}
          <option value={p.id}>{p.nombre}</option>
        {/each}
      </select>
    </div>

    <!-- CONTACTO -->
    <div>
      <label class="block text-sm font-semibold text-gray-700 mb-1.5" for="contacto">
        Contacto del cliente <span class="text-gray-400 font-normal text-xs">(opcional)</span>
      </label>
      <input
        id="contacto"
        type="tel"
        bind:value={contactoCliente}
        placeholder="Ej: 3001234567"
        on:keydown={handleKeydown}
        class="input-field"
      />
    </div>

    <!-- SUBMIT -->
    <button type="submit" disabled={enviando} class="btn-primary mt-2">
      {#if enviando}
        <span class="inline-block animate-spin mr-2">⏳</span> Registrando...
      {:else}
        ＋ Registrar Faltante
      {/if}
    </button>

  </form>
</div>
