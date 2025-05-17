<script>
  import { onMount } from 'svelte';
  import Canvas from '$lib/components/Editor/Canvas.svelte';
  import { createDocument, setCurrentDocument, currentDocument, currentPage, addPage } from '$lib/stores/document';
  
  let title = "PageStudio Editor";
  
  onMount(() => {
    // Create a demo document if none exists
    if (!$currentDocument) {
      const newDoc = createDocument({
        title: 'Demo Document',
        format: 'A4',
        pageCount: 1
      });
      
      setCurrentDocument(newDoc);
    }
  });
  
  function handleAddPage() {
    addPage();
  }
  
  function handleSave() {
    // This is a placeholder for the save functionality
    // It will be implemented with IndexedDB in a future step
    alert('Save functionality will be implemented in a future step');
  }
  
  function handleExport() {
    // This is a placeholder for the export functionality
    // It will be implemented with jsPDF in a future step
    alert('Export functionality will be implemented in a future step');
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 h-12 flex items-center px-4 justify-between">
    <div class="flex items-center gap-2">
      <img src="/favicon.png" alt="PageStudio Logo" class="h-8 w-8" />
      <h1 class="font-semibold text-xl">PageStudio</h1>
      {#if $currentDocument}
        <span class="text-gray-500 ml-4">{$currentDocument.title}</span>
      {/if}
    </div>
    
    <div class="flex gap-2">
      <button class="btn btn-secondary" on:click={handleSave}>Save</button>
      <button class="btn btn-primary" on:click={handleExport}>Export PDF</button>
    </div>
  </header>
  
  <!-- Main editor area -->
  <div class="flex-1 flex">
    <!-- Tools panel (left) -->
    <div class="tools-panel">
      <button class="tool-button tool-button-active" title="Select Tool">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      </button>
      
      <button class="tool-button" title="Text Tool">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
      
      <button class="tool-button" title="Image Tool">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      
      <button class="tool-button" title="Rectangle Tool">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </button>
      
      <div class="flex-1"></div>
      
      <button class="tool-button" title="Zoom In">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>
      
      <button class="tool-button" title="Zoom Out">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>
    </div>
    
    <!-- Canvas (center) -->
    <div class="flex-1 overflow-hidden">
      <Canvas />
    </div>
    
    <!-- Properties panel (right) -->
    <div class="properties-panel">
      <h2 class="font-medium text-lg mb-4">Properties</h2>
      
      <div class="mb-4">
        <h3 class="font-medium mb-2">Document</h3>
        {#if $currentDocument}
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-gray-600">Format:</div>
            <div>{$currentDocument.format}</div>
            <div class="text-gray-600">Width:</div>
            <div>{$currentDocument.metadata.pageSize.width} mm</div>
            <div class="text-gray-600">Height:</div>
            <div>{$currentDocument.metadata.pageSize.height} mm</div>
            <div class="text-gray-600">Pages:</div>
            <div>{$currentDocument.pages.length}</div>
          </div>
        {/if}
      </div>
      
      <div class="mb-4">
        <h3 class="font-medium mb-2">Selected Object</h3>
        <p class="text-sm text-gray-500">No object selected</p>
      </div>
    </div>
  </div>
  
  <!-- Page navigator (bottom) -->
  <div class="page-navigator">
    {#if $currentDocument && $currentDocument.pages}
      {#each $currentDocument.pages as page}
        <div 
          class="page-thumb min-w-[80px] aspect-[1/1.414] bg-white border-2 {$currentPage === page.id ? 'border-primary' : 'border-gray-300'} cursor-pointer shadow-sm flex items-center justify-center text-sm"
          on:click={() => currentPage.set(page.id)}
        >
          {page.id.replace('page-', '')}
        </div>
      {/each}
    {/if}
    
    <button 
      class="min-w-[80px] aspect-[1/1.414] border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:bg-gray-100"
      on:click={handleAddPage}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>
</div>