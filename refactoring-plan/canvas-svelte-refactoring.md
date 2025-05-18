# Refactoring Plan for Canvas.svelte

## Current Structure

The `Canvas.svelte` file currently contains 789 lines of code, which is still quite large even after our previous refactoring efforts. This file is currently responsible for:

1. Initializing the canvas and context
2. Managing references to different modules
3. Canvas lifecycle (mount, unmount)
4. Object selection and manipulation exports
5. Page switching and state management
6. Rendering the canvas, rulers, and related UI elements

## Proposed Modular Structure

We'll extract more functionality into separate components and modules:

### 1. Extract CanvasInitialization.js (~100 lines)

This module will handle canvas initialization:

```javascript
import { fabric } from 'fabric';
import { createCanvas, detectFabricVersion } from '$lib/utils/fabric-helpers';
import TextFlow from '$lib/utils/text-flow';
import HistoryManager from '$lib/utils/history-manager';

/**
 * Canvas initialization module
 */
export function initializeCanvas({
  canvasElement,
  width,
  height,
  context,
  onHistoryChange
}) {
  let canvas = null;
  let textFlow = null;
  let historyManager = null;
  
  function initialize() {
    // Log fabric.js version info
    console.log("Fabric version detected:", detectFabricVersion());
    console.log("Available fabric classes:", {
      Canvas: !!fabric.Canvas,
      StaticCanvas: !!fabric.StaticCanvas,
      Textbox: !!fabric.Textbox,
      IText: !!fabric.IText,
      Text: !!fabric.Text
    });
    
    // Initialize Fabric.js canvas with the given dimensions using our helper
    try {
      canvas = createCanvas(canvasElement, {
        width,
        height,
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: 'white'
      });
      
      if (!canvas) {
        throw new Error("Failed to create canvas");
      }
    } catch (error) {
      console.error("Canvas initialization failed:", error);
      
      // Last resort fallback - try direct initialization
      try {
        canvas = new fabric.Canvas(canvasElement);
        canvas.setWidth(width);
        canvas.setHeight(height);
        canvas.selection = true;
        canvas.preserveObjectStacking = true;
        canvas.backgroundColor = 'white';
      } catch (fallbackError) {
        console.error("Canvas fallback initialization also failed:", fallbackError);
      }
    }
    
    // Initialize TextFlow manager
    textFlow = new TextFlow(canvas);
    
    // Initialize HistoryManager
    historyManager = new HistoryManager(canvas, {
      onChange: onHistoryChange
    });
    
    return {
      canvas,
      textFlow,
      historyManager
    };
  }
  
  function cleanup() {
    if (historyManager) {
      historyManager.dispose();
    }
    
    if (canvas) {
      canvas.dispose();
    }
  }
  
  return {
    initialize,
    cleanup
  };
}
```

### 2. Extract CanvasContentSwitcher.svelte (~200 lines)

This component will handle page switching logic:

```svelte
<script>
  import { onMount } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  
  // Props
  export let context;
  export let documentManagement;
  export let canvas;
  
  // State
  let previousPage = null;
  
  // Subscribe to current page changes
  $: if ($currentPage && canvas && $currentDocument && $currentPage !== previousPage) {
    handlePageChange($currentPage, previousPage);
  }
  
  /**
   * Handle page changes
   */
  function handlePageChange(newPage, oldPage) {
    console.log(`+==========================================+`);
    console.log(`| PAGE SWITCH: ${oldPage || 'null'} -> ${newPage} |`);
    console.log(`+==========================================+`);
    
    // Only save the previous page if we had one
    if (oldPage) {
      savePreviousPage(oldPage);
    }
    
    console.log("TRANSITION PHASE: Starting page switching sequence");
    
    // Update tracking variables
    console.log("TRANSITION PHASE: Updating tracking variables");
    previousPage = newPage;
    
    // Clear the canvas to prepare for new page
    console.log("TRANSITION PHASE: Clearing canvas");
    canvas.clear();
    canvas.backgroundColor = 'white';
    canvas.renderAll();
    
    // Verify canvas is truly cleared
    const objectsAfterClear = canvas.getObjects();
    console.log(`TRANSITION PHASE: Canvas after clear has ${objectsAfterClear.length} objects`);
    
    // Load the new page directly
    loadNewPage(newPage);
  }
  
  /**
   * Save the previous page before switching
   */
  function savePreviousPage(pageId) {
    console.log(`SAVE PHASE: Saving previous page ${pageId} before switching`);
    
    // Save the current page to the correct previous page ID
    const pageToSaveIndex = $currentDocument.pages.findIndex(p => p.id === pageId);
    
    console.log(`Page index in document: ${pageToSaveIndex}`);
    
    if (pageToSaveIndex >= 0) {
      // Force save of current page with additional verification
      const currentObjects = canvas.getObjects();
      console.log(`SAVE PHASE: Currently ${currentObjects.length} objects on canvas before saving page ${pageId}`);
      
      // Log detailed debugging info if needed
      if (currentObjects.length > 0) {
        console.log(`SAVE PHASE: Object details:`);
        // Detailed logging here
      }
      
      try {
        // Use a dedicated function to save a specific page
        console.log(`SAVE PHASE: Calling saveSpecificPage for ${pageId}`);
        documentManagement.saveSpecificPage(pageId, canvas.getObjects());
        
        console.log(`SAVE PHASE: Successfully saved page ${pageId} with ${currentObjects.length} objects`);
      } catch (err) {
        console.error(`SAVE PHASE: Error saving page ${pageId}:`, err);
      }
    } else {
      console.error(`SAVE PHASE ERROR: Could not find page ${pageId} in document to save`);
    }
    
    // Add a forced save to document store to ensure persistence
    console.log("SAVE PHASE: Forcing document save to ensure data persistence");
    currentDocument.update(doc => {
      return { ...doc, lastModified: new Date() };
    });
  }
  
  /**
   * Load a new page
   */
  function loadNewPage(pageId) {
    console.log(`+-------------------------------------+`);
    console.log(`| LOAD PHASE: Loading page ${pageId} |`);
    console.log(`+-------------------------------------+`);
    console.log(`LOAD PHASE: Calling loadPage() with shouldSaveFirst=false`);
    
    // Track loading time for debugging
    const loadStartTime = performance.now();
    
    documentManagement.loadPage(pageId, false).then(() => {
      const loadDuration = performance.now() - loadStartTime;
      console.log(`LOAD PHASE: loadPage() completed in ${loadDuration.toFixed(2)}ms`);
    }).catch(err => {
      console.error("LOAD PHASE ERROR: Failed to load page:", err);
      
      // Fallback to a clean canvas if loading fails
      if (canvas) {
        canvas.clear();
        canvas.backgroundColor = 'white';
        canvas.renderAll();
      }
    });
    
    // Force render cycles with a single delay
    setTimeout(performFinalCheck, 500);
  }
  
  /**
   * Perform final visibility check and rendering
   */
  function performFinalCheck() {
    console.log("FINAL PHASE: Final visibility check");
    
    if (canvas) {
      // Force rerender all objects
      const objects = canvas.getObjects();
      console.log(`FINAL PHASE: Found ${objects.length} objects for final check`);
      
      if (objects.length > 0) {
        console.log(`FINAL PHASE: Object details for verification:`);
        objects.forEach((obj, idx) => {
          // Make sure objects are visible
          obj.visible = true;
          obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
          obj.evented = true;
          obj.selectable = context.activeTool === 'select';
        });
      }
      
      // Force render
      console.log("FINAL PHASE: Forcing final render");
      canvas.requestRenderAll();
      canvas.renderAll();
      
      // Log final state
      const finalObjects = canvas.getObjects();
      console.log(`+-----------------------------------------------+`);
      console.log(`| PAGE SWITCH COMPLETE: ${finalObjects.length} objects on canvas |`);
      console.log(`+-----------------------------------------------+`);
    }
  }
  
  onMount(() => {
    // Initial setup if needed
    return () => {
      // Cleanup if needed
    };
  });
</script>
```

### 3. Extract CanvasRulers.svelte (~100 lines)

This component will handle rulers:

```svelte
<script>
  import HorizontalRuler from './HorizontalRuler.svelte';
  import VerticalRuler from './VerticalRuler.svelte';
  
  // Props
  export let width;
  export let height;
  export let canvasScrollX = 0;
  export let canvasScrollY = 0;
  export let zoomLevel = 1;
  export let showRulers = true;
  export let showHorizontalRuler = true;
  export let showVerticalRuler = true;
  export let rulerOffset = 20;
  
  // Events
  export let onCreateGuide;
  export let onUpdateGuide;
  export let onDeleteGuide;
</script>

{#if showRulers}
  <!-- Ruler corner square where rulers meet -->
  <div class="ruler-corner" style="width: {rulerOffset}px; height: {rulerOffset}px; z-index: 2;"></div>
{/if}

<!-- Horizontal ruler -->
{#if showHorizontalRuler}
  <div class="horizontal-ruler-container" style="left: {showVerticalRuler ? rulerOffset : 0}px; right: 0; top: 0; height: {rulerOffset}px; z-index: 1;">
    <HorizontalRuler 
      width={width} 
      offsetX={canvasScrollX} 
      scale={zoomLevel}
      on:createGuide={onCreateGuide}
      on:updateGuide={onUpdateGuide}
      on:deleteGuide={onDeleteGuide}
    />
  </div>
{/if}

<!-- Vertical ruler -->
{#if showVerticalRuler}
  <div class="vertical-ruler-container" style="top: {showHorizontalRuler ? rulerOffset : 0}px; bottom: 0; left: 0; width: {rulerOffset}px; z-index: 1;">
    <VerticalRuler 
      height={height} 
      offsetY={canvasScrollY} 
      scale={zoomLevel} 
      on:createGuide={onCreateGuide}
      on:updateGuide={onUpdateGuide}
      on:deleteGuide={onDeleteGuide}
    />
  </div>
{/if}

<style>
  .ruler-corner {
    position: absolute;
    top: 0;
    left: 0;
    background-color: #e0e0e0;
    border-right: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
  }
  
  .horizontal-ruler-container {
    position: absolute;
    overflow: hidden;
  }
  
  .vertical-ruler-container {
    position: absolute;
    overflow: hidden;
  }
</style>
```

### 4. Refactored Canvas.svelte (~400 lines)

The main canvas component after refactoring:

```svelte
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType, currentToolOptions } from '$lib/stores/toolbar';
  import { clipboard } from '$lib/stores/editor';
  import MasterObjectContextMenu from './MasterObjectContextMenu.svelte';
  import { loadDocument } from '$lib/utils/storage.js';
  
  // Import modular components
  import { 
    createCanvasContext,
    createEventHandlers,
    createLayerManagement,
    createObjectManipulation,
    createDocumentManagement,
    createGuideManagement,
    createGridManagement
  } from './modules/Canvas.index.js';
  
  // Import the extracted components
  import { initializeCanvas } from './CanvasInitialization.js';
  import CanvasContentSwitcher from './CanvasContentSwitcher.svelte';
  import CanvasRulers from './CanvasRulers.svelte';
  
  const dispatch = createEventDispatcher();
  
  // Props using the standard Svelte 4 syntax
  export let width = 1240; // Default A4 @ 150 DPI: 210mm × 1.5 × 3.93701
  export let height = 1754; // Default A4 @ 150 DPI: 297mm × 1.5 × 3.93701
  
  // Canvas element references
  let canvasElement;
  let canvas;
  let canvasContainer;
  let imageInput;
  
  // Module functions that will be initialized
  let eventHandlers;
  let layerManagement;
  let objectManipulation;
  let documentManagement;
  let guideManagement;
  let gridManagement;
  let canvasInitializer;
  
  // State variables
  let isMounted = false;
  let selectedObject = null;
  let textFlow;
  let historyManager;
  let canUndo = false;
  let canRedo = false;
  
  // Context menu state
  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuObject = null;
  
  // Grid and rulers state
  let canvasScrollX = 0;
  let canvasScrollY = 0;
  let zoomLevel = 1;
  
  // Show/hide rulers based on document settings
  $: showRulers = $currentDocument?.metadata?.rulers?.enabled || false;
  $: showHorizontalRuler = showRulers && ($currentDocument?.metadata?.rulers?.horizontalVisible || true);
  $: showVerticalRuler = showRulers && ($currentDocument?.metadata?.rulers?.verticalVisible || true);
  
  // Calculate ruler positions
  $: rulerWidth = width;
  $: rulerHeight = height;
  $: rulerOffset = 20; // Width/height of the rulers
  
  // Watch for grid changes
  $: if (canvas && $currentDocument?.metadata?.grid && gridManagement) {
    // Use our grid module's renderGrid function
    gridManagement.renderGrid();
  }
  
  // Generate a unique ID for objects when needed
  function generateId() {
    return 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }
  
  // Handle active tool changes
  $: if (canvas && $activeTool) {
    setupCanvasForTool($activeTool);
    
    // After changing tools, ensure all objects are properly rendered
    setTimeout(() => {
      canvas.requestRenderAll();
      canvas.renderAll();
    }, 0);
  }
  
  // Setup canvas for a specific tool
  function setupCanvasForTool(toolType) {
    // Current implementation
  }
  
  // Update text flow when text content changes
  function updateTextFlow(textObject) {
    // Current implementation
  }
  
  // Handle context menu override action
  function handleContextMenuOverride(event) {
    // Current implementation
  }
  
  // Handle context menu edit master action
  function handleContextMenuEditMaster(event) {
    // Current implementation
  }
  
  // Initialize a shared context for all canvas modules
  function initializeCanvasContext() {
    // Current implementation
  }
  
  // Handle history change events
  function handleHistoryChange(state) {
    canUndo = state.canUndo;
    canRedo = state.canRedo;
    
    // Dispatch event both as a component event and a DOM event for Toolbar to listen
    dispatch('historyChange', { canUndo, canRedo });
    
    // Create a custom event for other components to listen to
    const historyEvent = new CustomEvent('historyChange', { 
      detail: { canUndo, canRedo },
      bubbles: true 
    });
    document.dispatchEvent(historyEvent);
  }
  
  // Export functions to make them available to parent components
  export const getCanvas = () => canvas;
  export const getSelectedObject = () => selectedObject;
  export const getTextFlow = () => textFlow;
  
  // Direct exports of canvas functions
  export const bringForward = () => layerManagement?.bringForward();
  export const sendBackward = () => layerManagement?.sendBackward();
  export const bringToFront = () => layerManagement?.bringToFront();
  export const sendToBack = () => layerManagement?.sendToBack();
  export const deleteSelectedObjects = () => objectManipulation?.deleteSelectedObjects();
  export const copySelectedObjects = () => objectManipulation?.copySelectedObjects();
  export const cutSelectedObjects = () => objectManipulation?.cutSelectedObjects();
  export const pasteObjects = () => objectManipulation?.pasteObjects();
  export const undo = () => historyManager?.canUndo() ? historyManager.undo() : null;
  export const redo = () => historyManager?.canRedo() ? historyManager.redo() : null;
  export const overrideMasterObject = (obj) => documentManagement?.overrideMasterObject(obj);
  export const isObjectFromMaster = (obj) => objectManipulation?.isObjectFromMaster(obj);
  export const getMasterPageObjects = () => objectManipulation?.getMasterPageObjects();
  export const saveCurrentPage = () => documentManagement?.saveCurrentPage();
  export const saveSpecificPage = (pageId, objects) => documentManagement?.saveSpecificPage(pageId, objects);
  export const recoverObjectsFromJson = (pageJson) => {
    // Current implementation
  };
  
  // Guide-related event handlers
  function handleCreateGuide(event) {
    guideManagement.handleCreateGuide(event.detail);
  }
  
  function handleUpdateGuide(event) {
    guideManagement.handleUpdateGuide(event.detail);
  }
  
  function handleDeleteGuide(event) {
    guideManagement.handleDeleteGuide(event.detail);
  }
  
  function refreshGuides() {
    guideManagement.loadGuidesFromDocument();
  }
  
  onMount(() => {
    isMounted = true;
    
    // Initialize canvas using our extracted module
    canvasInitializer = initializeCanvas({
      canvasElement,
      width,
      height,
      context: {
        activeTool: $activeTool,
        generateId
      },
      onHistoryChange: handleHistoryChange
    });
    
    const { canvas: initializedCanvas, textFlow: initializedTextFlow, historyManager: initializedHistoryManager } = canvasInitializer.initialize();
    
    canvas = initializedCanvas;
    textFlow = initializedTextFlow;
    historyManager = initializedHistoryManager;
    
    // Initialize canvas context and modules
    const context = initializeCanvasContext();
    
    // Register event handlers
    eventHandlers.registerEventHandlers();
    
    // Setup canvas for initial tool
    setupCanvasForTool($activeTool);
    
    // Initialize grid if enabled
    if ($currentDocument?.metadata?.grid?.enabled && gridManagement) {
      gridManagement.renderGrid();
    }
    
    // Initialize guides for current page
    refreshGuides();
    
    // Create a derived store to update context when store values change
    $: {
      if (context && context.update) {
        console.log("Canvas.svelte: Updating context with new document/page data");
        context.update({
          currentDocument: $currentDocument || null,
          currentPage: $currentPage || null,
          activeTool: $activeTool,
          currentToolOptions: $currentToolOptions
        });
      }
    }
    
    return () => {
      // Clean up canvas on component unmount
      eventHandlers.removeEventHandlers();
      canvasInitializer.cleanup();
    };
  });
</script>

<div class="canvas-wrapper relative overflow-hidden">
  <!-- Rulers -->
  <CanvasRulers
    width={width}
    height={height}
    canvasScrollX={canvasScrollX}
    canvasScrollY={canvasScrollY}
    zoomLevel={zoomLevel}
    showRulers={showRulers}
    showHorizontalRuler={showHorizontalRuler}
    showVerticalRuler={showVerticalRuler}
    rulerOffset={rulerOffset}
    onCreateGuide={handleCreateGuide}
    onUpdateGuide={handleUpdateGuide}
    onDeleteGuide={handleDeleteGuide}
  />
  
  <!-- Canvas container -->
  <div 
    class="canvas-container flex items-center justify-center p-8"
    bind:this={canvasContainer}
    on:scroll={eventHandlers?.handleScroll}
    style="left: {showVerticalRuler ? rulerOffset : 0}px; top: {showHorizontalRuler ? rulerOffset : 0}px; right: 0; bottom: 0; position: absolute;"
  >
    <div class="canvas-paper shadow-lg">
      <canvas 
        bind:this={canvasElement} 
        width={width} 
        height={height}
        class="border border-gray-300"
        data-testid="editor-canvas"
      ></canvas>
    </div>
  </div>
  
  <!-- Page switching logic (conditionally rendered when context is available) -->
  {#if canvas && documentManagement && isMounted}
    <CanvasContentSwitcher 
      context={{
        activeTool: $activeTool
      }}
      {documentManagement}
      {canvas}
    />
  {/if}
</div>

<!-- Master object context menu -->
<MasterObjectContextMenu 
  visible={showContextMenu}
  x={contextMenuX}
  y={contextMenuY}
  object={contextMenuObject}
  on:override={handleContextMenuOverride}
  on:editMaster={handleContextMenuEditMaster}
/>

<!-- Hidden file input for image tool -->
<input 
  type="file" 
  bind:this={imageInput}
  accept="image/*" 
  style="display: none;" 
  on:change={eventHandlers?.handleImageUpload}
  data-testid="image-upload"
/>

<style>
  .canvas-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  .canvas-container {
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: theme('colors.canvas.background');
  }
  
  .canvas-paper {
    display: inline-block;
  }
</style>
```

## Implementation Steps

1. Create the new files in `src/lib/components/Editor/`
2. Extract the functionality as outlined above
3. Update imports and references in the main Canvas.svelte file
4. Update any dependent components that might be affected
5. Test each component individually
6. Test the integrated solution

## Benefits

1. Further improves the modularity of the Canvas component
2. Makes each part of the canvas functionality more focused and easier to maintain
3. Separates the core canvas initialization from the UI rendering
4. Separates the page switching logic into its own component
5. Makes the rulers more reusable
6. Reduces cognitive load when working on a specific feature
7. Makes future refactoring or updates easier