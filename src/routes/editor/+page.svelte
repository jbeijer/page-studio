<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Canvas from '$lib/components/Editor/Canvas.svelte';
  import Toolbar from '$lib/components/Editor/Toolbar.svelte';
  import TextEditingPanel from '$lib/components/Editor/TextEditingPanel.svelte';
  import { createDocument, setCurrentDocument, currentDocument, currentPage, addPage, updateDocument } from '$lib/stores/document';
  import { activeTool, ToolType, updateToolOptions } from '$lib/stores/toolbar';
  import { saveDocument, loadDocument } from '$lib/utils/storage';
  import { goto } from '$app/navigation';
  
  let canvasComponent;
  let selectedObject = null;
  let selectedObjectType = null;
  let isSaving = false;
  let saveError = null;
  let documentTitle = '';
  
  let title = "PageStudio Editor";
  
  onMount(async () => {
    const docId = $page.url.searchParams.get('id');
    
    if (docId) {
      // Try to load an existing document
      try {
        const loadedDocument = await loadDocument(docId);
        setCurrentDocument(loadedDocument);
        documentTitle = loadedDocument.title;
      } catch (err) {
        console.error('Error loading document:', err);
        // Create a new document if loading fails
        createNewDocument();
      }
    } else {
      // Create a new document if no ID is provided
      createNewDocument();
    }
  });
  
  function createNewDocument() {
    const newDoc = createDocument({
      title: 'Untitled Document',
      format: 'A4',
      pageCount: 1
    });
    
    setCurrentDocument(newDoc);
    documentTitle = newDoc.title;
  }
  
  function handleAddPage() {
    addPage();
  }
  
  async function handleSave() {
    if (!$currentDocument) return;
    
    if (canvasComponent) {
      // Update the canvas JSON for the current page
      const canvas = canvasComponent.getCanvas();
      if (canvas) {
        const currentPageId = $currentPage;
        const pageIndex = $currentDocument.pages.findIndex(p => p.id === currentPageId);
        
        if (pageIndex !== -1) {
          // Save canvas state to the current page
          const canvasJSON = JSON.stringify(canvas.toJSON(['id', 'linkedObjectIds']));
          $currentDocument.pages[pageIndex].canvasJSON = canvasJSON;
        }
      }
    }
    
    // Update document title if changed
    if (documentTitle !== $currentDocument.title) {
      $currentDocument.title = documentTitle;
    }
    
    try {
      isSaving = true;
      saveError = null;
      
      // Update the document in store and save to IndexedDB
      updateDocument($currentDocument);
      await saveDocument($currentDocument);
      
      isSaving = false;
    } catch (err) {
      console.error('Error saving document:', err);
      saveError = err.message;
      isSaving = false;
    }
  }
  
  function handleExport() {
    // This is a placeholder for the export functionality
    // It will be implemented with jsPDF in a future step
    alert('Export functionality will be implemented in a future step');
  }
  
  function handleObjectSelected(event) {
    selectedObject = event.detail.object;
    selectedObjectType = event.detail.objectType;
  }
  
  function handleBackToHome() {
    goto('/');
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 h-12 flex items-center px-4 justify-between">
    <div class="flex items-center gap-2">
      <button class="p-1 hover:bg-gray-100 rounded-full" on:click={handleBackToHome}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <img src="/favicon.png" alt="PageStudio Logo" class="h-8 w-8" />
      <h1 class="font-semibold text-xl">PageStudio</h1>
      {#if $currentDocument}
        <div class="ml-4 flex items-center">
          <input 
            type="text" 
            bind:value={documentTitle} 
            class="border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none px-2 py-1 text-gray-800 bg-transparent" 
            placeholder="Document Title"
          />
        </div>
      {/if}
    </div>
    
    <div class="flex gap-2 items-center">
      {#if isSaving}
        <span class="text-gray-500 text-sm mr-2">Saving...</span>
      {:else if saveError}
        <span class="text-red-500 text-sm mr-2">{saveError}</span>
      {/if}
      <button class="btn btn-secondary" on:click={handleSave} disabled={isSaving}>Save</button>
      <button class="btn btn-primary" on:click={handleExport}>Export PDF</button>
    </div>
  </header>
  
  <!-- Main editor area -->
  <div class="flex-1 flex">
    <!-- Tools panel (left) -->
    <Toolbar />
    
    <!-- Canvas (center) -->
    <div class="flex-1 overflow-hidden">
      <Canvas bind:this={canvasComponent} on:objectselected={handleObjectSelected} />
    </div>
    
    <!-- Properties panel (right) -->
    <div class="properties-panel">
      <h2 class="font-medium text-lg mb-4">Properties</h2>
      
      {#if selectedObjectType === 'textbox'}
        <!-- Text editing panel for selected textbox -->
        <TextEditingPanel 
          canvas={canvasComponent?.getCanvas()} 
          textObject={selectedObject} 
        />
      {:else}
        <!-- Default properties panels -->
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
          <h3 class="font-medium mb-2">Tool: {$activeTool}</h3>
          
          {#if $activeTool === 'select'}
            <p class="text-sm mb-2">Use select tool to manage objects</p>
            <div class="grid grid-cols-2 gap-2">
              <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))}>Delete</button>
              <button class="btn btn-sm btn-secondary" on:click={() => document.execCommand('copy')}>Copy</button>
            </div>
            
            <div class="mt-4">
              <h4 class="text-sm font-medium mb-2">Transform</h4>
              <div class="grid grid-cols-2 gap-2">
                <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true }))}>Move Up</button>
                <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true }))}>Move Down</button>
                <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))}>Rotate</button>
                <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))}>Flip</button>
              </div>
            </div>
          {/if}
          
          {#if $activeTool === 'text'}
            <div class="text-sm">
              <div class="mb-2">
                <label class="block text-gray-600">Font Family</label>
                <select class="w-full border rounded px-2 py-1" 
                  value="Arial"
                  on:change={(e) => updateToolOptions('text', { fontFamily: e.target.value })}>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Font Size</label>
                <input type="number" class="w-full border rounded px-2 py-1" 
                  min="8" max="72" step="1" value="16"
                  on:change={(e) => updateToolOptions('text', { fontSize: parseInt(e.target.value) })} />
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Text Align</label>
                <div class="flex gap-1">
                  <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'left' })}>Left</button>
                  <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'center' })}>Center</button>
                  <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'right' })}>Right</button>
                </div>
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Style</label>
                <div class="flex gap-1">
                  <button class="flex-1 btn btn-sm btn-secondary font-bold" on:click={() => updateToolOptions('text', { fontWeight: 'bold' })}>B</button>
                  <button class="flex-1 btn btn-sm btn-secondary italic" on:click={() => updateToolOptions('text', { fontStyle: 'italic' })}>I</button>
                  <button class="flex-1 btn btn-sm btn-secondary underline" on:click={() => updateToolOptions('text', { textDecoration: 'underline' })}>U</button>
                </div>
              </div>
            </div>
          {/if}
          
          {#if $activeTool === 'image'}
            <div class="text-sm">
              <p class="mb-2">Click on canvas to add an image</p>
              <div class="flex items-center mb-2">
                <input type="checkbox" id="preserveAspect" checked
                   on:change={(e) => updateToolOptions('image', { preserveAspectRatio: e.target.checked })} />
                <label for="preserveAspect" class="ml-2">Preserve aspect ratio</label>
              </div>
            </div>
          {/if}
          
          {#if $activeTool === 'rectangle' || $activeTool === 'ellipse' || $activeTool === 'line'}
            <div class="text-sm">
              <div class="mb-2">
                <label class="block text-gray-600">Fill Color</label>
                <input type="color" class="w-full border rounded px-2 py-1" 
                  value="#ffffff"
                  on:change={(e) => updateToolOptions($activeTool, { fill: e.target.value })} />
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Stroke Color</label>
                <input type="color" class="w-full border rounded px-2 py-1" 
                  value="#000000"
                  on:change={(e) => updateToolOptions($activeTool, { stroke: e.target.value })} />
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Stroke Width</label>
                <input type="number" class="w-full border rounded px-2 py-1" 
                  min="0" max="20" step="1" value="1"
                  on:change={(e) => updateToolOptions($activeTool, { strokeWidth: parseInt(e.target.value) })} />
              </div>
              
              {#if $activeTool === 'rectangle'}
                <div class="mb-2">
                  <label class="block text-gray-600">Corner Radius</label>
                  <input type="number" class="w-full border rounded px-2 py-1" 
                    min="0" max="50" step="1" value="0"
                    on:change={(e) => updateToolOptions('rectangle', { cornerRadius: parseInt(e.target.value) })} />
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
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