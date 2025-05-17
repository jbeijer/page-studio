<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType, currentToolOptions } from '$lib/stores/toolbar';
  import { clipboard } from '$lib/stores/editor';
  import { fabric } from 'fabric';
  import TextFlow from '$lib/utils/text-flow';
  import HistoryManager from '$lib/utils/history-manager';
  import { createCanvas, detectFabricVersion } from '$lib/utils/fabric-helpers';
  import MasterObjectContextMenu from './MasterObjectContextMenu.svelte';
  import HorizontalRuler from './HorizontalRuler.svelte';
  import VerticalRuler from './VerticalRuler.svelte';
  import { 
    createHorizontalGuide, 
    createVerticalGuide, 
    makeGuideDraggable,
    deleteGuide,
    loadGuides
  } from './Canvas.guides.js';
  import { loadDocument, saveDocument } from '$lib/utils/storage.js';
  
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

  // Import grid-utils only on client-side
  let convertToPixels;
  let snapToGridPoint;
  
  if (typeof window !== 'undefined') {
    import('$lib/utils/grid-utils.js').then(module => {
      convertToPixels = module.convertToPixels;
      snapToGridPoint = module.snapToGrid;
    });
  }
  
  const dispatch = createEventDispatcher();
  
  // Props using the standard Svelte 4 syntax
  export let width = 1240; // Default A4 @ 150 DPI: 210mm × 1.5 × 3.93701
  export let height = 1754; // Default A4 @ 150 DPI: 297mm × 1.5 × 3.93701
  
  // Canvas element references
  let canvasElement;
  let canvas;
  let canvasContainer;
  let imageInput;
  let pages = [];
  
  // Debug flag
  window.DEBUG_GRID_ALIGNMENT = false;
  
  // Module functions that will be initialized
  let eventHandlers;
  let layerManagement;
  let objectManipulation;
  let documentManagement;
  let guideManagement;
  let gridManagement;
  
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
  
  // Keep track of the previous page to avoid redundant operations
  let previousPage = null;
  
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
    if (!canvas) return;
    
    // Reset canvas drawing mode
    canvas.isDrawingMode = false;
    
    // Enable/disable selection based on tool
    canvas.selection = toolType === ToolType.SELECT;
    
    // Make objects selectable only with the select tool, but keep them visible and responsive
    const canvasObjects = canvas.getObjects();
    canvasObjects.forEach(obj => {
      // Master page objects have special handling
      if (obj.fromMaster) {
        obj.selectable = false; // Master objects are never directly selectable
        obj.evented = true; // But they can receive events for context menu
      } else {
        obj.selectable = toolType === ToolType.SELECT;
        obj.evented = true; // Keep evented true to ensure objects remain visible and can receive events
        // Only enable selection for the SELECT tool
        if (toolType !== ToolType.SELECT) {
          obj.hoverCursor = 'default'; // Change cursor for non-selectable objects
        } else {
          obj.hoverCursor = 'move'; // Default cursor for selectable objects
        }
      }
    });
    
    // Reset the cursor
    canvas.defaultCursor = 'default';
    
    // Tool-specific setup
    switch (toolType) {
      case ToolType.TEXT:
        canvas.defaultCursor = 'text';
        break;
      case ToolType.IMAGE:
        canvas.defaultCursor = 'crosshair';
        break;
      case ToolType.RECTANGLE:
      case ToolType.ELLIPSE:
      case ToolType.LINE:
        canvas.defaultCursor = 'crosshair';
        break;
    }
    
    // Ensure full re-render of the canvas with all objects
    canvas.requestRenderAll();
    canvas.renderAll();
  }

  // Update text flow when text content changes
  function updateTextFlow(textObject) {
    if (!textObject || !textFlow) return;
    
    // If the textbox has linked objects, update the text flow
    if (textObject.linkedObjectIds && textObject.linkedObjectIds.length > 0) {
      textFlow.updateTextFlow(textObject.id);
      canvas.renderAll();
    }
  }
  
  /**
   * Handle context menu override action
   */
  function handleContextMenuOverride(event) {
    const { object } = event.detail;
    if (object && object.fromMaster && object.overridable) {
      documentManagement.overrideMasterObject(object);
    }
  }
  
  /**
   * Handle context menu edit master action
   */
  function handleContextMenuEditMaster(event) {
    const { masterId } = event.detail;
    if (masterId) {
      dispatch('editMasterPage', { masterPageId: masterId });
    }
  }
  
  // Initialize a shared context for all canvas modules
  function initializeCanvasContext() {
    // Create a shared context that all modules can access
    const context = createCanvasContext({
      // Canvas references
      canvas,
      canvasElement,
      canvasContainer,
      imageInput,
      
      // Svelte stores
      currentDocument: $currentDocument,
      currentPage: $currentPage,
      activeTool: $activeTool,
      currentToolOptions: $currentToolOptions,
      clipboard,
      
      // State variables
      width,
      height,
      selectedObject,
      isMounted,
      showContextMenu,
      contextMenuX,
      contextMenuY,
      contextMenuObject,
      canvasScrollX,
      canvasScrollY,
      zoomLevel,
      textFlow,
      
      // Utility functions
      dispatch,
      generateId,
      convertToPixels,
      snapToGridPoint,
      updateTextFlow,
      setupCanvasForTool,
      loadDocument,
      
      // Guide functions
      refreshGuides: loadGuides.bind(null, canvas, $currentDocument, $currentPage)
    });
    
    // Initialize module handlers
    eventHandlers = createEventHandlers(context);
    layerManagement = createLayerManagement(context);
    objectManipulation = createObjectManipulation(context);
    documentManagement = createDocumentManagement(context);
    guideManagement = createGuideManagement(context);
    gridManagement = createGridManagement(context);
    
    // Update context with module functions
    context.update({
      // Grid management functions
      renderGrid: gridManagement.renderGrid,
      toggleGrid: gridManagement.toggleGrid,
      updateGridProperties: gridManagement.updateGridProperties,
      
      // Event handlers
      handleMouseDown: eventHandlers.handleMouseDown,
      handleMouseMove: eventHandlers.handleMouseMove,
      handleMouseUp: eventHandlers.handleMouseUp,
      handleDoubleClick: eventHandlers.handleDoubleClick,
      handleObjectSelected: eventHandlers.handleObjectSelected,
      handleSelectionCleared: eventHandlers.handleSelectionCleared,
      handleRightClick: eventHandlers.handleRightClick,
      handleScroll: eventHandlers.handleScroll,
      handleImageUpload: eventHandlers.handleImageUpload,
      
      // Layer management
      bringForward: layerManagement.bringForward,
      sendBackward: layerManagement.sendBackward,
      bringToFront: layerManagement.bringToFront,
      sendToBack: layerManagement.sendToBack,
      
      // Object manipulation
      deleteSelectedObjects: objectManipulation.deleteSelectedObjects,
      copySelectedObjects: objectManipulation.copySelectedObjects,
      cutSelectedObjects: objectManipulation.cutSelectedObjects,
      pasteObjects: objectManipulation.pasteObjects,
      rotateObject: objectManipulation.rotateObject,
      scaleObject: objectManipulation.scaleObject,
      flipObject: objectManipulation.flipObject,
      
      // Document management
      saveCurrentPage: documentManagement.saveCurrentPage,
      saveSpecificPage: documentManagement.saveSpecificPage,
      loadPage: documentManagement.loadPage,
      loadDocumentFromIndexedDB: documentManagement.loadDocumentFromIndexedDB,
      createObjectsManually: documentManagement.createObjectsManually,
      applyMasterPage: documentManagement.applyMasterPage,
      overrideMasterObject: documentManagement.overrideMasterObject,
      
      // Guide management
      handleCreateGuide: guideManagement.handleCreateGuide,
      handleUpdateGuide: guideManagement.handleUpdateGuide,
      handleDeleteGuide: guideManagement.handleDeleteGuide,
      saveGuidesToDocument: guideManagement.saveGuidesToDocument,
      loadGuidesFromDocument: guideManagement.loadGuidesFromDocument,
      clearGuides: guideManagement.clearGuides,
      
      // Grid management
      renderGrid: gridManagement.renderGrid,
      toggleGrid: gridManagement.toggleGrid,
      updateGridProperties: gridManagement.updateGridProperties
    });
    
    return context;
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
    if (!canvas) return 0;
    
    try {
      console.log("RECOVERY: Attempting to recover objects from JSON");
      
      // Parse the JSON data
      const jsonData = typeof pageJson === 'string' ? JSON.parse(pageJson) : pageJson;
      const objectCount = jsonData.objects ? jsonData.objects.length : 0;
      
      if (objectCount === 0) {
        console.log("RECOVERY: No objects in JSON to recover");
        return 0;
      }
      
      console.log(`RECOVERY: Attempting to recreate ${objectCount} objects from JSON`);
      
      // Clear the canvas first
      canvas.clear();
      canvas.backgroundColor = jsonData.background || 'white';
      canvas.renderAll();
      
      // Use our document management function to create objects
      const createdObjects = documentManagement.createObjectsManually(jsonData.objects);
      
      // Add all created objects to the canvas
      createdObjects.forEach(obj => {
        canvas.add(obj);
      });
      
      // Multiple force renders
      canvas.requestRenderAll();
      canvas.renderAll();
      
      // Delayed render for better reliability
      setTimeout(() => {
        canvas.requestRenderAll();
        canvas.renderAll();
      }, 100);
      
      console.log(`RECOVERY: Successfully recreated ${createdObjects.length}/${objectCount} objects`);
      return createdObjects.length;
    } catch (err) {
      console.error("RECOVERY: Failed to recover objects:", err);
      return 0;
    }
  };

  // Subscribe to current page changes
  $: if ($currentPage && canvas && $currentDocument && $currentPage !== previousPage) {
    console.log(`+==========================================+`);
    console.log(`| PAGE SWITCH: ${previousPage || 'null'} -> ${$currentPage} |`);
    console.log(`+==========================================+`);
    
    // Store current page ID in the canvas object for direct reference
    canvas.pageId = $currentPage;
    
    // Store global references for recovery
    window.$page = $currentPage;
    window.$document = $currentDocument;
    window.$updateDocument = currentDocument.update;
    window.$globalContext = context;
    window.saveDocument = saveDocument;
    
    console.log(`Canvas state before page switch:`, {
      hasCanvas: !!canvas,
      objectCount: canvas ? canvas.getObjects().length : 0,
      previousPageId: previousPage,
      newPageId: $currentPage,
      documentId: $currentDocument ? $currentDocument.id : 'null', 
      pageCount: $currentDocument ? $currentDocument.pages.length : 0
    });
    
    // Only save the previous page if we had one
    if (previousPage) {
      console.log(`SAVE PHASE: Saving previous page ${previousPage} before switching`);
      
      // Save the current page to the correct previous page ID
      const pageToSaveIndex = $currentDocument.pages.findIndex(p => p.id === previousPage);
      
      console.log(`Page index in document: ${pageToSaveIndex}`);
      
      if (pageToSaveIndex >= 0) {
        // Force save of current page with additional verification
        const currentObjects = canvas.getObjects();
        console.log(`SAVE PHASE: Currently ${currentObjects.length} objects on canvas before saving page ${previousPage}`);
        
        if (currentObjects.length > 0) {
          // Log each object on the canvas for detailed debugging
          console.log(`SAVE PHASE: Object details:`);
          currentObjects.forEach((obj, idx) => {
            console.log(`  Object #${idx}:`, {
              type: obj.type,
              id: obj.id || 'no-id',
              visible: obj.visible,
              left: Math.round(obj.left),
              top: Math.round(obj.top),
              width: Math.round(obj.width || 0),
              height: Math.round(obj.height || 0),
              text: obj.type === 'textbox' ? obj.text.substring(0, 20) + (obj.text.length > 20 ? '...' : '') : null
            });
          });
        }
        
        try {
          // Use a dedicated function to save a specific page
          console.log(`SAVE PHASE: Calling saveSpecificPage for ${previousPage}`);
          saveSpecificPage(previousPage, canvas.getObjects());
          
          console.log(`SAVE PHASE: Successfully saved page ${previousPage} with ${currentObjects.length} objects`);
        } catch (err) {
          console.error(`SAVE PHASE: Error saving page ${previousPage}:`, err);
        }
      } else {
        console.error(`SAVE PHASE ERROR: Could not find page ${previousPage} in document to save`);
      }
      
      // Add a forced save to document store to ensure persistence
      console.log("SAVE PHASE: Forcing document save to ensure data persistence");
      currentDocument.update(doc => {
        return { ...doc, lastModified: new Date() };
      });
    }
    
      console.log("TRANSITION PHASE: Starting page switching sequence");
    
    // Update tracking variables
    console.log("TRANSITION PHASE: Updating tracking variables");
    const oldPage = previousPage;
    previousPage = $currentPage;
    
    // Clear the canvas to prepare for new page
    console.log("TRANSITION PHASE: Clearing canvas");
    canvas.clear();
    canvas.backgroundColor = 'white';
    canvas.renderAll();
    
    // Verify canvas is truly cleared
    const objectsAfterClear = canvas.getObjects();
    console.log(`TRANSITION PHASE: Canvas after clear has ${objectsAfterClear.length} objects`);
    
    // Load the new page directly using our radical approach
    console.log(`+-------------------------------------+`);
    console.log(`| LOAD PHASE: Loading page ${$currentPage} |`);
    console.log(`+-------------------------------------+`);
    console.log(`LOAD PHASE: Calling loadPage() with shouldSaveFirst=false`);
    
    // Track loading time for debugging
    const loadStartTime = performance.now();
    
    documentManagement.loadPage($currentPage, false).then(() => {
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
    setTimeout(() => {
      console.log("FINAL PHASE: Final visibility check");
      
      if (canvas) {
        // Force rerender all objects
        const objects = canvas.getObjects();
        console.log(`FINAL PHASE: Found ${objects.length} objects for final check`);
        
        if (objects.length > 0) {
          console.log(`FINAL PHASE: Object details for verification:`);
          objects.forEach((obj, idx) => {
            console.log(`  Object #${idx}:`, {
              type: obj.type,
              id: obj.id || 'no-id',
              visible: obj.visible,
              opacity: obj.opacity,
              left: Math.round(obj.left),
              top: Math.round(obj.top),
              width: Math.round(obj.width || 0),
              height: Math.round(obj.height || 0),
              text: obj.type === 'textbox' ? obj.text.substring(0, 20) + (obj.text.length > 20 ? '...' : '') : null
            });
            
            // Explicitly make all objects visible
            obj.visible = true;
            obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
            obj.evented = true;
            obj.selectable = $activeTool === ToolType.SELECT;
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
    }, 500);
  }

  // Guide-related event handlers have been moved to Canvas.guides.js
  // These wrapper functions use the module functions from the shared context
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
    
    // Set up global recovery references early
    window.saveDocument = saveDocument;
    
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
      
      // Last resort fallback - try direct initialization with different approach
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
    
    // Load document from store if it exists
    if ($currentDocument) {
      pages = $currentDocument.pages || [{ 
        id: 'page-1', 
        canvasJSON: null,
        masterPageId: null,
        overrides: {},
        guides: {
          horizontal: [],
          vertical: []
        }
      }];
      
      // Set first page as active
      if (!$currentPage && pages.length > 0) {
        currentPage.set(pages[0].id);
      }
    }
    
    // Initialize TextFlow manager
    textFlow = new TextFlow(canvas);
    
    // Initialize HistoryManager
    historyManager = new HistoryManager(canvas, {
      onChange: (state) => {
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
    });
    
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
      
      // Clean up history manager
      if (historyManager) {
        historyManager.dispose();
      }
      
      canvas.dispose();
    };
  });
</script>

<div class="canvas-wrapper relative overflow-hidden">
  <!-- Ruler corner square where rulers meet -->
  {#if showRulers}
    <div class="ruler-corner" style="width: {rulerOffset}px; height: {rulerOffset}px; z-index: 2;"></div>
  {/if}
  
  <!-- Horizontal ruler -->
  {#if showHorizontalRuler}
    <div class="horizontal-ruler-container" style="left: {showVerticalRuler ? rulerOffset : 0}px; right: 0; top: 0; height: {rulerOffset}px; z-index: 1;">
      <HorizontalRuler 
        width={width} 
        offsetX={canvasScrollX} 
        scale={zoomLevel}
        on:createGuide={handleCreateGuide}
        on:updateGuide={handleUpdateGuide}
        on:deleteGuide={handleDeleteGuide}
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
        on:createGuide={handleCreateGuide}
        on:updateGuide={handleUpdateGuide}
        on:deleteGuide={handleDeleteGuide}
      />
    </div>
  {/if}
  
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