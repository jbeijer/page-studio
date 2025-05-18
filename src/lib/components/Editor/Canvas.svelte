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
  import { pageRecovery } from '$lib/utils/page-recovery.js';
  
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
      isReadyForAutoOps,
      
      // Utility functions
      dispatch,
      generateId,
      convertToPixels,
      snapToGridPoint,
      updateTextFlow,
      setupCanvasForTool,
      loadDocument,
      
      // Guide functions
      refreshGuides: loadGuides.bind(null, canvas, $currentDocument, $currentPage),
      
      // Add version information
      version: {
        appVersion: "1.0.0", // Update with your actual version
        fabricVersion: fabric.version || '5.3.0',
        lastUpdated: new Date().toISOString()
      }
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
      getPageById: documentManagement.getPageById,
      
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
    
    // Store context in global scope for emergency recovery
    window.$globalContext = context;
    
    // Add helper functions to window for debugging
    if (typeof window !== 'undefined') {
      window.$debugCanvas = {
        getContext: () => window.$globalContext,
        getCanvas: () => canvas,
        getCurrentDocument: () => $currentDocument,
        getCurrentPage: () => $currentPage,
        getStatus: () => ({
          hasCanvas: !!canvas,
          hasDocument: !!$currentDocument,
          hasPage: !!$currentPage,
          isReady: isReadyForAutoOps,
          objectCount: canvas ? canvas.getObjects().length : 0,
          currentPageId: $currentPage
        }),
        forceSave: () => {
          if (documentManagement && documentManagement.saveCurrentPage) {
            return documentManagement.saveCurrentPage();
          }
          return false;
        }
      };
    }
    
    return context;
  }
  
  // Export functions to make them available to parent components
  export const getCanvas = () => canvas;
  export const getSelectedObject = () => selectedObject;
  export const getTextFlow = () => textFlow;
  export const getContext = () => window.$globalContext || null;
  
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
  export const saveCurrentPage = () => {
    if (!isReadyForAutoOps) {
      console.warn("saveCurrentPage: Not ready (canvas, document eller page saknas)");
      return false;
    }
    return documentManagement?.saveCurrentPage();
  };

  export const isCanvasReadyForAutoOps = () => isReadyForAutoOps;

  // For external operations that need access to readiness state
  export const getReadyStatus = () => ({
    hasCanvas: !!canvas,
    hasDocument: !!$currentDocument,
    hasPage: !!$currentPage,
    isReady: isReadyForAutoOps,
    objectCount: canvas ? canvas.getObjects().length : 0
  });

  // Om forceSave/autosave-funktioner finns i denna fil, lägg liknande skydd där. Om de är externa, lägg skydd i anropen härifrån.
  export const saveSpecificPage = (pageId, objects) => documentManagement?.saveSpecificPage(pageId, objects);
  
  // Export recovery functions
  // export { recoverCurrentPage }; - Now defined later in the file
  export const getPageSnapshots = (pageId = $currentPage) => pageRecovery.getPageSnapshots(pageId);
  export const forceSnapshot = () => {
    if (!isReadyForAutoOps || !$currentPage) return false;
    
    // Create a snapshot function that captures the canvas state
    const createSnapshot = () => {
      if (!canvas) return null;
      
      try {
        // Create a JSON snapshot of the canvas
        const canvasData = canvas.toJSON([
          'id', 
          'linkedObjectIds', 
          'fromMaster', 
          'masterId', 
          'masterObjectId', 
          'overridable'
        ]);
        
        return {
          canvasJSON: JSON.stringify(canvasData),
          pageId: $currentPage,
          objectCount: canvasData.objects ? canvasData.objects.length : 0,
          timestamp: Date.now()
        };
      } catch (err) {
        console.error("Error creating page snapshot:", err);
        return null;
      }
    };
    
    return pageRecovery.takeSnapshot(createSnapshot, $currentPage);
  };
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
    
    // Track this operation with its own timestamp for debugging
    const switchOperationId = Date.now();
    console.log(`Page switch operation ID: ${switchOperationId}`);
    
    // Store current page ID in the canvas object for direct reference
    canvas.pageId = $currentPage;
    
    // Store global references for recovery
    window.$page = $currentPage;
    window.$document = $currentDocument;
    window.$updateDocument = currentDocument.update;
    
    // Only set these if they're defined (fix context reference error)
    if (typeof context !== 'undefined') {
      window.$globalContext = context;
    }
    window.saveDocument = saveDocument;
    
    // Update global debug helpers
    window.$debugCanvas = {
      ...(window.$debugCanvas || {}),
      getCurrentPage: () => $currentPage,
      getCurrentDocument: () => $currentDocument,
      getObjectCount: () => canvas ? canvas.getObjects().length : 0,
      getSaveStatus: () => ({
        previousPage,
        currentPage: $currentPage,
        hasCanvas: !!canvas,
        pageIndex: $currentDocument ? $currentDocument.pages.findIndex(p => p.id === $currentPage) : -1,
        pageCount: $currentDocument ? $currentDocument.pages.length : 0,
        operation: switchOperationId
      })
    };
    
    console.log(`Canvas state before page switch:`, {
      hasCanvas: !!canvas,
      objectCount: canvas ? canvas.getObjects().length : 0,
      previousPageId: previousPage,
      newPageId: $currentPage,
      documentId: $currentDocument ? $currentDocument.id : 'null', 
      pageCount: $currentDocument ? $currentDocument.pages.length : 0,
      operationId: switchOperationId
    });
    
    // Always ensure we're working with latest document data
    // Use a safety variable to avoid infinite recursion
    let isPageSwitching = true;
    
    // Only save the previous page if we had one
    if (previousPage && isPageSwitching) {
      console.log(`SAVE PHASE [${switchOperationId}]: Saving previous page ${previousPage} before switching`);
      
      // Double-check that document is actually defined and has pages
      if (!$currentDocument || !Array.isArray($currentDocument.pages)) {
        console.error("SAVE PHASE: Document or pages is undefined/null!");
        
        // Try to recover from window.$document if available
        if (window.$document && Array.isArray(window.$document.pages)) {
          console.log("SAVE PHASE: Recovering document from window.$document");
          currentDocument.set(window.$document);
        }
      }
      
      // Verify the document has the previous page
      const pageToSaveIndex = $currentDocument.pages.findIndex(p => p.id === previousPage);
      
      console.log(`SAVE PHASE [${switchOperationId}]: Page index in document: ${pageToSaveIndex}`);
      
      if (pageToSaveIndex >= 0) {
        // Force save of current page with additional verification
        const currentObjects = canvas.getObjects();
        console.log(`SAVE PHASE [${switchOperationId}]: Currently ${currentObjects.length} objects on canvas before saving page ${previousPage}`);
        
        if (currentObjects.length > 0) {
          // Log each object on the canvas for detailed debugging
          console.log(`SAVE PHASE [${switchOperationId}]: Object details:`);
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
          console.log(`SAVE PHASE [${switchOperationId}]: Calling saveSpecificPage for ${previousPage}`);
          
          // Make a safe copy of objects in case they get modified
          const objectsToSave = currentObjects.map(obj => obj);
          saveSpecificPage(previousPage, objectsToSave);
          
          console.log(`SAVE PHASE [${switchOperationId}]: Successfully saved page ${previousPage} with ${objectsToSave.length} objects`);
          
          // Create a backup snapshot for recovery if needed
          window.$previousPageBackup = {
            pageId: previousPage,
            timestamp: Date.now(),
            objectCount: objectsToSave.length,
            canvasJSON: JSON.stringify(canvas.toJSON([
              'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
            ]))
          };
        } catch (err) {
          console.error(`SAVE PHASE [${switchOperationId}]: Error saving page ${previousPage}:`, err);
          
          // Create emergency backup if save fails
          try {
            window.$emergencyBackup = {
              pageId: previousPage,
              timestamp: Date.now(),
              errorMessage: err.message,
              canvasJSON: JSON.stringify(canvas.toJSON([
                'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
              ]))
            };
            
            console.log(`SAVE PHASE [${switchOperationId}]: Created emergency backup for page ${previousPage}`);
          } catch (backupErr) {
            console.error(`SAVE PHASE [${switchOperationId}]: Even emergency backup failed:`, backupErr);
          }
        }
      } else {
        console.error(`SAVE PHASE [${switchOperationId}] ERROR: Could not find page ${previousPage} in document to save`);
        
        // Try to create the page if it's missing
        console.log(`SAVE PHASE [${switchOperationId}]: Attempting to create missing page ${previousPage}`);
        
        try {
          // Get current objects
          const objects = canvas.getObjects();
          
          // Create the page data
          const canvasData = {
            objects: objects.length > 0 ? objects.map(obj => obj.toJSON([
              'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
            ])) : [],
            background: canvas.backgroundColor || 'white',
            version: "4.6.0"
          };
          
          // Create a new page in the document
          const newPage = {
            id: previousPage,
            canvasJSON: JSON.stringify(canvasData),
            masterPageId: null,
            overrides: {},
            guides: {
              horizontal: [],
              vertical: []
            }
          };
          
          // Update the document
          currentDocument.update(doc => {
            // Check if page already exists (double-check)
            if (doc.pages.some(p => p.id === previousPage)) {
              console.log(`SAVE PHASE [${switchOperationId}]: Page ${previousPage} now exists, updating it`);
              return {
                ...doc,
                pages: doc.pages.map(p => p.id === previousPage ? {
                  ...p,
                  canvasJSON: newPage.canvasJSON
                } : p),
                lastModified: new Date()
              };
            } else {
              console.log(`SAVE PHASE [${switchOperationId}]: Adding missing page ${previousPage} to document`);
              return {
                ...doc,
                pages: [...doc.pages, newPage],
                lastModified: new Date()
              };
            }
          });
          
          console.log(`SAVE PHASE [${switchOperationId}]: Successfully added/updated missing page ${previousPage}`);
        } catch (createErr) {
          console.error(`SAVE PHASE [${switchOperationId}] ERROR: Failed to create missing page:`, createErr);
        }
      }
      
      // Add a forced save to document store to ensure persistence
      console.log(`SAVE PHASE [${switchOperationId}]: Forcing document save to ensure data persistence`);
      currentDocument.update(doc => {
        return { ...doc, lastModified: new Date() };
      });
    }
    
    console.log(`TRANSITION PHASE [${switchOperationId}]: Starting page switching sequence`);
    
    // Update tracking variables
    console.log(`TRANSITION PHASE [${switchOperationId}]: Updating tracking variables`);
    const oldPage = previousPage;
    previousPage = $currentPage;
    
    // Clear the canvas to prepare for new page
    console.log(`TRANSITION PHASE [${switchOperationId}]: Clearing canvas`);
    canvas.clear();
    canvas.backgroundColor = 'white';
    canvas.renderAll();
    
    // Verify canvas is truly cleared
    const objectsAfterClear = canvas.getObjects();
    console.log(`TRANSITION PHASE [${switchOperationId}]: Canvas after clear has ${objectsAfterClear.length} objects`);
    
    // Make sure canvas has correct size
    console.log(`TRANSITION PHASE [${switchOperationId}]: Ensuring canvas has correct dimensions`);
    if (canvas.width !== width || canvas.height !== height) {
      console.log(`TRANSITION PHASE [${switchOperationId}]: Resizing canvas from ${canvas.width}x${canvas.height} to ${width}x${height}`);
      canvas.setWidth(width);
      canvas.setHeight(height);
    }
    
    // Load the new page directly using our proven approach
    console.log(`+--------------------------------------------+`);
    console.log(`| LOAD PHASE [${switchOperationId}]: Loading page ${$currentPage} |`);
    console.log(`+--------------------------------------------+`);
    console.log(`LOAD PHASE [${switchOperationId}]: Calling loadPage() with shouldSaveFirst=false`);
    
    // Track loading time for debugging
    const loadStartTime = performance.now();
    
    // Create a safety mechanism in case the load fails
    let loadTimeoutId = setTimeout(() => {
      console.error(`LOAD PHASE [${switchOperationId}] ERROR: Page load timed out after 5000ms`);
      
      // Emergency recovery - try to manually load the page
      try {
        console.log(`LOAD PHASE [${switchOperationId}]: Emergency recovery attempt`);
        
        // Find the page in the document
        if ($currentDocument && $currentDocument.pages) {
          const pageToLoad = $currentDocument.pages.find(p => p.id === $currentPage);
          
          if (pageToLoad && pageToLoad.canvasJSON) {
            console.log(`LOAD PHASE [${switchOperationId}]: Found page ${$currentPage} in document, attempting manual load`);
            
            // Parse JSON data
            const jsonData = JSON.parse(pageToLoad.canvasJSON);
            
            // Clear canvas and set background
            canvas.clear();
            canvas.backgroundColor = jsonData.background || 'white';
            
            // If page has objects, attempt to recover them
            if (jsonData.objects && jsonData.objects.length > 0) {
              // Use recovery method
              const recovered = recoverObjectsFromJson(pageToLoad.canvasJSON);
              console.log(`LOAD PHASE [${switchOperationId}]: Emergency recovery created ${recovered} objects`);
            }
            
            // Force render
            canvas.requestRenderAll();
            canvas.renderAll();
            
            // Schedule another render for reliability
            setTimeout(() => {
              canvas.requestRenderAll();
              canvas.renderAll();
            }, 100);
          } else {
            console.error(`LOAD PHASE [${switchOperationId}] ERROR: Could not find page ${$currentPage} in document for emergency recovery`);
          }
        }
      } catch (recoveryErr) {
        console.error(`LOAD PHASE [${switchOperationId}] ERROR: Emergency recovery failed:`, recoveryErr);
      }
    }, 5000);
    
    documentManagement.loadPage($currentPage, false).then(() => {
      const loadDuration = performance.now() - loadStartTime;
      console.log(`LOAD PHASE [${switchOperationId}]: loadPage() completed in ${loadDuration.toFixed(2)}ms`);
      
      // Clear the safety timeout
      clearTimeout(loadTimeoutId);
    }).catch(err => {
      console.error(`LOAD PHASE [${switchOperationId}] ERROR: Failed to load page:`, err);
      
      // Clear the safety timeout since we already hit an error
      clearTimeout(loadTimeoutId);
      
      // Fallback to a clean canvas if loading fails
      if (canvas) {
        canvas.clear();
        canvas.backgroundColor = 'white';
        canvas.renderAll();
      }
    });
    
    // Force render cycles with a single delay
    setTimeout(() => {
      console.log(`FINAL PHASE [${switchOperationId}]: Final visibility check`);
      
      if (canvas) {
        // Force rerender all objects
        const objects = canvas.getObjects();
        console.log(`FINAL PHASE [${switchOperationId}]: Found ${objects.length} objects for final check`);
        
        if (objects.length > 0) {
          console.log(`FINAL PHASE [${switchOperationId}]: Object details for verification:`);
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
        console.log(`FINAL PHASE [${switchOperationId}]: Forcing final render`);
        canvas.requestRenderAll();
        canvas.renderAll();
        
        // Update global references one more time
        window.$page = $currentPage;
        window.$document = $currentDocument;
        window.$canvas = canvas;
        
        // Schedule a final check to make sure everything is correct
        setTimeout(() => {
          // Verify canvas objects one more time
          const finalObjects = canvas.getObjects();
          console.log(`FINAL VERIFICATION [${switchOperationId}]: Canvas has ${finalObjects.length} objects`);
          
          // Make sure the objects are still visible
          finalObjects.forEach(obj => {
            if (!obj.visible) {
              console.warn(`FINAL VERIFICATION [${switchOperationId}]: Object ${obj.id} visibility lost, restoring`);
              obj.visible = true;
            }
          });
          
          // Final render
          canvas.requestRenderAll();
          canvas.renderAll();
          
          // Log final state
          console.log(`+---------------------------------------------------------------+`);
          console.log(`| PAGE SWITCH [${switchOperationId}] COMPLETE: ${finalObjects.length} objects on canvas |`);
          console.log(`+---------------------------------------------------------------+`);
        }, 1000);
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
    if (!isReadyForAutoOps) {
      console.warn("refreshGuides: Not ready (canvas, document eller page saknas)");
      return;
    }
    guideManagement.loadGuidesFromDocument();
  }

  import { canvasReady, canvasReadyStatus, updateCanvasReadyStatus, resetCanvasReady } from '$lib/stores/canvasReady.js';
let isReadyForAutoOps = false;
let hasActiveObjects = false;

// Define basic readiness (having canvas, document and page)
$: isReadyForAutoOps = !!(canvas && $currentDocument && $currentPage);

// Track canvas object count for additional readiness information
$: hasActiveObjects = canvas ? canvas.getObjects().length > 0 : false;

// Set up page recovery initialization to happen safely in component context
onMount(() => {
  // Set up a function that will check and initialize recovery when ready
  const initRecoveryWhenReady = () => {
    if (isReadyForAutoOps) {
      console.log("Canvas onMount: Initializing page recovery (inside component context)");
      initializePageRecovery();
    } else {
      // Try again in a bit
      setTimeout(initRecoveryWhenReady, 1000);
    }
  };
  
  // Start the initialization process
  setTimeout(initRecoveryWhenReady, 1000);
});

// Update the canvasReady store and detailed status
$: {
  canvasReady.set(isReadyForAutoOps);
  
  // Update the detailed status
  updateCanvasReadyStatus({
    hasCanvas: !!canvas,
    hasDocument: !!$currentDocument,
    hasPage: !!$currentPage,
    isFullyInitialized: isMounted && !!canvas,
    hasActiveObjects,
    hasError: false,
    errorMessage: null
  });
}

// Log canvas readiness changes for debugging
$: console.log(`Canvas readiness changed: ${isReadyForAutoOps ? 'READY' : 'NOT READY'}, objects: ${hasActiveObjects ? 'YES' : 'NO'}`);

// Set error state when appropriate
function setCanvasError(message) {
  updateCanvasReadyStatus({
    hasError: true,
    errorMessage: message
  });
  console.error(`Canvas error: ${message}`);
}

/**
 * Initialize page recovery system
 */
function initializePageRecovery() {
  // If we're not ready for auto operations, we'll skip initialization
  // The onMount handler will take care of initializing when ready
  if (!isReadyForAutoOps) {
    console.log("Skipping page recovery initialization - component will retry later");
    return;
  }
  
  console.log("Initializing page recovery system");
  
  // Create a snapshot function that captures the canvas state
  const createSnapshot = () => {
    if (!canvas || !$currentPage) return null;
    
    try {
      // Create a JSON snapshot of the canvas
      const canvasData = canvas.toJSON([
        'id', 
        'linkedObjectIds', 
        'fromMaster', 
        'masterId', 
        'masterObjectId', 
        'overridable'
      ]);
      
      return {
        canvasJSON: JSON.stringify(canvasData),
        pageId: $currentPage,
        objectCount: canvasData.objects ? canvasData.objects.length : 0,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error("Error creating page snapshot:", err);
      return null;
    }
  };
  
  // Create a recovery function that applies a snapshot to the canvas
  const applySnapshot = (snapshot) => {
    if (!canvas || !snapshot || !snapshot.canvasJSON) return false;
    
    try {
      console.log(`Applying recovery snapshot with ${snapshot.objectCount} objects`);
      
      // Apply the snapshot to the canvas using our recovery function
      const recoveredCount = recoverObjectsFromJson(snapshot.canvasJSON);
      
      if (recoveredCount > 0) {
        console.log(`Successfully recovered ${recoveredCount} objects from snapshot`);
        
        // Save the recovered page immediately
        setTimeout(() => {
          if (documentManagement && documentManagement.saveCurrentPage) {
            documentManagement.saveCurrentPage();
            console.log("Saved recovered page");
          }
        }, 500);
        
        return true;
      } else {
        console.warn("Recovery failed: No objects recovered from snapshot");
        return false;
      }
    } catch (err) {
      console.error("Error applying recovery snapshot:", err);
      return false;
    }
  };
  
  // Start taking periodic snapshots if the recovery system is enabled
  if ($currentPage) {
    pageRecovery.startSnapshots(createSnapshot, $currentPage);
  }
  
  // Set up a safe default no-op function
  let pageUnsubscribe = () => {};
  
  // Subscribe to page changes to update recovery system - safely wrapped in try/catch
  try {
    pageUnsubscribe = currentPage.subscribe(pageId => {
      if (pageId && canvas) {
        console.log(`Updating recovery system for page ${pageId}`);
        pageRecovery.stopSnapshots(); // Stop any existing snapshots first
        pageRecovery.startSnapshots(createSnapshot, pageId);
        
        // Take an immediate snapshot after a page switch
        setTimeout(() => {
          if (isReadyForAutoOps && canvas && canvas.getObjects && canvas.getObjects().length > 0) {
            pageRecovery.takeSnapshot(createSnapshot, pageId);
          }
        }, 2000);
      }
    });
  } catch (err) {
    console.warn("Could not subscribe to page changes for recovery (possibly outside component context)", err);
  }
  
  // Take an initial snapshot
  setTimeout(() => {
    if (isReadyForAutoOps && $currentPage && canvas.getObjects().length > 0) {
      console.log("Taking initial recovery snapshot");
      pageRecovery.takeSnapshot(createSnapshot, $currentPage);
    }
  }, 5000);
  
  // Export recovery functions to the window for debugging and manual recovery
  window.$pageRecovery = {
    takeSnapshot: () => pageRecovery.takeSnapshot(createSnapshot, $currentPage),
    getSnapshots: () => pageRecovery.getPageSnapshots($currentPage),
    recover: () => pageRecovery.recoverPage($currentPage, applySnapshot),
    clear: () => pageRecovery.clearSnapshots($currentPage)
  };
  
  // Clean up on unmount - safely handled through a try/catch
  try {
    onDestroy(() => {
      pageRecovery.stopSnapshots();
      pageUnsubscribe();
    });
  } catch (err) {
    console.warn("Could not register unmount cleanup for page recovery (likely called outside component context)");
  }
}

/**
 * Try to recover the current page from a snapshot
 * @returns {boolean} Whether recovery was successful
 */
export function recoverCurrentPage() {
  if (!$currentPage || !isReadyForAutoOps) return false;
  
  console.log(`Attempting to recover page ${$currentPage} from snapshot`);
  
  // Create the recovery function
  const applySnapshot = (snapshot) => {
    if (!canvas || !snapshot || !snapshot.canvasJSON) return false;
    
    try {
      // Apply the snapshot to the canvas
      const recoveredCount = recoverObjectsFromJson(snapshot.canvasJSON);
      
      if (recoveredCount > 0) {
        console.log(`Successfully recovered ${recoveredCount} objects from snapshot`);
        
        // Save the recovered page 
        setTimeout(() => {
          if (documentManagement && documentManagement.saveCurrentPage) {
            documentManagement.saveCurrentPage();
          }
        }, 500);
        
        return true;
      } else {
        console.warn("Recovery failed: No objects recovered from snapshot");
        return false;
      }
    } catch (err) {
      console.error("Error applying recovery snapshot:", err);
      return false;
    }
  };
  
  // Attempt recovery
  return pageRecovery.recoverPage($currentPage, applySnapshot);
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
      // Update canvas status to initializing
      updateCanvasReadyStatus({
        hasCanvas: false,
        isFullyInitialized: false,
        hasError: false,
        errorMessage: "Canvas initializing..."
      });
      
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
      
      // Update canvas status to success
      updateCanvasReadyStatus({
        hasCanvas: true,
        isFullyInitialized: true,
        hasError: false,
        errorMessage: null
      });
      
      console.log("Canvas initialized successfully");
    } catch (error) {
      console.error("Canvas initialization failed:", error);
      setCanvasError(`Canvas initialization failed: ${error.message}`);
      
      // Last resort fallback - try direct initialization with different approach
      try {
        console.log("Attempting fallback canvas initialization...");
        
        canvas = new fabric.Canvas(canvasElement);
        canvas.setWidth(width);
        canvas.setHeight(height);
        canvas.selection = true;
        canvas.preserveObjectStacking = true;
        canvas.backgroundColor = 'white';
        
        // If we get here, we were successful
        updateCanvasReadyStatus({
          hasCanvas: true,
          isFullyInitialized: true,
          hasError: false,
          errorMessage: null
        });
        
        console.log("Canvas fallback initialization succeeded");
      } catch (fallbackError) {
        console.error("Canvas fallback initialization also failed:", fallbackError);
        setCanvasError(`Canvas fallback initialization failed: ${fallbackError.message}`);
        
        // Create a recovery interval that keeps trying to initialize the canvas
        const recoveryAttempt = setInterval(() => {
          console.log("Attempting canvas recovery...");
          try {
            // Try one more time with a different approach
            if (!canvas) {
              canvas = fabric.StaticCanvas ? new fabric.StaticCanvas(canvasElement) : new fabric.Canvas(canvasElement);
              canvas.setWidth(width);
              canvas.setHeight(height);
              canvas.backgroundColor = 'white';
              
              console.log("Canvas recovery succeeded");
              updateCanvasReadyStatus({
                hasCanvas: true,
                isFullyInitialized: true,
                hasError: false,
                errorMessage: null
              });
              
              clearInterval(recoveryAttempt);
            }
          } catch (recoveryError) {
            console.error("Canvas recovery attempt failed:", recoveryError);
          }
        }, 1000);
        
        // Stop trying after 10 seconds
        setTimeout(() => {
          clearInterval(recoveryAttempt);
          console.error("Canvas recovery abandoned after timeout");
        }, 10000);
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
    if (isReadyForAutoOps) {
      refreshGuides();
    } else {
      console.warn("refreshGuides: Skipped vid init, ej redo");
    }
    
    // Initialize page recovery system via onMount to ensure component context
    // Will be initialized by the onMount callback we set up elsewhere
    
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
      console.log("Canvas component unmounting, cleaning up resources");
      
      // Reset canvas readiness state
      resetCanvasReady();
      
      // Clean up canvas on component unmount
      try {
        // Remove event handlers first
        if (eventHandlers && typeof eventHandlers.removeEventHandlers === 'function') {
          console.log("Removing event handlers");
          eventHandlers.removeEventHandlers();
        } else {
          console.warn("No eventHandlers.removeEventHandlers function available");
        }
        
        // Clean up history manager
        if (historyManager) {
          console.log("Disposing history manager");
          historyManager.dispose();
        }
        
        // Finally dispose the canvas
        if (canvas) {
          console.log("Disposing canvas");
          canvas.dispose();
          canvas = null;
        }
        
        // Clear global references
        window.$canvas = null;
        window.$globalContext = null;
        
        // Stop page recovery (this is redundant with the onDestroy in initializePageRecovery)
        // but included as a safety measure
        pageRecovery.stopSnapshots();
        
        console.log("Canvas cleanup complete");
      } catch (err) {
        console.error("Error during canvas cleanup:", err);
      }
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