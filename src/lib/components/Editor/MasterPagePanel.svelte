<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import * as documentStore from '$lib/stores/document';
  import masterPageService from '$lib/services/MasterPageService';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let canvasInstance = null;
  
  // Local state
  let selectedMasterPageId = null;
  let isDialogOpen = false;
  let newMasterPageName = '';
  let newMasterPageDescription = '';
  let newMasterPageBasedOn = null;
  let dialogMode = 'create'; // 'create' or 'edit'
  
  // Generate thumbnail canvas for previews
  let thumbnailCanvasElements = {};
  let thumbnailCanvases = {};
  const THUMBNAIL_WIDTH = 120;
  const THUMBNAIL_HEIGHT = 160;
  
  // Apply a master page to the current page
  function applyToCurrentPage(masterPageId) {
    if (!masterPageId || !$currentPage) return;
    
    // Initialize service with canvas if available
    if (canvasInstance) {
      masterPageService.initialize(canvasInstance);
    }
    
    // Apply master page using the service
    masterPageService.applyMasterPage($currentPage, masterPageId);
    dispatch('masterPageApplied', { masterPageId, pageId: $currentPage });
  }
  
  // Apply a master page to all pages
  async function applyToAllPages(masterPageId) {
    if (!masterPageId || !$currentDocument) return;
    
    // Apply to each page
    for (const page of $currentDocument.pages) {
      await masterPageService.applyMasterPage(page.id, masterPageId);
    }
    
    const pageIds = $currentDocument.pages.map(page => page.id);
    dispatch('masterPageApplied', { masterPageId, pageIds });
  }
  
  // Select a master page for editing or applying
  function selectMasterPage(masterPageId) {
    selectedMasterPageId = masterPageId;
  }
  
  // Open dialog to create a new master page
  function openCreateDialog() {
    dialogMode = 'create';
    newMasterPageName = '';
    newMasterPageDescription = '';
    newMasterPageBasedOn = null;
    isDialogOpen = true;
  }
  
  // Open dialog to edit an existing master page
  function openEditDialog(masterPageId) {
    if (!masterPageId || !$currentDocument) return;
    
    const masterPage = $currentDocument.masterPages.find(mp => mp.id === masterPageId);
    if (!masterPage) return;
    
    dialogMode = 'edit';
    newMasterPageName = masterPage.name;
    newMasterPageDescription = masterPage.description || '';
    newMasterPageBasedOn = masterPage.basedOn;
    selectedMasterPageId = masterPageId;
    isDialogOpen = true;
  }
  
  // Close the dialog
  function closeDialog() {
    isDialogOpen = false;
  }
  
  // Delete a master page
  function deleteMasterPage(masterPageId) {
    if (!masterPageId) return;
    
    const confirmed = confirm('Are you sure you want to delete this master page? This action cannot be undone.');
    if (confirmed) {
      // Initialize service with canvas if available
      if (canvasInstance) {
        masterPageService.initialize(canvasInstance);
      }
      
      // Delete the master page using the service
      masterPageService.deleteMasterPage(masterPageId);
      
      if (selectedMasterPageId === masterPageId) {
        selectedMasterPageId = null;
      }
      
      dispatch('masterPageDeleted', { masterPageId });
    }
  }
  
  // Create or update a master page
  function saveMasterPage() {
    if (!newMasterPageName) return;
    
    // Initialize service with canvas if available
    if (canvasInstance) {
      masterPageService.initialize(canvasInstance);
    }
    
    if (dialogMode === 'create') {
      // Create a new master page using the service
      const newId = masterPageService.createMasterPage({
        title: newMasterPageName,
        description: newMasterPageDescription,
        basedOn: newMasterPageBasedOn
      });
      
      selectedMasterPageId = newId;
      dispatch('masterPageCreated', { masterPageId: newId });
    } else {
      // Update an existing master page using the service
      masterPageService.updateMasterPage(selectedMasterPageId, {
        title: newMasterPageName,
        description: newMasterPageDescription,
        basedOn: newMasterPageBasedOn
      });
      
      dispatch('masterPageUpdated', { masterPageId: selectedMasterPageId });
    }
    
    closeDialog();
  }
  
  // Edit a master page in the canvas
  function editMasterPage(masterPageId) {
    dispatch('editMasterPage', { masterPageId });
  }
  
  // Generate thumbnails for master pages
  $: if ($currentDocument && $currentDocument.masterPages) {
    setTimeout(() => {
      $currentDocument.masterPages.forEach(masterPage => {
        const canvasEl = thumbnailCanvasElements[masterPage.id];
        if (canvasEl && masterPage.canvasJSON) {
          try {
            // Initialize fabric canvas if not already done
            if (!thumbnailCanvases[masterPage.id]) {
              thumbnailCanvases[masterPage.id] = new fabric.StaticCanvas(canvasEl, {
                width: THUMBNAIL_WIDTH,
                height: THUMBNAIL_HEIGHT,
                backgroundColor: 'white'
              });
            }
            
            const canvas = thumbnailCanvases[masterPage.id];
            
            // Parse JSON if it's a string
            const jsonData = typeof masterPage.canvasJSON === 'string'
              ? JSON.parse(masterPage.canvasJSON)
              : masterPage.canvasJSON;
              
            // Clear canvas and load master page content
            canvas.clear();
            canvas.backgroundColor = 'white';
            
            // Calculate scale based on original document dimensions
            let scaleX = 1, scaleY = 1;
            if ($currentDocument.metadata && $currentDocument.metadata.pageSize) {
              const { width, height } = $currentDocument.metadata.pageSize;
              // Convert mm to pixels (assuming 96 DPI)
              const originalWidth = width * 3.78; // 96 DPI / 25.4 mm per inch
              const originalHeight = height * 3.78;
              
              scaleX = THUMBNAIL_WIDTH / originalWidth;
              scaleY = THUMBNAIL_HEIGHT / originalHeight;
            }
            
            // Load content with scaling
            canvas.loadFromJSON(jsonData, () => {
              canvas.getObjects().forEach(obj => {
                obj.scaleX = obj.scaleX * scaleX;
                obj.scaleY = obj.scaleY * scaleY;
                obj.left = obj.left * scaleX;
                obj.top = obj.top * scaleY;
                obj.selectable = false;
                obj.evented = false;
              });
              
              canvas.renderAll();
            });
          } catch (err) {
            console.error('Error generating thumbnail:', err);
          }
        }
      });
    }, 100);
  }
</script>

<div class="master-page-panel bg-white border border-gray-300 rounded-md shadow-sm">
  <div class="panel-header border-b border-gray-200 px-4 py-3 flex justify-between items-center">
    <h3 class="text-lg font-semibold text-gray-700">Master Pages</h3>
    <button 
      class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
      on:click={openCreateDialog}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      New
    </button>
  </div>
  
  <div class="panel-content p-4">
    {#if !$currentDocument || !$currentDocument.masterPages || $currentDocument.masterPages.length === 0}
      <div class="empty-state text-center py-8">
        <p class="text-gray-500 mb-4">No master pages created yet.</p>
        <button 
          class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          on:click={openCreateDialog}
        >
          Create Your First Master Page
        </button>
      </div>
    {:else}
      <div class="master-pages-grid grid grid-cols-2 gap-4">
        {#each $currentDocument.masterPages as masterPage (masterPage.id)}
          <div 
            class="master-page-item border rounded-md overflow-hidden {selectedMasterPageId === masterPage.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}"
            on:click={() => selectMasterPage(masterPage.id)}
          >
            <div class="thumbnail-container bg-gray-50 flex items-center justify-center" style="height: {THUMBNAIL_HEIGHT}px;">
              <canvas 
                bind:this={thumbnailCanvasElements[masterPage.id]} 
                width={THUMBNAIL_WIDTH} 
                height={THUMBNAIL_HEIGHT}
                class="thumbnail-canvas"
              ></canvas>
            </div>
            
            <div class="p-2">
              <h4 class="font-medium text-gray-800 truncate">{masterPage.name}</h4>
              {#if masterPage.description}
                <p class="text-gray-500 text-xs truncate">{masterPage.description}</p>
              {/if}
              
              <div class="actions mt-2 flex gap-1">
                <button 
                  title="Edit Master Page"
                  class="text-blue-500 hover:bg-blue-50 p-1 rounded-sm"
                  on:click|stopPropagation={() => editMasterPage(masterPage.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button 
                  title="Apply to Current Page"
                  class="text-green-500 hover:bg-green-50 p-1 rounded-sm"
                  on:click|stopPropagation={() => applyToCurrentPage(masterPage.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
                
                <button 
                  title="Apply to All Pages"
                  class="text-indigo-500 hover:bg-indigo-50 p-1 rounded-sm"
                  on:click|stopPropagation={() => applyToAllPages(masterPage.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                
                <button 
                  title="Rename/Properties"
                  class="text-amber-500 hover:bg-amber-50 p-1 rounded-sm"
                  on:click|stopPropagation={() => openEditDialog(masterPage.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                <button 
                  title="Delete Master Page"
                  class="text-red-500 hover:bg-red-50 p-1 rounded-sm ml-auto"
                  on:click|stopPropagation={() => deleteMasterPage(masterPage.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if isDialogOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="px-6 py-4 border-b">
        <h3 class="text-xl font-semibold text-gray-900">
          {dialogMode === 'create' ? 'Create New Master Page' : 'Edit Master Page'}
        </h3>
      </div>
      
      <div class="p-6">
        <div class="mb-4">
          <label for="masterPageName" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input 
            type="text" 
            id="masterPageName"
            bind:value={newMasterPageName}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Default Layout, Chapter Title, etc."
          />
        </div>
        
        <div class="mb-4">
          <label for="masterPageDescription" class="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea 
            id="masterPageDescription"
            bind:value={newMasterPageDescription}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Add a description of this master page..."
          ></textarea>
        </div>
        
        {#if $currentDocument && $currentDocument.masterPages && $currentDocument.masterPages.length > 0}
          <div class="mb-4">
            <label for="masterPageBasedOn" class="block text-sm font-medium text-gray-700 mb-1">Based On (optional)</label>
            <select 
              id="masterPageBasedOn"
              bind:value={newMasterPageBasedOn}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={null}>None</option>
              {#each $currentDocument.masterPages.filter(mp => mp.id !== selectedMasterPageId) as masterPage (masterPage.id)}
                <option value={masterPage.id}>{masterPage.name}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
      
      <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <button 
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          on:click={closeDialog}
        >
          Cancel
        </button>
        
        <button 
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={saveMasterPage}
          disabled={!newMasterPageName}
        >
          {dialogMode === 'create' ? 'Create' : 'Save Changes'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .master-page-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .panel-content {
    flex: 1;
    overflow-y: auto;
  }
  
  .thumbnail-canvas {
    max-width: 100%;
    max-height: 100%;
  }
</style>