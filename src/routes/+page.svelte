<script>
  import { onMount } from 'svelte';
  import DocumentList from '$lib/components/UI/DocumentList.svelte';
  import { goto } from '$app/navigation';
  
  let title = "PageStudio";
  let ready = false;
  
  onMount(() => {
    ready = true;
  });
  
  function createNewDocument(format = 'A4') {
    goto(`/editor/new?format=${format}`);
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 h-12 flex items-center px-4 justify-between">
    <div class="flex items-center gap-2">
      <img src="/favicon.png" alt="PageStudio Logo" class="h-8 w-8" />
      <h1 class="font-semibold text-xl">{title}</h1>
    </div>
    
    <div class="flex gap-2">
      <button class="btn btn-primary" on:click={() => createNewDocument('A4')}>New Document</button>
    </div>
  </header>
  
  <!-- Main content -->
  <main class="flex-1 overflow-y-auto bg-gray-50">
    {#if ready}
      <div class="max-w-6xl w-full p-8 mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold mb-4">Welcome to PageStudio</h2>
          <p class="text-gray-600">A web-based InDesign alternative for creating beautiful publications.</p>
        </div>
        
        <DocumentList />
        
        <div class="mt-12 p-6 bg-white rounded-lg shadow-md">
          <h3 class="font-semibold mb-4">Templates</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <button class="p-4 border border-gray-200 rounded hover:border-primary cursor-pointer text-left" on:click={() => createNewDocument('A4')}>
              <div class="aspect-[1/1.414] bg-gray-100 mb-2 flex items-center justify-center">A4</div>
              <p class="text-sm">Blank A4</p>
            </button>
            <button class="p-4 border border-gray-200 rounded hover:border-primary cursor-pointer text-left" on:click={() => createNewDocument('A5')}>
              <div class="aspect-[1/1.414] bg-gray-100 mb-2 flex items-center justify-center">A5</div>
              <p class="text-sm">Blank A5</p>
            </button>
          </div>
        </div>
      </div>
    {:else}
      <div class="text-center p-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
        <p class="mt-2">Loading...</p>
      </div>
    {/if}
  </main>
  
  <!-- Footer -->
  <footer class="bg-white border-t border-gray-200 py-2 px-4 text-center text-sm text-gray-500">
    PageStudio v0.1.0 — A web-based InDesign alternative
  </footer>
</div>