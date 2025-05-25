<script>
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { onMount, onDestroy } from 'svelte';
  import documentService from '$lib/services/DocumentService';
  import gridService from '$lib/services/GridService';
  import guideService from '$lib/services/GuideService';
  
  // State for managing guides
  let horizontalGuides = [];
  let verticalGuides = [];
  let initialized = false;
  let documentInitialized = false;
  let selectedGuideIndex = -1;
  let selectedGuideType = null; // 'horizontal' or 'vertical'
  
  // Setup default values for grid settings
  $: gridEnabled = $currentDocument?.metadata?.grid?.enabled || false;
  $: gridSnap = $currentDocument?.metadata?.grid?.snap || false;
  $: gridSize = $currentDocument?.metadata?.grid?.size || 10;
  $: gridSubdivisions = $currentDocument?.metadata?.grid?.subdivisions || 2;
  $: gridColor = $currentDocument?.metadata?.grid?.color || '#CCCCCC';
  $: gridOpacity = $currentDocument?.metadata?.grid?.opacity || 0.5;
  
  // Monitor changes to document and page to update guides
  $: if ($currentDocument && $currentPage && initialized) {
    loadGuidesFromDocument();
    documentInitialized = true;
  }
  
  // Initialize services
  onMount(() => {
    initialized = true;
    
    // Load guides if document and page exist
    if ($currentDocument && $currentPage) {
      loadGuidesFromDocument();
      documentInitialized = true;
    }
    
    return () => {
      initialized = false;
    };
  });
  
  /**
   * Load guides from the current document and page
   */
  function loadGuidesFromDocument() {
    if (!$currentDocument || !$currentPage) return;
    
    const page = $currentDocument.pages.find(p => p.id === $currentPage);
    if (!page) return;
    
    // Get guides from page or use empty arrays if none exist
    horizontalGuides = (page.guides?.horizontal || []).slice();
    verticalGuides = (page.guides?.vertical || []).slice();
  }
  
  /**
   * Updates grid settings in the document
   * @param {Object} settings - New grid settings
   */
  function updateGridSettings(settings) {
    if (!initialized || !$currentDocument) return;
    
    // Use GridService to update grid properties
    gridService.updateGridProperties(settings);
  }
  
  /**
   * Updates ruler settings in the document
   * @param {Object} settings - New ruler settings
   */
  function updateRulerSettings(settings) {
    if (!initialized || !$currentDocument) return;
    
    // Use DocumentService to update metadata
    documentService.updateDocumentMetadata({
      rulers: {
        ...($currentDocument?.metadata?.rulers || {}),
        ...settings
      }
    });
  }
  
  /**
   * Toggles grid visibility
   * @param {Event} e - Change event
   */
  function toggleGrid(e) {
    if (!initialized) return;
    gridService.toggleGrid(e.target.checked);
  }
  
  /**
   * Toggles grid snapping
   * @param {Event} e - Change event
   */
  function toggleGridSnap(e) {
    updateGridSettings({ snap: e.target.checked });
  }
  
  /**
   * Updates grid size
   * @param {Event} e - Change event
   */
  function updateGridSize(e) {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateGridSettings({ size: value });
    }
  }
  
  /**
   * Updates grid subdivisions
   * @param {Event} e - Change event
   */
  function updateGridSubdivisions(e) {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateGridSettings({ subdivisions: value });
    }
  }
  
  /**
   * Updates grid color
   * @param {Event} e - Change event
   */
  function updateGridColor(e) {
    updateGridSettings({ color: e.target.value });
  }
  
  /**
   * Updates grid opacity
   * @param {Event} e - Change event
   */
  function updateGridOpacity(e) {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      updateGridSettings({ opacity: value });
    }
  }
  
  /**
   * Toggles rulers visibility
   * @param {Event} e - Change event
   */
  function toggleRulers(e) {
    updateRulerSettings({ enabled: e.target.checked });
  }
  
  /**
   * Updates ruler units
   * @param {Event} e - Change event
   */
  function updateRulerUnits(e) {
    updateRulerSettings({ units: e.target.value });
  }
  
  /**
   * Toggle horizontal ruler visibility
   * @param {Event} e - Change event
   */
  function toggleHorizontalRuler(e) {
    updateRulerSettings({ horizontalVisible: e.target.checked });
  }
  
  /**
   * Toggle vertical ruler visibility
   * @param {Event} e - Change event
   */
  function toggleVerticalRuler(e) {
    updateRulerSettings({ verticalVisible: e.target.checked });
  }
  
  /**
   * Creates a new horizontal guide
   */
  function addHorizontalGuide() {
    if (!initialized || !documentInitialized) return;
    
    // Create a guide in the middle of the canvas if no guides exist,
    // otherwise add one below the last guide
    const position = horizontalGuides.length > 0 
      ? horizontalGuides[horizontalGuides.length - 1] + 100 
      : 500;
    
    const guide = guideService.createHorizontalGuide(position);
    
    // Update local guides list
    loadGuidesFromDocument();
    
    // Select the new guide
    selectedGuideIndex = horizontalGuides.length - 1;
    selectedGuideType = 'horizontal';
  }
  
  /**
   * Creates a new vertical guide
   */
  function addVerticalGuide() {
    if (!initialized || !documentInitialized) return;
    
    // Create a guide in the middle of the canvas if no guides exist,
    // otherwise add one to the right of the last guide
    const position = verticalGuides.length > 0 
      ? verticalGuides[verticalGuides.length - 1] + 100 
      : 500;
    
    const guide = guideService.createVerticalGuide(position);
    
    // Update local guides list
    loadGuidesFromDocument();
    
    // Select the new guide
    selectedGuideIndex = verticalGuides.length - 1;
    selectedGuideType = 'vertical';
  }
  
  /**
   * Updates the position of a guide
   * @param {string} type - 'horizontal' or 'vertical'
   * @param {number} index - Index of the guide
   * @param {number} position - New position
   */
  function updateGuidePosition(type, index, position) {
    if (!initialized || !documentInitialized) return;
    
    // Get guide reference from canvas
    const canvas = guideService.canvas;
    if (!canvas) return;
    
    // Find the guide object in the canvas
    const guides = canvas.getObjects().filter(obj => obj.guide && obj.orientation === type);
    if (!guides[index]) return;
    
    // Update guide position
    if (type === 'horizontal') {
      guides[index].set('top', position);
      guides[index].set('y1', position);
      guides[index].set('y2', position);
    } else {
      guides[index].set('left', position);
      guides[index].set('x1', position);
      guides[index].set('x2', position);
    }
    
    // Update guide's internal position tracking
    guides[index].originalPosition = position;
    
    // Request render and save
    canvas.requestRenderAll();
    guideService.saveGuidesToDocument();
    
    // Update local guide list
    loadGuidesFromDocument();
  }
  
  /**
   * Removes a guide
   * @param {string} type - 'horizontal' or 'vertical'
   * @param {number} index - Index of the guide
   */
  function removeGuide(type, index) {
    if (!initialized || !documentInitialized) return;
    
    // Get guide reference from canvas
    const canvas = guideService.canvas;
    if (!canvas) return;
    
    // Find the guide object in the canvas
    const guides = canvas.getObjects().filter(obj => obj.guide && obj.orientation === type);
    if (!guides[index]) return;
    
    // Delete the guide
    guideService.deleteGuide(guides[index]);
    
    // Reset selection
    selectedGuideIndex = -1;
    selectedGuideType = null;
    
    // Update local guide list
    loadGuidesFromDocument();
  }
  
  /**
   * Clears all guides
   */
  function clearAllGuides() {
    if (!initialized || !documentInitialized) return;
    
    guideService.clearGuides();
    guideService.saveGuidesToDocument();
    
    // Reset selection
    selectedGuideIndex = -1;
    selectedGuideType = null;
    
    // Update local guide list
    loadGuidesFromDocument();
  }
  
  /**
   * Handler for guide position input changes
   * @param {Event} e - Input event
   */
  function handleGuidePositionChange(e) {
    if (selectedGuideType === null || selectedGuideIndex === -1) return;
    
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      updateGuidePosition(selectedGuideType, selectedGuideIndex, value);
    }
  }
  
  /**
   * Selects a guide for editing
   * @param {string} type - 'horizontal' or 'vertical'
   * @param {number} index - Index of the guide
   */
  function selectGuide(type, index) {
    selectedGuideType = type;
    selectedGuideIndex = index;
  }
</script>

<div class="grid-config-panel bg-white rounded shadow p-4">
  <h3 class="text-lg font-semibold mb-4">Grid & Guides</h3>
  
  <!-- Grid Settings -->
  <section class="mb-4">
    <h4 class="font-medium mb-2">Grid</h4>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={gridEnabled}
          on:change={toggleGrid}
        />
        Show Grid
      </label>
    </div>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={gridSnap}
          on:change={toggleGridSnap}
        />
        Snap to Grid
      </label>
    </div>
    
    <div class="mb-2 flex items-center">
      <label class="mr-2">Grid Size:</label>
      <input
        type="number"
        min="1"
        max="100"
        class="border rounded px-2 py-1 w-16"
        value={gridSize}
        on:input={updateGridSize}
      />
      <span class="ml-1 text-sm text-gray-500">mm</span>
    </div>
    
    <div class="mb-2 flex items-center">
      <label class="mr-2">Subdivisions:</label>
      <input
        type="number"
        min="1"
        max="10"
        class="border rounded px-2 py-1 w-16"
        value={gridSubdivisions}
        on:input={updateGridSubdivisions}
      />
    </div>
    
    <div class="mb-2 flex items-center">
      <label class="mr-2">Grid Color:</label>
      <input
        type="color"
        class="border rounded cursor-pointer"
        value={gridColor}
        on:input={updateGridColor}
      />
    </div>
    
    <div class="mb-2 flex items-center">
      <label class="mr-2">Opacity:</label>
      <input
        type="range"
        min="0.1"
        max="1"
        step="0.1"
        class="w-32"
        value={gridOpacity}
        on:input={updateGridOpacity}
      />
      <span class="ml-2">{(gridOpacity * 100).toFixed(0)}%</span>
    </div>
  </section>
  
  <!-- Ruler Settings -->
  <section class="mb-4">
    <h4 class="font-medium mb-2">Rulers</h4>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={$currentDocument?.metadata?.rulers?.enabled}
          on:change={toggleRulers}
        />
        Show Rulers
      </label>
    </div>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={$currentDocument?.metadata?.rulers?.horizontalVisible}
          on:change={toggleHorizontalRuler}
        />
        Horizontal Ruler
      </label>
    </div>
    
    <div class="mb-2">
      <label class="flex items-center">
        <input
          type="checkbox"
          class="mr-2"
          checked={$currentDocument?.metadata?.rulers?.verticalVisible}
          on:change={toggleVerticalRuler}
        />
        Vertical Ruler
      </label>
    </div>
    
    <div class="mb-2">
      <label>
        Units:
        <select
          class="border rounded px-2 py-1 ml-2"
          value={$currentDocument?.metadata?.rulers?.units || 'mm'}
          on:change={updateRulerUnits}
        >
          <option value="mm">Millimeters</option>
          <option value="cm">Centimeters</option>
          <option value="inch">Inches</option>
          <option value="px">Pixels</option>
        </select>
      </label>
    </div>
  </section>
  
  <!-- Guides Management -->
  <section>
    <h4 class="font-medium mb-2">Guides</h4>
    
    <div class="mb-3 flex gap-2">
      <button 
        class="bg-blue-500 text-white py-1 px-3 rounded text-sm"
        on:click={addHorizontalGuide}
      >
        Add Horizontal
      </button>
      <button 
        class="bg-blue-500 text-white py-1 px-3 rounded text-sm"
        on:click={addVerticalGuide}
      >
        Add Vertical
      </button>
      <button 
        class="bg-red-500 text-white py-1 px-3 rounded text-sm ml-auto"
        on:click={clearAllGuides}
      >
        Clear All
      </button>
    </div>
    
    <!-- Guide Lists -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Horizontal Guides -->
      <div>
        <h5 class="text-sm font-medium mb-1">Horizontal Guides</h5>
        <div class="bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
          {#if horizontalGuides.length === 0}
            <p class="text-gray-500 text-xs italic">No horizontal guides</p>
          {:else}
            <ul class="text-sm">
              {#each horizontalGuides as guide, i}
                <li class="mb-1 flex items-center">
                  <button 
                    class="flex-1 text-left px-2 py-1 rounded text-xs {selectedGuideType === 'horizontal' && selectedGuideIndex === i ? 'bg-blue-100' : 'hover:bg-gray-100'}"
                    on:click={() => selectGuide('horizontal', i)}
                  >
                    {guide} px
                  </button>
                  <button 
                    class="text-red-500 ml-1 p-1"
                    on:click={() => removeGuide('horizontal', i)}
                  >
                    ×
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
      
      <!-- Vertical Guides -->
      <div>
        <h5 class="text-sm font-medium mb-1">Vertical Guides</h5>
        <div class="bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
          {#if verticalGuides.length === 0}
            <p class="text-gray-500 text-xs italic">No vertical guides</p>
          {:else}
            <ul class="text-sm">
              {#each verticalGuides as guide, i}
                <li class="mb-1 flex items-center">
                  <button 
                    class="flex-1 text-left px-2 py-1 rounded text-xs {selectedGuideType === 'vertical' && selectedGuideIndex === i ? 'bg-blue-100' : 'hover:bg-gray-100'}"
                    on:click={() => selectGuide('vertical', i)}
                  >
                    {guide} px
                  </button>
                  <button 
                    class="text-red-500 ml-1 p-1"
                    on:click={() => removeGuide('vertical', i)}
                  >
                    ×
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    </div>
    
    <!-- Guide Editor -->
    {#if selectedGuideType && selectedGuideIndex >= 0}
      <div class="mt-3 p-2 border rounded bg-blue-50">
        <h5 class="text-sm font-medium mb-1">Edit Guide</h5>
        <div class="flex items-center gap-2">
          <span class="text-xs">{selectedGuideType === 'horizontal' ? 'Y Position:' : 'X Position:'}</span>
          <input 
            type="number" 
            class="border rounded px-2 py-1 w-20 text-sm"
            value={selectedGuideType === 'horizontal' 
              ? horizontalGuides[selectedGuideIndex] 
              : verticalGuides[selectedGuideIndex]
            }
            on:input={handleGuidePositionChange}
          />
          <span class="text-xs">px</span>
          <button 
            class="bg-red-500 text-white text-xs py-1 px-2 rounded ml-auto"
            on:click={() => removeGuide(selectedGuideType, selectedGuideIndex)}
          >
            Remove
          </button>
        </div>
      </div>
    {/if}
  </section>
  
  <div class="mt-4 pt-4 border-t text-sm text-gray-600">
    <p>Tip: Drag from rulers to create guides</p>
    <p>Double-click on guide markers to delete guides</p>
  </div>
</div>