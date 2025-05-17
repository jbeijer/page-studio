<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import MasterPageEditor from './MasterPageEditor.svelte';
  import MasterPagePanel from './MasterPagePanel.svelte';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let canvasComponent = null; // Reference to Canvas.svelte component
  
  // Local state
  let canvasInstance = null;
  let masterPageEditor;
  let isEditingMasterPage = false;
  let selectedMasterPageId = null;
  let showPanel = false;
  
  // Initialize canvas instance once the canvasComponent prop is available
  $: if (canvasComponent) {
    canvasInstance = canvasComponent.getCanvas();
  }
  
  // Event handlers
  function handleEditMasterPage(event) {
    if (canvasComponent && masterPageEditor) {
      const { masterPageId } = event.detail;
      selectedMasterPageId = masterPageId;
      
      // Before entering edit mode, save the current page
      canvasComponent.saveCurrentPage && canvasComponent.saveCurrentPage();
      
      // Enter master page editing mode
      masterPageEditor.enterEditMode();
      isEditingMasterPage = true;
      
      dispatch('editingMasterPage', { masterPageId });
    }
  }
  
  function handleMasterPageSaved(event) {
    const { masterPageId } = event.detail;
    
    // Notify parent components
    dispatch('masterPageSaved', { masterPageId });
    
    // Update all pages using this master page
    // (actual updating handled by Canvas component via the document store)
  }
  
  function handleEditModeChanged(event) {
    const { isEditMode } = event.detail;
    isEditingMasterPage = isEditMode;
    
    // Notify parent components
    dispatch('editModeChanged', { isEditMode });
    
    // If exiting edit mode, reload the current page
    if (!isEditMode && canvasComponent) {
      setTimeout(() => {
        canvasComponent.loadPage && canvasComponent.loadPage($currentPage);
      }, 100);
    }
  }
  
  function handleMasterPageApplied(event) {
    const { masterPageId, pageId, pageIds } = event.detail;
    
    // Notify parent components
    dispatch('masterPageApplied', { masterPageId, pageId, pageIds });
    
    // If the current page was affected, reload it
    if (pageId === $currentPage || (pageIds && pageIds.includes($currentPage))) {
      setTimeout(() => {
        canvasComponent.loadPage && canvasComponent.loadPage($currentPage);
      }, 100);
    }
  }
  
  function handleMasterObjectClick(event) {
    if (!canvasComponent || !canvasInstance) return;
    
    const { object } = event.detail;
    
    if (object && object.fromMaster && object.overridable) {
      // Show context menu or dialog for override options
      const confirmed = confirm('Override this master page object? This will create a local copy that you can edit.');
      
      if (confirmed && canvasComponent.overrideMasterObject) {
        const newObject = canvasComponent.overrideMasterObject(object);
        
        if (newObject) {
          canvasInstance.setActiveObject(newObject);
          canvasInstance.renderAll();
        }
      }
    }
  }
  
  // Toggle the master page panel visibility
  export function togglePanel() {
    showPanel = !showPanel;
  }
</script>

{#if canvasComponent}
  <!-- Master Page Editor Component -->
  <MasterPageEditor
    bind:this={masterPageEditor}
    masterPageId={selectedMasterPageId}
    canvasInstance={canvasInstance}
    on:editModeChanged={handleEditModeChanged}
    on:masterPageSaved={handleMasterPageSaved}
  />
  
  <!-- Master Page Panel (conditionally visible) -->
  {#if showPanel}
    <div class="master-page-panel-container fixed right-0 top-0 bottom-0 w-72 bg-white shadow-lg z-40 overflow-auto">
      <div class="p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-700">Master Pages</h3>
          <button 
            class="text-gray-500 hover:text-gray-700"
            on:click={togglePanel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <MasterPagePanel 
          canvasInstance={canvasInstance}
          on:editMasterPage={handleEditMasterPage}
          on:masterPageApplied={handleMasterPageApplied}
        />
      </div>
    </div>
  {/if}
{/if}