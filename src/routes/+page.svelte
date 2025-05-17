<script>
  import { onMount } from 'svelte';
  
  let title = "PageStudio";
  let ready = false;
  
  onMount(() => {
    ready = true;
  });
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
      <button class="btn btn-secondary">Open</button>
      <button class="btn btn-primary">New Document</button>
    </div>
  </header>
  
  <!-- Main content -->
  <main class="flex-1 flex items-center justify-center bg-gray-50">
    {#if ready}
      <div class="max-w-4xl p-8 text-center">
        <h2 class="text-2xl font-bold mb-4">Welcome to PageStudio</h2>
        <p class="text-gray-600 mb-8">A web-based InDesign alternative for creating beautiful publications.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <!-- Recent Projects Panel -->
          <div class="bg-white p-6 rounded-lg shadow-md text-left">
            <h3 class="font-semibold mb-4">Recent Projects</h3>
            <p class="text-gray-500 text-sm italic">No recent projects yet</p>
          </div>
          
          <!-- Templates Panel -->
          <div class="bg-white p-6 rounded-lg shadow-md text-left">
            <h3 class="font-semibold mb-4">Templates</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 border border-gray-200 rounded hover:border-primary cursor-pointer">
                <div class="aspect-[1/1.414] bg-gray-100 mb-2 flex items-center justify-center">A4</div>
                <p class="text-sm">Blank A4</p>
              </div>
              <div class="p-4 border border-gray-200 rounded hover:border-primary cursor-pointer">
                <div class="aspect-[1/1.414] bg-gray-100 mb-2 flex items-center justify-center">A5</div>
                <p class="text-sm">Blank A5</p>
              </div>
            </div>
          </div>
        </div>
        
        <button class="btn btn-primary px-8 py-3">Create New Document</button>
      </div>
    {:else}
      <div class="text-center">
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