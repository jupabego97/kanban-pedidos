<script>
  import { vistaActiva, cargando, solicitudes, errorCargaInicial } from '$lib/stores.js';
  import FormMostrador from '$lib/components/FormMostrador.svelte';
  import KanbanBoard from '$lib/components/KanbanBoard.svelte';
</script>

{#if $cargando}
  <div class="flex items-center justify-center h-[60vh]">
    <div class="text-center space-y-3">
      <div class="inline-block w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm text-gray-500 font-medium">Cargando datos...</p>
    </div>
  </div>
{:else if $errorCargaInicial}
  <div class="mx-auto max-w-md px-4 pt-8 text-center">
    <p class="text-sm text-gray-600">Corrige la conexion y usa el boton "Reintentar carga".</p>
  </div>
{:else if $vistaActiva === 'mostrador'}
  <FormMostrador />
{:else}
  <div class="h-[calc(100vh-56px)] flex flex-col">
    {#if $solicitudes.length === 0}
      <div class="m-4 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <p class="text-sm font-semibold text-gray-700">Aun no hay solicitudes.</p>
        <p class="mt-1 text-xs text-gray-500">Registra faltantes en la vista Mostrador para comenzar.</p>
      </div>
    {:else}
      <KanbanBoard />
    {/if}
  </div>
{/if}
