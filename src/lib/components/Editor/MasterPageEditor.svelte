<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { currentDocument } from '$lib/stores/document';
  import { activeTool, ToolType } from '$lib/stores/toolbar';
  import * as documentStore from '$lib/stores/document';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let masterPageId = null;
  export let canvasInstance = null;
  
  // Local state
  let editingMasterPage = null;
  let isEditMode = false;
  let originalToolType = null;
  
  // This stores the original canvas state to revert to when exiting master page editing
  let originalCanvasState = null;
  
  // Watch for changes to masterPageId prop
  $: if (masterPageId && canvasInstance && $currentDocument) {
    loadMasterPage(masterPageId);
  }
  
  // Lifecycle
  onMount(() => {
    return () => {
      // Clean up on component destruction
      if (isEditMode) {
        exitEditMode();
      }
    };
  });
  
  /**
   * Load a master page for editing
   * @param {string} id - Master page ID to load
   */
  function loadMasterPage(id) {
    const masterPage = $currentDocument.masterPages.find(mp => mp.id === id);
    if (masterPage) {
      editingMasterPage = { ...masterPage };
    }
  }
  
  /**
   * Enter master page editing mode
   */
  export function enterEditMode() {
    if (!canvasInstance || !editingMasterPage) return;
    
    // Save the original canvas state and tool
    originalCanvasState = canvasInstance.toJSON(['id', 'linkedObjectIds']);
    originalToolType = $activeTool;
    
    // Clear the canvas and load master page content
    canvasInstance.clear();
    
    if (editingMasterPage.canvasJSON) {
      try {
        const jsonData = typeof editingMasterPage.canvasJSON === 'string'
          ? JSON.parse(editingMasterPage.canvasJSON)
          : editingMasterPage.canvasJSON;
          
        canvasInstance.loadFromJSON(jsonData, () => {
          // Mark all objects as part of master page
          canvasInstance.getObjects().forEach(obj => {
            obj.fromMaster = true;
            obj.masterId = editingMasterPage.id;
            if (!obj.masterObjectId) {
              obj.masterObjectId = `master-obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            }
            
            // By default, all master page objects are overridable
            obj.overridable = true;
          });
          
          canvasInstance.renderAll();
        });
      } catch (err) {
        console.error('Error loading master page JSON:', err);
      }
    }
    
    // Visual styling for master page editing mode
    const canvasContainer = canvasInstance.wrapperEl.parentNode;
    canvasContainer.classList.add('master-page-editing');
    
    isEditMode = true;
    dispatch('editModeChanged', { isEditMode });
  }
  
  /**
   * Exit master page editing mode
   * @param {boolean} [save=true] - Whether to save changes to the master page
   */
  export function exitEditMode(save = true) {
    if (!canvasInstance || !isEditMode) return;
    
    if (save) {
      // Save the current canvas state to the master page
      saveMasterPage();
    }
    
    // Restore original canvas state
    canvasInstance.clear();
    
    if (originalCanvasState) {
      canvasInstance.loadFromJSON(originalCanvasState, () => {
        canvasInstance.renderAll();
      });
    }
    
    // Restore original tool
    if (originalToolType) {
      activeTool.set(originalToolType);
    }
    
    // Remove visual styling
    const canvasContainer = canvasInstance.wrapperEl.parentNode;
    canvasContainer.classList.remove('master-page-editing');
    
    isEditMode = false;
    dispatch('editModeChanged', { isEditMode });
  }
  
  /**
   * Save the current canvas state to the master page
   */
  function saveMasterPage() {
    if (!canvasInstance || !editingMasterPage) return;
    
    // Serialize canvas as JSON string
    const canvasJSON = JSON.stringify(canvasInstance.toJSON([
      'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
    ]));
    
    // Update the master page in the store
    documentStore.updateMasterPage(editingMasterPage.id, {
      canvasJSON,
      lastModified: new Date()
    });
    
    dispatch('masterPageSaved', { masterPageId: editingMasterPage.id });
  }
  
  /**
   * Toggle whether objects from this master page can be overridden
   * @param {Object} fabricObject - Fabric.js object to toggle overridability
   */
  export function toggleObjectOverridable(fabricObject) {
    if (!fabricObject || !fabricObject.masterObjectId) return;
    
    fabricObject.overridable = !fabricObject.overridable;
    canvasInstance.renderAll();
  }
  
  /**
   * Exports functions for parent components
   */
  export function getEditingMasterPageId() {
    return editingMasterPage?.id;
  }
  
  export function isInEditMode() {
    return isEditMode;
  }
</script>

{#if isEditMode}
  <div class="master-page-edit-indicator bg-amber-600 text-white px-4 py-2 rounded-md fixed top-4 right-4 z-50 shadow-lg">
    <div class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
      <span>Editing Master Page: <strong>{editingMasterPage?.name}</strong></span>
    </div>
    <div class="mt-2 flex justify-end gap-2">
      <button 
        class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
        on:click={() => exitEditMode(false)}
      >
        Cancel
      </button>
      <button 
        class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
        on:click={() => exitEditMode(true)}
      >
        Save & Exit
      </button>
    </div>
  </div>
{/if}

<style>
  :global(.master-page-editing) {
    position: relative;
    outline: 4px solid #d97706; /* amber-600 */
  }
  
  :global(.master-page-editing)::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background-color: #d97706; /* amber-600 */
  }
</style>