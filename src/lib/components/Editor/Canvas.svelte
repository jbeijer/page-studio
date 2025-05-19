<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType, currentToolOptions } from '$lib/stores/toolbar';
  import { clipboard } from '$lib/stores/editor';
  import { fabric } from 'fabric';
  
  // Make fabric available globally for other modules
  if (typeof window !== 'undefined') {
    window.fabric = fabric;
    console.log("Fabric.js version loaded:", fabric.version || "unknown");
    console.log("Made fabric available globally via window.fabric");
  }
  import TextFlow from '$lib/utils/text-flow';
  import { createCanvas, getFabricVersion, createTextObject, createShadow } from '$lib/utils/fabric-helpers';
  import MasterObjectContextMenu from './MasterObjectContextMenu.svelte';
  import HorizontalRuler from './HorizontalRuler.svelte';
  import VerticalRuler from './VerticalRuler.svelte';
  // Import guides service
import guideService from '$lib/services/GuideService.js';
  import { loadDocument, saveDocument } from '$lib/utils/storage.js';
  import { pageRecovery } from '$lib/utils/page-recovery.js';
  
  // Import services
  import documentService from '$lib/services/DocumentService';
  import canvasService from '$lib/services/CanvasService';
  import masterPageService from '$lib/services/MasterPageService';
  import contextService from '$lib/services/ContextService';
  import layerService from '$lib/services/LayerService';
  import objectService from '$lib/services/ObjectService';
  import documentModuleService from '$lib/services/DocumentModuleService';
  import historyService from '$lib/services/HistoryService';
  import toolService from '$lib/services/ToolService';
  import textFlowService from '$lib/services/TextFlowService';
  import ServiceProvider from '$lib/services/ServiceProvider.svelte';
  import getServices from '$lib/services/getServices';
  
  // Import modular components
  import { 
    createEventHandlers,
    createDocumentManagement,
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
  let gridManagement;
  
  // State variables
  let isMounted = false;
  let selectedObject = null;
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
  
  // Track document IDs to detect document switches
  let previousDocumentId = null;
  
  // Show/hide rulers based on document settings
  $: showRulers = $currentDocument?.metadata?.rulers?.enabled || false;
  $: showHorizontalRuler = showRulers && ($currentDocument?.metadata?.rulers?.horizontalVisible || true);
  $: showVerticalRuler = showRulers && ($currentDocument?.metadata?.rulers?.verticalVisible || true);
  
  // Calculate ruler positions
  $: rulerWidth = width;
  $: rulerHeight = height;
  $: rulerOffset = 20; // Width/height of the rulers
  
  // Watch for grid changes
  $: if (canvas && $currentDocument?.metadata?.grid) {
    // Use our GridService to render the grid
    import('$lib/services/GridService').then(module => {
      const gridService = module.default;
      gridService.initialize({
        canvas,
        canvasElement,
        width,
        height
      });
      gridService.renderGrid();
    });
    
    // Initialize GuideService if it hasn't been initialized yet
    if (!guideService.initialized) {
      console.log("Initializing GuideService from grid change watcher");
      guideService.initialize({
        canvas,
        width,
        height
      });
      
      // Load guides for current page
      if ($currentPage) {
        guideService.loadGuidesFromDocument();
      }
    }
  }
  
  // Watch for changes to the canvas when page changes, and ensure page is saved
  $: if (canvas && $currentPage && documentModuleService.initialized) {
    // Use a debounced approach to not trigger this too often
    clearTimeout(window._pageSaveTimeout);
    window._pageSaveTimeout = setTimeout(() => {
      const objects = canvas?.getObjects() || [];
      if (objects.length > 0) {
        console.log(`Auto-saving page ${$currentPage} with ${objects.length} objects to ensure persistence`);
        documentModuleService.saveCurrentPage();
      }
    }, 500);
  }
  
  // Generate a unique ID for objects when needed
  function generateId() {
    return 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }

  // Handle active tool changes
  $: if (canvas && $activeTool) {
    // Update the context with the new active tool value to ensure event handlers use it
    if (window.$globalContext) {
      window.$globalContext.activeTool = $activeTool;
    }
    
    // Use toolService to setup canvas for this tool
    if (toolService.initialized) {
      toolService.setupCanvasForTool($activeTool);
    } else if (canvas) {
      // If toolService isn't initialized but canvas is available, initialize it
      toolService.initialize({ canvas });
      toolService.setupCanvasForTool($activeTool);
    }
    
    console.log(`Active tool updated to: ${$activeTool}`);
  }
  
  // Provide setupCanvasForTool as a proxy to toolService for backward compatibility
  function setupCanvasForTool(toolType) {
    if (!canvas) return;
    
    // If toolService is initialized, use it
    if (toolService.initialized) {
      return toolService.setupCanvasForTool(toolType);
    } else {
      // Otherwise, initialize it and then use it
      toolService.initialize({ canvas });
      return toolService.setupCanvasForTool(toolType);
    }
  }
  
  // Make setupCanvasForTool available externally through the canvas
  if (canvas) {
    canvas.setupForTool = setupCanvasForTool;
  }

  // Update text flow when text content changes
  function updateTextFlow(textObject) {
    if (!textObject || !textFlowService || !textFlowService.initialized) return;
    
    // If the textbox has linked objects, update the text flow
    if (textObject.linkedObjectIds && textObject.linkedObjectIds.length > 0) {
      textFlowService.updateTextFlow(textObject.id);
      canvas.renderAll();
    }
  }
  
  /**
   * Handle context menu override action
   */
  function handleContextMenuOverride(event) {
    const { object } = event.detail;
    if (object && object.fromMaster && object.overridable) {
      masterPageService.overrideMasterObject(object);
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
  
  /**
   * Updates the context with references to all services and useful methods
   * This function is called after services are initialized to ensure
   * the context has all the required references and methods
   */
  function updateContextWithServices() {
    if (!contextService.initialized) {
      console.error("Cannot update context: ContextService not initialized");
      return null;
    }
    
    // Get a reference to the context
    const context = contextService.createProxy();
    
    // Before updating, ensure we have event handlers defined
    if (!eventHandlers) {
      eventHandlers = createEventHandlers(context);
    }
    
    // Update context with service references and methods
    context.update({
      // Service references
      documentService,
      canvasService,
      masterPageService,
      contextService,
      layerService,
      objectService,
      documentModuleService,
      historyService,
      toolService,
      textFlowService,
      guideService,
      
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
      
      // Layer management methods
      bringForward: layerService.bringForward,
      sendBackward: layerService.sendBackward,
      bringToFront: layerService.bringToFront,
      sendToBack: layerService.sendToBack,
      
      // Object manipulation methods
      deleteSelectedObjects: objectService.deleteSelectedObjects,
      copySelectedObjects: objectService.copySelectedObjects,
      cutSelectedObjects: objectService.cutSelectedObjects,
      pasteObjects: objectService.pasteObjects,
      rotateObject: objectService.rotateObject,
      scaleObject: objectService.scaleObject,
      flipObject: objectService.flipObject,
      
      // Document management methods
      saveCurrentPage: documentModuleService.saveCurrentPage,
      saveSpecificPage: documentModuleService.saveSpecificPage,
      loadPage: documentModuleService.loadPage,
      loadDocumentFromIndexedDB: documentModuleService.loadDocumentFromIndexedDB,
      createObjectsManually: documentModuleService.createObjectsManually,
      applyMasterPage: documentModuleService.applyMasterPage,
      overrideMasterObject: documentModuleService.overrideMasterObject,
      getPageById: documentModuleService.getPageById,
      
      // Tool management methods
      setupCanvasForTool: setupCanvasForTool,
      
      // Text flow management methods
      updateTextFlow: updateTextFlow,
      
      // Guide management methods
      handleCreateGuide,
      handleUpdateGuide,
      handleDeleteGuide,
      refreshGuides: guideService.loadGuidesFromDocument,
      saveGuidesToDocument: guideService.saveGuidesToDocument,
      loadGuidesFromDocument: guideService.loadGuidesFromDocument,
      clearGuides: guideService.clearGuides,
      
      // Version information
      version: {
        appVersion: "1.0.0", // Update with your actual version
        fabricVersion: fabric.version || '5.3.0',
        lastUpdated: new Date().toISOString()
      },
      
      // Current state references
      isReadyForAutoOps
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
          if (documentModuleService && documentModuleService.saveCurrentPage) {
            return documentModuleService.saveCurrentPage();
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
  export const getTextFlow = () => textFlowService;
  export const getContext = () => window.$globalContext || null;
  
  // Add a complete reset function for external components to use
  export const resetCanvas = () => {
    if (!canvas) return false;
    
    console.log("EXTERNAL RESET: Performing complete canvas reset");
    try {
      // Disable all event handlers temporarily
      canvas.off();
      
      // Clear all canvas contents - use a more thorough approach
      canvas.clear();
      canvas.backgroundColor = 'white';
      
      // Reset internal state completely
      canvas._objects = [];
      if (canvas._objectsToRender) canvas._objectsToRender = [];
      canvas.discardActiveObject();
      canvas.__eventListeners = {};
      
      // Reset additional internal state that might persist
      if (canvas._activeObject) canvas._activeObject = null;
      if (canvas._hoveredTarget) canvas._hoveredTarget = null;
      if (canvas._currentTransform) canvas._currentTransform = null;
      
      // Reset all potential state artifacts that could persist
      if (typeof canvas.selection !== 'undefined') canvas.selection = false;
      if (typeof canvas.isDrawingMode !== 'undefined') canvas.isDrawingMode = false;
      
      // Clear any cached references
      if (typeof window !== 'undefined') {
        // Clear global canvas objects cache
        window._canvasObjects = null;
        window._previousPageBackup = null;
        window.$emergencyBackup = null;
        
        // Set the current document ID for transition handling
        if ($currentDocument) {
          window._previousDocumentId = $currentDocument.id;
        }
      }
      
      // More aggressive reset for any potential fabric.js global state
      if (typeof fabric !== 'undefined' && fabric.Canvas) {
        try {
          fabric.Canvas.activeInstance = null;
        } catch (err) {
          console.warn("Could not reset fabric.Canvas.activeInstance", err);
        }
      }
      
      // Second reset cycle - clear again to be absolutely sure
      canvas.clear();
      canvas.backgroundColor = 'white';
      if (canvas._objects) canvas._objects = [];
      if (canvas._objectsToRender) canvas._objectsToRender = [];
      
      // Force multiple renders with a clean rendering loop
      canvas.requestRenderAll();
      canvas.renderAll();
      setTimeout(() => {
        canvas.requestRenderAll();
        canvas.renderAll();
      }, 10);
      
      // Third reset cycle - just to be totally sure
      setTimeout(() => {
        canvas.clear();
        canvas.backgroundColor = 'white';
        if (canvas._objects) canvas._objects = [];
        if (canvas._objectsToRender) canvas._objectsToRender = [];
        canvas.requestRenderAll();
        canvas.renderAll();
      }, 50);
      
      // Restore event handlers after a delay
      setTimeout(() => {
        if (eventHandlers && typeof eventHandlers.registerEventHandlers === 'function') {
          eventHandlers.registerEventHandlers();
        }
        
        // Final render after event handlers are registered
        canvas.requestRenderAll();
        canvas.renderAll();
      }, 150);
      
      console.log("EXTERNAL RESET: Canvas reset complete");
      return true;
    } catch (err) {
      console.error("EXTERNAL RESET: Error during canvas reset:", err);
      return false;
    }
  };
  
  // Make canvas directly accessible via window for emergency situations
  if (typeof window !== 'undefined') {
    window.$canvas = canvas;
  }
  
  // Direct exports of canvas functions using services
  export const bringForward = () => layerService.bringForward();
  export const sendBackward = () => layerService.sendBackward();
  export const bringToFront = () => layerService.bringToFront();
  export const sendToBack = () => layerService.sendToBack();
  export const deleteSelectedObjects = () => objectService.deleteSelectedObjects();
  export const copySelectedObjects = () => objectService.copySelectedObjects();
  export const cutSelectedObjects = () => objectService.cutSelectedObjects();
  export const pasteObjects = () => objectService.pasteObjects();
  export const undo = () => historyService.canUndo() ? historyService.undo() : null;
  export const redo = () => historyService.canRedo() ? historyService.redo() : null;
  export const overrideMasterObject = (obj) => masterPageService.overrideMasterObject(obj);
  export const isObjectFromMaster = (obj) => obj && obj.fromMaster === true;
  export const getMasterPageObjects = () => canvas ? canvas.getObjects().filter(obj => obj.fromMaster) : [];
  export const saveCurrentPage = () => {
    if (!isReadyForAutoOps) {
      console.warn("saveCurrentPage: Not ready (canvas, document eller page saknas)");
      return false;
    }
    return documentModuleService.saveCurrentPage();
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
  export const saveSpecificPage = (pageId, objects) => documentModuleService.saveSpecificPage(pageId, objects);
  
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

  // Subscribe to document changes to detect document switches
  $: if (canvas && $currentDocument) {
    const docId = $currentDocument.id;
    
    // Check for document change if we have a previously tracked document ID
    if (previousDocumentId && docId !== previousDocumentId) {
      console.log(`DOCUMENT SWITCH DETECTED: ${previousDocumentId} -> ${docId}`);
      
      // Immediately perform a full canvas reset to prevent document content leakage
      try {
        console.log(`Performing emergency canvas reset for document switch`);
        
        // Remove all event handlers
        canvas.off();
        
        // Clear canvas and internal state completely
        canvas.clear();
        canvas.backgroundColor = 'white';
        canvas._objects = [];
        if (canvas._objectsToRender) canvas._objectsToRender = [];
        canvas.discardActiveObject();
        canvas.__eventListeners = {};
        
        // Reset additional internal state that might persist
        if (canvas._activeObject) canvas._activeObject = null;
        if (canvas._hoveredTarget) canvas._hoveredTarget = null;
        
        // Clear any cached references
        if (typeof window !== 'undefined') {
          window._canvasObjects = null;
          window._previousPageBackup = null;
          window.$emergencyBackup = null;
        }
        
        // Force multiple renders to ensure clean state
        canvas.requestRenderAll();
        canvas.renderAll();
        
        // Additional render with delay for reliability
        setTimeout(() => {
          canvas.requestRenderAll();
          canvas.renderAll();
        }, 50);
        
        console.log(`Canvas fully reset for new document ${docId}`);
      } catch (err) {
        console.error("Error during document switch canvas reset:", err);
      }
    }
    
    // Update tracking variable
    previousDocumentId = docId;
  }

  // Subscribe to current page changes
  $: if ($currentPage && canvas && $currentDocument && $currentPage !== previousPage) {
    console.log(`+==========================================+`);
    console.log(`| PAGE SWITCH: ${previousPage || 'null'} -> ${$currentPage} |`);
    console.log(`+==========================================+`);
    
    // Track this operation with its own timestamp for debugging
    const switchOperationId = Date.now();
    console.log(`Page switch operation ID: ${switchOperationId}`);
    
    // Create a snapshot of the previous page right before switching for safety
    if (previousPage && pageRecovery) {
      console.log(`Creating emergency snapshot of previous page ${previousPage} before switch`);
      try {
        // Capture canvas state for the previous page
        const canvasData = canvas.toJSON(['id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable']);
        const objectCount = canvasData.objects ? canvasData.objects.length : 0;
        if (objectCount > 0) {
          window._previousPageBackup = {
            pageId: previousPage,
            timestamp: Date.now(),
            objectCount,
            canvasJSON: JSON.stringify(canvasData)
          };
          console.log(`Stored emergency backup for page ${previousPage} with ${objectCount} objects`);
        }
      } catch (err) {
        console.error(`Error creating emergency snapshot:`, err);
      }
    }
    
    // Store current page ID in the canvas object for direct reference
    canvas.pageId = $currentPage;
    
    // Store global references for recovery
    window.$page = $currentPage;
    window.$document = $currentDocument;
    window.$updateDocument = currentDocument.update;
    window.$canvas = canvas;
    
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
          
          // Validate objects before saving
          const objectsToValidate = currentObjects;
          console.log(`SAVE PHASE [${switchOperationId}]: Validating ${objectsToValidate.length} objects before saving`);
          
          // Quick validation - ensure each object has an ID
          objectsToValidate.forEach((obj, idx) => {
            if (!obj.id) {
              console.log(`Adding missing ID to object #${idx} (${obj.type}) before saving`);
              obj.id = generateId();
            }
            
            // Log important object info
            console.log(`Object #${idx}: Type=${obj.type}, ID=${obj.id}, Visible=${obj.visible}, HasData=${!!obj.toJSON}`);
          });
          
          // Make a safe copy of objects with validated properties
          const objectsToSave = currentObjects.map(obj => {
            // Force visibility and opacity on objects to ensure they appear when reloaded
            obj.visible = true;
            obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
            return obj;
          });
          
          // Use await to ensure the save completes before moving on
          const saveSuccess = documentManagement.saveSpecificPage(previousPage, objectsToSave);
          console.log(`SAVE PHASE [${switchOperationId}]: Save result: ${saveSuccess ? 'success' : 'failure'}`);
          
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
    
    // Clear the canvas to prepare for new page, with careful error handling
    console.log(`TRANSITION PHASE [${switchOperationId}]: Clearing canvas`);
    
    try {
      // First, remove all event handlers safely to prevent event errors during clear
      const tempSaveCurrentPage = saveCurrentPage;
      const objects = canvas.getObjects();
      const oldDocId = previousDocumentId;
      const newDocId = $currentDocument?.id;
      const isDocumentSwitch = oldDocId !== newDocId;
      
      // Log document switching for debugging
      if (isDocumentSwitch) {
        console.log(`TRANSITION PHASE [${switchOperationId}]: DOCUMENT SWITCH DETECTED ${oldDocId} -> ${newDocId}`);
      }
      
      // Temporarily disable event handlers that might trigger saveCurrentPage
      try {
        // Remove all event handlers for more thorough clearing
        if (isDocumentSwitch) {
          console.log(`TRANSITION PHASE [${switchOperationId}]: Removing ALL event handlers for document switch`);
          canvas.off(); // Remove ALL handlers for document switch
        } else {
          // Just remove save-related handlers for page switch
          canvas.off('object:modified');
          canvas.off('object:added');
          canvas.off('object:removed');
        }
      } catch (err) {
        console.warn("Could not remove event handlers before clearing:", err);
      }
      
      // More aggressive clearing for document switches
      if (isDocumentSwitch) {
        console.log(`TRANSITION PHASE [${switchOperationId}]: Performing thorough canvas reset for document switch`);
        
        // Clear the canvas object entirely
        canvas.clear();
        canvas.backgroundColor = 'white';
        
        // Force emptying internal arrays
        if (canvas._objects) canvas._objects = [];
        if (canvas._objectsToRender) canvas._objectsToRender = [];
        
        // Reset canvas internal state as much as possible
        canvas.discardActiveObject();
        canvas.__eventListeners = {};
        
        // Clear any cached object references
        window._canvasObjects = null;
        
        // Force garbage collection with multiple render calls
        canvas.requestRenderAll();
        canvas.renderAll();
      } else {
        // Standard clearing for page switches
        canvas.clear();
        canvas.backgroundColor = 'white';
        canvas.renderAll();
      }
      
      // Update tracking variables for document switches
      if (isDocumentSwitch) {
        previousDocumentId = newDocId;
        
        // Reset global references for new document
        window._previousPageBackup = null;
        
        console.log(`TRANSITION PHASE [${switchOperationId}]: Document switch cleanup complete`);
      }
      
      // Restore event handlers later
      setTimeout(() => {
        try {
          // Add event handlers back
          eventHandlers.registerEventHandlers();
        } catch (err) {
          console.warn("Could not restore event handlers after clearing:", err);
        }
      }, 100);
    } catch (err) {
      console.error("Error clearing canvas:", err);
      
      // Try a more careful approach if the standard clear fails
      try {
        // Remove objects one by one
        const objects = canvas.getObjects();
        console.log(`TRANSITION PHASE [${switchOperationId}]: Removing ${objects.length} objects one by one`);
        
        // Turn off save handlers first
        canvas.off('object:removed');
        
        // Remove each object
        for (let i = objects.length - 1; i >= 0; i--) {
          canvas.remove(objects[i]);
        }
        
        canvas.backgroundColor = 'white';
        canvas.renderAll();
      } catch (fallbackErr) {
        console.error("Fallback canvas clearing also failed:", fallbackErr);
      }
    }
    
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

  // Guide-related event handlers now use GuideService
  function handleCreateGuide(event) {
    if (!isReadyForAutoOps) {
      console.warn("handleCreateGuide: Not ready (canvas, document or page missing)");
      return;
    }
    
    const { position, orientation } = event.detail;
    const isHorizontal = event.detail.isHorizontal || orientation === 'horizontal';
    
    // Use GuideService to create guide
    if (isHorizontal) {
      guideService.createHorizontalGuide(position);
    } else {
      guideService.createVerticalGuide(position);
    }
  }
  
  function handleUpdateGuide(event) {
    // Note: GuideService handles guide updates differently through dragging
    // This is for compatibility with existing components
    handleCreateGuide(event);
  }
  
  function handleDeleteGuide(event) {
    // Guide deletion is handled directly by GuideService via double-click
    // This is for compatibility with existing components
    if (!isReadyForAutoOps) {
      console.warn("handleDeleteGuide: Not ready (canvas, document or page missing)");
      return;
    }
    
    // For direct deletion through interface components
    const { id } = event.detail;
    if (id) {
      guideService.handleDeleteGuide({ id });
    }
  }
  
  function refreshGuides() {
    if (!isReadyForAutoOps) {
      console.warn("refreshGuides: Not ready (canvas, document or page missing)");
      return;
    }
    guideService.loadGuidesFromDocument();
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
    // Add extra safety checks
    if (!canvas || !$currentPage || typeof canvas.toJSON !== 'function') {
      console.warn("Cannot create snapshot: canvas or page is not available");
      return null;
    }
    
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
      
      // Verify data before returning
      if (!canvasData || typeof canvasData !== 'object') {
        console.warn("Cannot create snapshot: invalid canvas data returned");
        return null;
      }
      
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
        
        // Take an immediate snapshot after a page switch, with extra safety checks
        setTimeout(() => {
          if (isReadyForAutoOps && pageId && canvas && 
              typeof canvas.getObjects === 'function') {
            try {
              const objCount = canvas.getObjects().length;
              if (objCount > 0) {
                console.log(`Taking snapshot for page ${pageId} with ${objCount} objects`);
                pageRecovery.takeSnapshot(createSnapshot, pageId);
              }
            } catch (snapErr) {
              console.warn(`Could not take snapshot for page ${pageId}:`, snapErr);
            }
          }
        }, 2000);
      }
    });
  } catch (err) {
    console.warn("Could not subscribe to page changes for recovery (possibly outside component context)", err);
  }
  
  // Take an initial snapshot
  setTimeout(() => {
    // Add more null checks to prevent TypeError
    if (isReadyForAutoOps && $currentPage && canvas && typeof canvas.getObjects === 'function') {
      try {
        const objectCount = canvas.getObjects().length;
        if (objectCount > 0) {
          console.log("Taking initial recovery snapshot");
          pageRecovery.takeSnapshot(createSnapshot, $currentPage);
        }
      } catch (err) {
        console.warn("Could not take initial recovery snapshot:", err);
      }
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

  /**
   * Centralized function to initialize all services in a consistent manner
   * This replaces scattered initialization throughout the codebase
   */
  function initializeServices() {
    if (!canvas) {
      console.error("initializeServices: Cannot initialize services - Canvas is null or undefined");
      return false;
    }

    console.log("Initializing all services with canvas reference");
    
    try {
      // Core services first (these provide foundations for others)
      contextService.initialize({
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
        isReadyForAutoOps,
        
        // Utility functions
        dispatch,
        generateId,
        convertToPixels,
        snapToGridPoint,
        setupCanvasForTool,
        loadDocument,
        
        // Version information
        version: {
          appVersion: "1.0.0", // Update with your actual version
          fabricVersion: fabric.version || '5.3.0',
          lastUpdated: new Date().toISOString()
        }
      });
      
      // Core services (these should be initialized first)
      canvasService.initialize(canvas);
      documentService.initialize(canvas);
      
      // Text flow service needs to be initialized early as other services depend on it
      textFlowService.initialize({ canvas });
      
      // Document handling services
      documentModuleService.initialize({
        canvas,
        textFlow: textFlowService, // Pass textFlowService for backward compatibility
        generateId,
        activeTool: $activeTool,
        context: contextService.createProxy()
      });
      
      masterPageService.initialize(canvas);
      
      // Canvas object manipulation services
      layerService.initialize({ canvas });
      objectService.initialize({
        canvas,
        dispatch,
        generateId,
        textFlow: textFlowService, // Pass textFlowService for backward compatibility
        activeTool: $activeTool
      });
      
      // Interactive services
      toolService.initialize({ canvas });
      toolService.setupCanvasForTool($activeTool);
      
      historyService.initialize({
        canvas,
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
      
      // Visualization services (these depend on core services)
      guideService.initialize({
        canvas,
        width,
        height
      });
      
      // Grid service is dynamically imported, so handle it differently
      import('$lib/services/GridService').then(module => {
        const gridService = module.default;
        gridService.initialize({
          canvas,
          canvasElement,
          width,
          height
        });
        
        // If grid is enabled, render it
        if ($currentDocument?.metadata?.grid?.enabled) {
          gridService.renderGrid();
        }
        
        // Update context with gridService
        const context = contextService.createProxy();
        if (context) {
          context.update({
            gridService,
            renderGrid: gridService.renderGrid,
            toggleGrid: gridService.toggleGrid,
            updateGridProperties: gridService.updateGridProperties,
            snapToGrid: gridService.snapToGrid,
            convertToPixels: gridService.convertToPixels
          });
        }
      });
      
      // Update context with all service references and methods
      const context = updateContextWithServices();
      
      // Event handlers for canvas interactions
      if (!eventHandlers) {
        eventHandlers = createEventHandlers(context);
      }
      eventHandlers.registerEventHandlers();
      
      // Initialize ServiceProvider with same canvas reference if it exists
      if (typeof window !== 'undefined' && window.$serviceProvider && 
          typeof window.$serviceProvider.initializeCanvas === 'function') {
        window.$serviceProvider.initializeCanvas(canvas);
      }
      
      // Update global references for debugging/recovery
      window.$globalContext = context;
      window.$canvas = canvas;
      
      console.log("All services initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing services:", error);
      return false;
    }
  }
  
  onMount(() => {
    isMounted = true;
    
    // Set up global recovery references early
    window.saveDocument = saveDocument;
    
    // Update the global canvas reference for emergency access
    window.$canvas = canvas;
    
    // CRITICAL: Check if we're loading a new document ID
    // This helps fix objects appearing in new documents
    if (typeof window !== 'undefined') {
      const currentDocId = $currentDocument?.id || null;
      const previousDocId = window._previousDocumentId || null;
      
      // If we're switching documents, ensure a complete canvas reset
      if (currentDocId !== previousDocId && previousDocId !== null && currentDocId !== null) {
        console.log(`MOUNT: Document switch detected from ${previousDocId} to ${currentDocId} - performing FULL canvas reset`);
        setTimeout(() => {
          if (canvas) {
            // Complete canvas wipe for document switches
            try {
              // Remove all event handlers first
              canvas.off();
              
              // Clear the canvas completely
              canvas.clear();
              canvas.backgroundColor = 'white';
              
              // Force reset internal arrays
              canvas._objects = [];
              if (canvas._objectsToRender) canvas._objectsToRender = [];
              
              // Reset canvas state
              canvas.discardActiveObject();
              canvas.__eventListeners = {};
              
              // Reset additional internal state that might persist between documents
              if (canvas._activeObject) canvas._activeObject = null;
              if (canvas._hoveredTarget) canvas._hoveredTarget = null;
              
              // Clear document-related global variables to prevent cross-contamination
              window._canvasObjects = null;
              window._previousPageBackup = null;
              window.$emergencyBackup = null;
              
              // CRITICAL: Call initializeForNewDocument to fully reset internal state
              const initializeNewDoc = () => {
                if (!canvas) return;
                // Create a fresh canvas internal state
                canvas.clear();
                canvas.backgroundColor = 'white';
                canvas._objects = [];
                if (canvas._objectsToRender) canvas._objectsToRender = [];
                canvas.requestRenderAll();
                canvas.renderAll();
              };
              initializeNewDoc();
              
              // Force multiple renders with different timing
              canvas.requestRenderAll();
              canvas.renderAll();
              
              setTimeout(() => {
                canvas.requestRenderAll();
                canvas.renderAll();
              }, 50);
              
              // Update doc ID tracking
              window._previousDocumentId = currentDocId;
              
              console.log(`MOUNT: Complete canvas reset completed for new document ${currentDocId}`);
            } catch (err) {
              console.error("Error during canvas reset:", err);
            }
          }
        }, 100);
      }
    }
    
    // Log fabric.js version info
    console.log("Fabric version detected:", getFabricVersion());
    const validClasses = {
      Canvas: !!fabric.Canvas,
      StaticCanvas: !!fabric.StaticCanvas,
      Textbox: !!fabric.Textbox,
      IText: !!fabric.IText,
      Text: !!fabric.Text,
      Rect: !!fabric.Rect, 
      Circle: !!fabric.Circle,
      Line: !!fabric.Line,
      Group: !!fabric.Group
    };
    
    console.log("Available fabric classes:", validClasses);
    
    // Check if critical classes are missing
    const missingClasses = Object.entries(validClasses)
      .filter(([_, exists]) => !exists)
      .map(([name]) => name);
      
    if (missingClasses.length > 0) {
      console.error(`WARNING: Missing critical Fabric.js classes: ${missingClasses.join(', ')}`);
    }
    
    // Initialize Fabric.js canvas with the given dimensions using our helper
    try {
      console.log("Starting canvas initialization...");
      
      // Update canvas status to initializing
      updateCanvasReadyStatus({
        hasCanvas: false,
        isFullyInitialized: false,
        hasError: false,
        errorMessage: "Canvas initializing..."
      });
      
      // IMPORTANT: Make sure the DOM element exists before initializing
      if (!canvasElement) {
        throw new Error("Canvas DOM element not found");
      }
      
      // Make sure fabric.Canvas is properly defined
      if (!fabric.Canvas) {
        console.error("fabric.Canvas is undefined. Available fabric classes:", fabric);
        throw new Error("fabric.Canvas is not defined. This usually indicates a problem with how Fabric.js was imported.");
      }
      
      // Initialize with better error handling
      try {
        console.log("Creating canvas with createCanvas helper...");
        canvas = createCanvas(canvasElement, {
          width,
          height,
          selection: true,
          preserveObjectStacking: true,
          backgroundColor: 'white'
        });
      } catch (helperError) {
        console.error("Error using createCanvas helper:", helperError);
        
        // Try direct initialization as fallback
        console.log("Trying direct fabric.Canvas initialization...");
        canvas = new fabric.Canvas(canvasElement, {
          width,
          height,
          selection: true,
          preserveObjectStacking: true,
          backgroundColor: 'white'
        });
      }
      
      // Verify canvas was created successfully
      if (!canvas) {
        throw new Error("Canvas creation failed - canvas object is undefined or null");
      }
      
      // Add setupForTool to canvas instance
      canvas.setupForTool = setupCanvasForTool;
      
      // Update global reference for emergency access and other modules
      window.$canvas = canvas;
      
      // Update canvas status to success
      updateCanvasReadyStatus({
        hasCanvas: true,
        isFullyInitialized: true,
        hasError: false,
        errorMessage: null
      });
      
      console.log("Canvas initialized successfully:", canvas);
      
      // Add setupForTool to canvas instance
      canvas.setupForTool = setupCanvasForTool;
      
      // Initialize all services through our centralized function
      initializeServices();
    } catch (error) {
      console.error("Canvas initialization failed:", error);
      setCanvasError(`Canvas initialization failed: ${error.message}`);
      
      // Last resort fallback - try with more explicit approach
      try {
        console.log("Attempting last-resort canvas initialization...");
        
        // Create the canvas element from scratch
        const newCanvasElement = document.createElement('canvas');
        newCanvasElement.width = width;
        newCanvasElement.height = height;
        
        // Replace the existing element
        if (canvasElement && canvasElement.parentNode) {
          canvasElement.parentNode.replaceChild(newCanvasElement, canvasElement);
          canvasElement = newCanvasElement;
        }
        
        // Try to initialize again
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
        
        // Add setupForTool to canvas instance
        canvas.setupForTool = setupCanvasForTool;
        
        console.log("Canvas fallback initialization succeeded");
        
        // Initialize services after fallback initialization
        initializeServices();
      } catch (fallbackError) {
        console.error("All canvas initialization attempts failed:", fallbackError);
        setCanvasError(`Canvas initialization failed completely: ${fallbackError.message}. Please check the console for more details.`);
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
    
    // Initialize guides for current page if available
    if (isReadyForAutoOps && guideService.initialized) {
      refreshGuides();
    } else {
      console.warn("refreshGuides: Skipped at init, not ready");
    }
    
    // Initialize page recovery system via onMount to ensure component context
    // Will be initialized by the onMount callback we set up elsewhere
    
    // Create a derived store to update context when store values change
    $: {
      if (contextService.initialized) {
        const context = contextService.createProxy();
        if (context && context.update) {
          console.log("Canvas.svelte: Updating context with new document/page data");
          context.update({
            currentDocument: $currentDocument || null,
            currentPage: $currentPage || null,
            activeTool: $activeTool,
            currentToolOptions: $currentToolOptions,
            isReadyForAutoOps,
            hasActiveObjects: canvas ? canvas.getObjects().length > 0 : false
          });
        }
      }
    }
    
    /**
     * Centralized function to clean up all services in a consistent way
     */
    function cleanupServices() {
      console.log("Cleaning up all services");
      
      try {
        // First remove event handlers to prevent errors during cleanup
        if (eventHandlers && typeof eventHandlers.removeEventHandlers === 'function') {
          console.log("Removing event handlers");
          eventHandlers.removeEventHandlers();
        } else {
          console.warn("No eventHandlers.removeEventHandlers function available");
        }
        
        // Clean up services in roughly reverse order of initialization
        
        // Visualization services
        console.log("Cleaning up visualization services");
        guideService.cleanup();
        
        // Dynamic import GridService for cleanup
        import('$lib/services/GridService').then(module => {
          const gridService = module.default;
          gridService.cleanup();
        });
        
        // Interactive services
        console.log("Cleaning up interactive services");
        historyService.cleanup();
        toolService.cleanup();
        textFlowService.cleanup();
        
        // Canvas object manipulation services
        console.log("Cleaning up object/layer manipulation services");
        objectService.cleanup();
        layerService.cleanup();
        
        // Document handling services
        console.log("Cleaning up document services");
        documentModuleService.cleanup();
        masterPageService.cleanup();
        
        // Core services last as other services may depend on them
        console.log("Cleaning up core services");
        documentService.cleanup();
        canvasService.cleanup();
        contextService.cleanup();
        
        console.log("All services cleaned up successfully");
        return true;
      } catch (err) {
        console.error("Error during services cleanup:", err);
        return false;
      }
    }
    
    return () => {
      console.log("Canvas component unmounting, cleaning up resources");
      
      // Reset canvas readiness state
      resetCanvasReady();
      
      // Clean up canvas and services on component unmount
      try {
        // Clean up all services first
        cleanupServices();
        
        // Stop page recovery
        pageRecovery.stopSnapshots();
        
        // Finally dispose the canvas
        if (canvas) {
          console.log("Disposing canvas");
          canvas.dispose();
          canvas = null;
        }
        
        // Clear global references
        window.$canvas = null;
        window.$globalContext = null;
        
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