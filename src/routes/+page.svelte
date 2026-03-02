<script>
  import { vistaActiva, cargando } from '$lib/stores.js';
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
{:else if $vistaActiva === 'mostrador'}
  <FormMostrador />
{:else}
  <div class="h-[calc(100vh-56px)] flex flex-col">
    <KanbanBoard />
  </div>
{/if}
