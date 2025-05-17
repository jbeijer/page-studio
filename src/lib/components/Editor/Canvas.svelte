<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType, currentToolOptions } from '$lib/stores/toolbar';
  import { clipboard } from '$lib/stores/editor';
  import * as fabric from 'fabric';
  import TextFlow from '$lib/utils/text-flow';
  import HistoryManager from '$lib/utils/history-manager';
  import MasterObjectContextMenu from './MasterObjectContextMenu.svelte';
  import HorizontalRuler from './HorizontalRuler.svelte';
  import VerticalRuler from './VerticalRuler.svelte';
  import { createLayerManagementFunctions, createClipboardFunctions } from './Canvas.helpers.js';
  import { loadDocument } from '$lib/utils/storage.js';
  
  // Importera grid-utils endast på klientsidan
  let convertToPixels;
  let snapToGridPoint;
  
  if (typeof window !== 'undefined') {
    import('$lib/utils/grid-utils.js').then(module => {
      convertToPixels = module.convertToPixels;
      snapToGridPoint = module.snapToGrid;
    });
  }
  
  const dispatch = createEventDispatcher();
  
  export let width = 1240; // Default A4 @ 150 DPI: 210mm × 1.5 × 3.93701
  export let height = 1754; // Default A4 @ 150 DPI: 297mm × 1.5 × 3.93701
  
  let canvasElement;
  let canvas;
  let pages = [];
  let isDrawing = false;
  let drawingObject = null;
  let imageInput;
  let selectedObject = null;
  let textFlow;
  let historyManager;
  
  // Debug flag - sätt till true för att aktivera debugging av grid-justeringen
  window.DEBUG_GRID_ALIGNMENT = false;
  
  // History state
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
  let canvasContainer;
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
  $: if (canvas && $currentDocument?.metadata?.grid) {
    renderGrid();
  }
  
  // Generate a unique ID for objects when needed
  function generateId() {
    return 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }
  
  // Keep track of the previous page to avoid redundant operations
  let previousPage = null;
  
  /**
   * Direct function to load document from IndexedDB
   * Bypasses the store to ensure we have the latest data
   * @param {string} documentId - Document ID to load
   * @returns {Promise<Object>} The document from IndexedDB
   */
  async function loadDocumentFromIndexedDB(documentId) {
    console.log(`Direct DB load for document: ${documentId}`);
    try {
      // Use the storage utility to load the document directly from IndexedDB
      const document = await loadDocument(documentId);
      console.log(`Successfully loaded document directly from IndexedDB: ${documentId}`);
      return document;
    } catch (err) {
      console.error(`Failed to load document directly from IndexedDB: ${documentId}`, err);
      return null;
    }
  }
  
  // Subscribe to current page changes
  $: if ($currentPage && canvas && $currentPage !== previousPage) {
    console.log(`+==========================================+`);
    console.log(`| PAGE SWITCH: ${previousPage || 'null'} -> ${$currentPage} |`);
    console.log(`+==========================================+`);
    
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
    
    loadPage($currentPage, false).then(() => {
      const loadDuration = performance.now() - loadStartTime;
      console.log(`LOAD PHASE: loadPage() completed in ${loadDuration.toFixed(2)}ms`);
      
      // Load guides for new page
      loadGuides();
      
      // Re-render grid if enabled
      if ($currentDocument?.metadata?.grid?.enabled) {
        renderGrid();
      }
    }).catch(err => {
      console.error("LOAD PHASE ERROR: Failed to load page:", err);
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
  
  // Handle active tool changes
  $: if (canvas && $activeTool) {
    setupCanvasForTool($activeTool);
    
    // After changing tools, ensure all objects are properly rendered
    setTimeout(() => {
      canvas.requestRenderAll();
      canvas.renderAll();
    }, 0);
  }
  
  // Watch for selected object changes
  $: if (canvas) {
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);
    canvas.on('selection:cleared', handleSelectionCleared);
  }
  
  // SSR-säker mount
  let isMounted = false;
  
  onMount(() => {
    isMounted = true;
    // Initialize Fabric.js canvas with the given dimensions
    canvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'white'
    });
    
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
    
    // Set up mouse event handlers
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:dblclick', handleDoubleClick);
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);
    canvas.on('selection:cleared', handleSelectionCleared);
    
    // Add right-click (context menu) handler
    canvas.on('mouse:down', function(options) {
      if (options.e.button === 2) { // Right click
        handleRightClick(options);
      }
    });
    
    // Listen for changes to update store
    canvas.on('object:modified', saveCurrentPage);
    canvas.on('object:added', saveCurrentPage);
    canvas.on('object:removed', saveCurrentPage);
    
    // Setup canvas for initial tool
    setupCanvasForTool($activeTool);
    
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
    
    // Set up snapping functionality
    setupSnapping();
    
    // Initialize grid if enabled
    if ($currentDocument?.metadata?.grid?.enabled) {
      renderGrid();
    }
    
    // Initialize guides for current page
    loadGuides();
    
    // Initialize layer management functions
    const layerFunctions = createLayerManagementFunctions(canvas, saveCurrentPage);
    bringForward = layerFunctions.bringForward;
    sendBackward = layerFunctions.sendBackward;
    bringToFront = layerFunctions.bringToFront;
    sendToBack = layerFunctions.sendToBack;
    
    // Initialize clipboard functions
    const clipboardFunctions = createClipboardFunctions(
      canvas, saveCurrentPage, deleteSelectedObjects, generateId, clipboard, textFlow
    );
    copySelectedObjects = clipboardFunctions.copySelectedObjects;
    cutSelectedObjects = clipboardFunctions.cutSelectedObjects;
    pasteObjects = clipboardFunctions.pasteObjects;
    
    // Set up keyboard shortcuts for undo/redo, copy/paste
    const handleKeyboard = (e) => {
      // Skip keyboard shortcuts if in a text input
      if (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.isContentEditable) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Ctrl+Z or Cmd+Z for Undo
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') || 
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z for Redo
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Ctrl+C or Cmd+C for Copy
        if (canvas.getActiveObject()) {
          e.preventDefault();
          copySelectedObjects();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        // Ctrl+X or Cmd+X for Cut
        if (canvas.getActiveObject()) {
          e.preventDefault();
          cutSelectedObjects();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Ctrl+V or Cmd+V for Paste
        e.preventDefault();
        pasteObjects();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected objects
        if (canvas.getActiveObject()) {
          deleteSelectedObjects();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    
    return () => {
      // Clean up canvas on component unmount
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:dblclick', handleDoubleClick);
      canvas.off('selection:created', handleObjectSelected);
      canvas.off('selection:updated', handleObjectSelected);
      canvas.off('selection:cleared', handleSelectionCleared);
      
      // Clean up history manager
      if (historyManager) {
        historyManager.dispose();
      }
      
      // Remove keyboard event listener
      window.removeEventListener('keydown', handleKeyboard);
      
      canvas.dispose();
    };
  });
  
  function loadPage(pageId, shouldSaveFirst = true) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!canvas || !$currentDocument) {
          console.error("LOAD ERROR: Canvas or document not available");
          return reject(new Error("Canvas or document not available"));
        }
        
        console.log(`LOAD PHASE: loadPage called for page: ${pageId} (shouldSaveFirst: ${shouldSaveFirst})`);
        
        // Save current page first (only if requested and we have a current page)
        if (shouldSaveFirst && $currentPage) {
          console.log(`LOAD PHASE: Saving current page ${$currentPage} before loading ${pageId}`);
          
          // Use standard saveCurrentPage function to save the current page
          saveCurrentPage();
        }
        
        // Force canvas to clear and reset
        console.log("LOAD PHASE: Clearing canvas");
        canvas.clear();
        canvas.backgroundColor = 'white';
        canvas.renderAll();
        
        // IMPORTANT: Always get the latest data from the store
        // This ensures we're not using stale data
        const latestDoc = $currentDocument;
        if (!latestDoc) {
          console.error("LOAD ERROR: Current document is null");
          return reject(new Error("Current document is null"));
        }
        
        // Find the page to load in the latest document
        const pageToLoad = latestDoc.pages.find(p => p.id === pageId);
        
        console.log(`LOAD PHASE: Page to load:`, pageId, pageToLoad ? 'found' : 'not found');
        
        if (!pageToLoad) {
          console.error(`LOAD ERROR: Page ${pageId} not found in document`);
          return reject(new Error(`Page ${pageId} not found in document`));
        }
        
        console.log(`+----------------------------------+`);
        console.log(`| LOAD PHASE: LOADING PAGE ${pageId} |`);
        console.log(`+----------------------------------+`);
        
        // Clear canvas and prepare
        console.log("LOAD PHASE: Clearing canvas and preparing");
        canvas.clear();
        canvas.backgroundColor = 'white';
        
        // Force a render to ensure canvas is totally clean
        canvas.requestRenderAll();
        canvas.renderAll();
        
        // Log detailed info about the page we're about to load
        console.log("LOAD PHASE: Page data details:", {
          pageId: pageToLoad.id,
          hasCanvasData: !!pageToLoad.canvasJSON,
          dataType: pageToLoad.canvasJSON ? typeof pageToLoad.canvasJSON : 'null',
          dataLength: pageToLoad.canvasJSON ? 
            (typeof pageToLoad.canvasJSON === 'string' ? 
              pageToLoad.canvasJSON.length : 
              JSON.stringify(pageToLoad.canvasJSON).length) : 0,
          hasMasterPage: !!pageToLoad.masterPageId,
          masterId: pageToLoad.masterPageId
        });
      
      // SUPER CRITICAL FIX: Force load latest data from IndexedDB
  // This ensures we're working with the absolute latest data
  const loadedDoc = await loadDocumentFromIndexedDB($currentDocument.id);
  
  console.log("FORCED DB LOAD:", {
    hasDocument: !!loadedDoc,
    pageCount: loadedDoc ? loadedDoc.pages.length : 0
  });
  
  // Use data directly from IndexedDB for maximum reliability
  const dbPage = loadedDoc ? loadedDoc.pages.find(p => p.id === pageId) : null;
  console.log("DB PAGE CHECK:", {
    originalLength: pageToLoad.canvasJSON ? pageToLoad.canvasJSON.length : 0,
    dbLength: dbPage && dbPage.canvasJSON ? dbPage.canvasJSON.length : 0,
    originalHasData: !!pageToLoad.canvasJSON,
    dbHasData: !!(dbPage && dbPage.canvasJSON)
  });
  
  // Always use the DB data if available
  const pageData = dbPage || pageToLoad;
      
      // RADICAL NEW APPROACH: Use our custom manual object creation
      if (pageData.canvasJSON) {
        try {
          console.log("RADICAL APPROACH: Loading latest canvas content for page:", pageId);
          
          // First clear the canvas completely
          canvas.clear();
          canvas.backgroundColor = 'white';
          
          // Parse JSON if it's a string (from IndexedDB storage)
          const jsonData = typeof pageData.canvasJSON === 'string'
            ? JSON.parse(pageData.canvasJSON)
            : pageData.canvasJSON;
          
          const objectCount = jsonData.objects ? jsonData.objects.length : 0;
          console.log(`JSON data parsed, contains ${objectCount} objects`);
          
          // Set the canvas background
          canvas.backgroundColor = jsonData.background || 'white';
          
          // Handle empty canvas case
          if (objectCount === 0) {
            console.log("Canvas is empty, only setting background");
            canvas.requestRenderAll();
            canvas.renderAll();
          } else {
            console.log(`RADICAL APPROACH: Creating ${objectCount} objects manually...`);
            console.log("Object types:", jsonData.objects.map(obj => obj.type).join(', '));
            
            // Use our custom function to create objects manually
            const createdObjects = createObjectsManually(jsonData.objects);
            
            console.log(`Created ${createdObjects.length}/${objectCount} objects`);
            
            // Add all created objects to the canvas
            createdObjects.forEach(obj => {
              // Set essential properties
              obj.visible = true;
              obj.evented = true;
              obj.selectable = $activeTool === ToolType.SELECT;
              
              // Different handling for master page objects
              if (obj.fromMaster) {
                obj.selectable = false;
                obj.hoverCursor = 'not-allowed';
              }
              
              // Add to canvas
              canvas.add(obj);
            });
            
            // Log what we've loaded
            const finalObjects = canvas.getObjects();
            console.log(`Canvas now has ${finalObjects.length} objects after load`);
            
            // Force visibility check and render
            finalObjects.forEach(obj => {
              if (!obj.visible) {
                console.log(`Object of type ${obj.type} was not visible, forcing visibility`);
                obj.visible = true;
              }
              
              if (obj.opacity === 0) {
                console.log(`Object of type ${obj.type} had 0 opacity, setting to 1`);
                obj.opacity = 1;
              }
            });
          }
          
          // Force multiple renders with delays to ensure all objects become visible
          canvas.requestRenderAll();
          canvas.renderAll();
          
          // Delayed render for better assurance
          console.log("Scheduling delayed render...");
          setTimeout(() => {
            console.log("Executing first delayed render");
            canvas.requestRenderAll();
            canvas.renderAll();
            
            // Second delayed render
            setTimeout(() => {
              console.log("Executing second delayed render");
              canvas.getObjects().forEach(obj => {
                obj.visible = true;
                obj.opacity = obj.opacity < 0.1 ? 1 : obj.opacity;
              });
              canvas.requestRenderAll();
              canvas.renderAll();
            }, 100);
          }, 100);
        } catch (err) {
          console.error('Error with RADICAL approach:', err);
          
          // Continue with a blank canvas if something fails
          canvas.clear();
          canvas.backgroundColor = 'white';
          canvas.renderAll();
        }
      } else {
        console.log("No canvas data to load, starting with empty canvas");
      }
      
      // Apply master page if specified (after a short delay)
      setTimeout(() => {
        if (pageToLoad.masterPageId) {
          console.log("LOAD PHASE: Applying master page:", pageToLoad.masterPageId);
          applyMasterPage(pageToLoad.masterPageId, pageToLoad.overrides || {});
        }
        
        // Force final render
        setTimeout(() => {
          // Final verification of object visibility
          const objects = canvas.getObjects();
          console.log(`LOAD PHASE: Final check: ${objects.length} objects on canvas`);
          
          objects.forEach(obj => {
            obj.visible = true;
            obj.evented = true;
            obj.selectable = $activeTool === ToolType.SELECT;
          });
          
          canvas.requestRenderAll();
          canvas.renderAll();
          
          // Resolve the promise to indicate that loading is complete
          console.log(`LOAD PHASE: Page ${pageId} loading complete with ${objects.length} objects`);
          resolve(true);
        }, 100);
      }, 100);
      
      } catch (err) {
        console.error(`LOAD ERROR: Failed to load page ${pageId}:`, err);
        reject(err);
      }
    }); // End of promise
  }
  
  function saveCurrentPage() {
    if (!canvas) {
      console.warn("Cannot save page: Canvas is not initialized");
      return;
    }
    
    if (!$currentPage) {
      console.warn("Cannot save page: No current page");
      return;
    }
    
    if (!$currentDocument) {
      console.warn("Cannot save page: No current document");
      return;
    }
    
    // Get the index of the page to save
    let pageIndexToSave = $currentDocument.pages.findIndex(p => p.id === $currentPage);
    if (pageIndexToSave < 0) {
      console.warn(`Cannot save page: Page ${$currentPage} not found in document`);
      return;
    }
    
    try {
      console.log(`Saving page ${$currentPage} (index ${pageIndexToSave})`);
      
      // Double-check the page ID
      if ($currentDocument.pages[pageIndexToSave].id !== $currentPage) {
        console.error(`CRITICAL ERROR: Page ID mismatch! Expected ${$currentPage} but found ${$currentDocument.pages[pageIndexToSave].id}`);
        
        // Try to find the correct page again
        const doubleCheckIndex = $currentDocument.pages.findIndex(p => p.id === $currentPage);
        if (doubleCheckIndex >= 0) {
          console.log(`Corrected page index from ${pageIndexToSave} to ${doubleCheckIndex}`);
          pageIndexToSave = doubleCheckIndex;
        } else {
          console.error(`Cannot find page ${$currentPage} in document, aborting save!`);
          return;
        }
      }
      
      // CRITICAL: Capture canvas objects BEFORE any other operations
      const initialCanvasObjects = [...canvas.getObjects()];
      const objectCount = initialCanvasObjects.length;
      
      console.log(`Found ${objectCount} objects to save on the canvas`);
      
      // Exit early if the canvas is already empty
      if (objectCount === 0) {
        console.log("Canvas is empty, saving minimal state");
        
        // Create a minimal canvas representation
        const emptyCanvasJSON = JSON.stringify({
          "version": "4.6.0",
          "objects": [],
          "background": "white"
        });
        
        // Update document with empty canvas
        const updatedPages = [...$currentDocument.pages];
        updatedPages[pageIndexToSave] = {
          ...updatedPages[pageIndexToSave],
          canvasJSON: emptyCanvasJSON,
          masterPageId: updatedPages[pageIndexToSave].masterPageId,
          overrides: updatedPages[pageIndexToSave].overrides || {}
        };
        
        // Update the store
        currentDocument.update(doc => ({
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        }));
        
        console.log(`Empty page ${$currentPage} saved successfully`);
        return;
      }
      
      // Debug what objects we're saving
      console.log("Object types being saved:", initialCanvasObjects.map(obj => obj.type));
      
      // Special check for new objects without IDs
      initialCanvasObjects.forEach(obj => {
        if (!obj.id) {
          console.log("Adding missing ID to object:", obj.type);
          obj.id = generateId();
        }
      });
      
      // Serialize canvas with custom properties
      const canvasData = canvas.toJSON([
        'id', 
        'linkedObjectIds', 
        'fromMaster', 
        'masterId', 
        'masterObjectId', 
        'overridable'
      ]);
      
      // Verify objects in the JSON match what we expect
      const jsonObjectCount = canvasData.objects ? canvasData.objects.length : 0;
      console.log(`JSON has ${jsonObjectCount} objects (expected ${objectCount})`);
      
      if (jsonObjectCount !== objectCount) {
        console.warn("WARNING: Object count mismatch between canvas and JSON!");
      }
      
      // Stringify with indentation for debugging
      const canvasJSON = JSON.stringify(canvasData);
      console.log(`Serialized canvas JSON length: ${canvasJSON.length} characters`);
      
      // Check for empty/corrupt JSON
      if (canvasJSON.length < 50) {
        console.warn("WARNING: Canvas JSON is suspiciously small, might be empty:", canvasJSON);
      }
      
      // Create updated page object
      const updatedPages = [...$currentDocument.pages];
      const updatedPage = {
        ...updatedPages[pageIndexToSave],
        canvasJSON: canvasJSON,
        masterPageId: updatedPages[pageIndexToSave].masterPageId,
        overrides: updatedPages[pageIndexToSave].overrides || {}
      };
      
      // Final verification before saving
      if (!updatedPage.canvasJSON || updatedPage.canvasJSON.length < 50) {
        console.error("CRITICAL ERROR: About to save empty/invalid JSON. Forcing valid JSON.");
        
        // Create a direct JSON representation of the objects
        const directJSON = {
          "version": "4.6.0",
          "objects": initialCanvasObjects.map(obj => obj.toJSON([
            'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
          ])),
          "background": "white"
        };
        
        // Use this as a fallback
        updatedPage.canvasJSON = JSON.stringify(directJSON);
      }
      
      // Log the final state
      console.log(`Updated page canvasJSON length: ${updatedPage.canvasJSON.length}`);
      console.log(`JSON objects: ${JSON.parse(updatedPage.canvasJSON).objects.length}`);
      
      // Update page in the array
      updatedPages[pageIndexToSave] = updatedPage;
      
      console.log(`Updating document with saved page ${$currentPage}`);
      
      // Update the store with the new pages
      currentDocument.update(doc => {
        const updatedDoc = {
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        };
        
        // Verify the update worked
        const verifyPageIndex = updatedDoc.pages.findIndex(p => p.id === $currentPage);
        if (verifyPageIndex >= 0) {
          const verifyPage = updatedDoc.pages[verifyPageIndex];
          console.log(`Verification: Page ${verifyPage.id} has canvasJSON of length ${verifyPage.canvasJSON ? verifyPage.canvasJSON.length : 0}`);
          
          try {
            const jsonData = JSON.parse(verifyPage.canvasJSON);
            console.log(`Verification: JSON contains ${jsonData.objects.length} objects`);
          } catch (err) {
            console.error("Verification: Failed to parse JSON:", err);
          }
        }
        
        return updatedDoc;
      });
      
      console.log(`Page ${$currentPage} saved successfully with ${objectCount} objects`);
    } catch (err) {
      console.error(`Error saving page ${$currentPage}:`, err);
    }
  }
  
  // Tool-related functions
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
  
  function handleMouseDown(options) {
    if (!canvas) return;
    
    const pointer = canvas.getPointer(options.e);
    isDrawing = true;
    
    switch ($activeTool) {
      case ToolType.SELECT:
        // Selection is handled by Fabric.js automatically
        break;
        
      case ToolType.TEXT:
        // Add a new text object at the click position
        if (!options.target) {
          const textOptions = $currentToolOptions;
          const text = new fabric.Textbox('Edit this text', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: textOptions.fontFamily,
            fontSize: textOptions.fontSize,
            fontStyle: textOptions.fontStyle,
            fontWeight: textOptions.fontWeight,
            textAlign: textOptions.textAlign,
            width: 200,
            fill: '#000000',
            editable: true,
            id: generateId(), // Add unique ID for text flow
            linkedObjectIds: [] // Initialize linked objects array
          });
          
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          isDrawing = false;
          
          // Add text to TextFlow manager
          if (textFlow) {
            // We'll hook up events when textboxes are linked
            text.on('modified', () => updateTextFlow(text));
            text.on('changed', () => updateTextFlow(text));
          }
        }
        break;
        
      case ToolType.IMAGE:
        // Open file dialog when the canvas is clicked
        if (imageInput && !options.target) {
          imageInput.click();
          isDrawing = false;
        }
        break;
        
      case ToolType.RECTANGLE:
        // Start drawing a rectangle
        const rectOptions = $currentToolOptions;
        drawingObject = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: rectOptions.fill,
          stroke: rectOptions.stroke,
          strokeWidth: rectOptions.strokeWidth,
          rx: rectOptions.cornerRadius,
          ry: rectOptions.cornerRadius,
          selectable: false,
          evented: true  // Keep evented true for visibility
        });
        canvas.add(drawingObject);
        break;
        
      case ToolType.ELLIPSE:
        // Start drawing an ellipse
        const ellipseOptions = $currentToolOptions;
        drawingObject = new fabric.Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 0,
          ry: 0,
          fill: ellipseOptions.fill,
          stroke: ellipseOptions.stroke,
          strokeWidth: ellipseOptions.strokeWidth,
          selectable: false,
          evented: true  // Keep evented true for visibility
        });
        canvas.add(drawingObject);
        break;
        
      case ToolType.LINE:
        // Start drawing a line
        const lineOptions = $currentToolOptions;
        drawingObject = new fabric.Line(
          [pointer.x, pointer.y, pointer.x, pointer.y], 
          {
            stroke: lineOptions.stroke,
            strokeWidth: lineOptions.strokeWidth,
            selectable: false,
            evented: true  // Keep evented true for visibility
          }
        );
        canvas.add(drawingObject);
        break;
    }
  }
  
  function handleMouseMove(options) {
    if (!isDrawing || !drawingObject) return;
    
    const pointer = canvas.getPointer(options.e);
    
    switch ($activeTool) {
      case ToolType.RECTANGLE:
        // Update rectangle dimensions
        const width = Math.abs(pointer.x - drawingObject.left);
        const height = Math.abs(pointer.y - drawingObject.top);
        
        // Adjust position if drawing from bottom-right to top-left
        if (pointer.x < drawingObject.left) {
          drawingObject.set({ left: pointer.x });
        }
        if (pointer.y < drawingObject.top) {
          drawingObject.set({ top: pointer.y });
        }
        
        drawingObject.set({
          width: width,
          height: height
        });
        break;
        
      case ToolType.ELLIPSE:
        // Update ellipse dimensions
        const rx = Math.abs(pointer.x - drawingObject.left) / 2;
        const ry = Math.abs(pointer.y - drawingObject.top) / 2;
        
        // Adjust position to keep center of ellipse fixed
        const centerX = drawingObject.left + rx;
        const centerY = drawingObject.top + ry;
        
        drawingObject.set({
          rx: rx,
          ry: ry,
          left: centerX - rx,
          top: centerY - ry
        });
        break;
        
      case ToolType.LINE:
        // Update line end point
        drawingObject.set({
          x2: pointer.x,
          y2: pointer.y
        });
        break;
    }
    
    canvas.renderAll();
  }
  
  function handleMouseUp() {
    isDrawing = false;
    
    if (drawingObject) {
      // Make the drawn object properly set for interactivity
      drawingObject.set({
        selectable: $activeTool === ToolType.SELECT, // Only selectable in SELECT mode
        evented: true, // Always evented to ensure visibility
        hoverCursor: $activeTool === ToolType.SELECT ? 'move' : 'default'
      });
      
      // Clean up tiny objects (likely accidental clicks)
      if ($activeTool === ToolType.RECTANGLE || $activeTool === ToolType.ELLIPSE) {
        if (drawingObject.width < 5 && drawingObject.height < 5) {
          canvas.remove(drawingObject);
        }
      } else if ($activeTool === ToolType.LINE) {
        const dx = drawingObject.x2 - drawingObject.x1;
        const dy = drawingObject.y2 - drawingObject.y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
          canvas.remove(drawingObject);
        }
      }
      
      drawingObject = null;
      // Request a complete render cycle
      canvas.requestRenderAll();
      canvas.renderAll();
    }
  }
  
  function handleImageUpload(event) {
    if (!event.target.files || !event.target.files[0]) return;
    
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const imgSrc = e.target.result;
      
      // Create a temporary image to get dimensions
      const img = new Image();
      img.onload = function() {
        const imageOptions = $currentToolOptions;
        
        console.log("Image loaded, creating Fabric image object");
        
        // Create fabric image object with better error handling
        try {
          fabric.Image.fromURL(imgSrc, function(fabricImg) {
            if (!fabricImg) {
              console.error("Failed to create Fabric image - null object returned");
              return;
            }
            
            // Scale down very large images to fit canvas better
            const maxDimension = Math.max(img.width, img.height);
            let scale = 1;
            
            if (maxDimension > 1000) {
              scale = 1000 / maxDimension;
            }
            
            // Ensure required properties are set for visibility
            fabricImg.set({
              left: (canvas.width - img.width * scale) / 2,
              top: (canvas.height - img.height * scale) / 2,
              scaleX: scale,
              scaleY: scale,
              visible: true,
              evented: true,
              selectable: true,
              id: generateId(),
              opacity: 1
            });
            
            // If not preserving aspect ratio, make controls to allow separate scaling
            if (!imageOptions.preserveAspectRatio) {
              fabricImg.setControlsVisibility({
                mt: true, // middle top
                mb: true, // middle bottom
                ml: true, // middle left
                mr: true  // middle right
              });
            }
            
            console.log("Adding image to canvas");
            canvas.add(fabricImg);
            
            // Ensure object is still visible after adding
            fabricImg.visible = true;
            fabricImg.opacity = 1;
            
            canvas.setActiveObject(fabricImg);
            
            // Ensure multiple renders to force visibility
            canvas.requestRenderAll();
            canvas.renderAll();
            
            // Secondary render cycle
            setTimeout(() => {
              console.log("Secondary render cycle for image");
              fabricImg.visible = true;
              canvas.requestRenderAll();
              canvas.renderAll();
            }, 100);
            
            // Reset file input for future uploads
            event.target.value = '';
          });
        } catch (err) {
          console.error("Error creating image object:", err);
        }
      };
      
      // Setup error handling for image loading
      img.onerror = function() {
        console.error("Error loading image");
        event.target.value = '';
      };
      
      img.src = imgSrc;
    };
    
    reader.onerror = function() {
      console.error("Error reading file");
      event.target.value = '';
    };
    
    reader.readAsDataURL(file);
  }
  
  // Object transformation functions
  function rotateObject(angle) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    activeObject.rotate(activeObject.angle + angle);
    canvas.renderAll();
  }
  
  function scaleObject(scaleX, scaleY) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    activeObject.scale({
      x: activeObject.scaleX * scaleX,
      y: activeObject.scaleY * scaleY
    });
    canvas.renderAll();
  }
  
  function flipObject(direction) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    if (direction === 'horizontal') {
      activeObject.set('flipX', !activeObject.flipX);
    } else if (direction === 'vertical') {
      activeObject.set('flipY', !activeObject.flipY);
    }
    
    canvas.renderAll();
  }
  
  // Selection handling
  function handleObjectSelected(options) {
    const activeObject = canvas.getActiveObject();
    selectedObject = activeObject;
    
    // Make sure text objects have an ID for text flow
    if (activeObject && activeObject.type === 'textbox' && !activeObject.id) {
      activeObject.id = generateId();
      if (!activeObject.linkedObjectIds) {
        activeObject.linkedObjectIds = [];
      }
    }
    
    // If the selected object is from a master page, pass that info
    const isMasterObject = activeObject && activeObject.fromMaster === true;
    
    dispatch('objectselected', { 
      object: activeObject, 
      objectType: activeObject?.type,
      fromMaster: isMasterObject,
      masterId: isMasterObject ? activeObject.masterId : null,
      masterObjectId: isMasterObject ? activeObject.masterObjectId : null,
      overridable: isMasterObject ? activeObject.overridable : null
    });
  }
  
  function handleSelectionCleared() {
    selectedObject = null;
    dispatch('objectselected', { object: null, objectType: null });
  }
  
  /**
   * Handle right-click events on canvas objects
   * @param {Object} options - Fabric.js mouse event options
   */
  function handleRightClick(options) {
    options.e.preventDefault();
    
    const pointer = canvas.getPointer(options.e);
    
    if (options.target && options.target.fromMaster) {
      // Right-click on a master page object
      contextMenuX = options.e.clientX;
      contextMenuY = options.e.clientY;
      contextMenuObject = options.target;
      showContextMenu = true;
      
      // Also dispatch event for external components
      dispatch('masterObjectRightClick', {
        object: options.target,
        x: options.e.clientX,
        y: options.e.clientY
      });
    } else {
      // Hide the context menu if clicking elsewhere
      showContextMenu = false;
    }
    
    return false;
  }
  
  // Function to handle canvas container scrolling
  function handleScroll() {
    if (canvasContainer) {
      canvasScrollX = canvasContainer.scrollLeft;
      canvasScrollY = canvasContainer.scrollTop;
    }
  }
  
  // Grid rendering function
  /**
   * FÖRBÄTTRAD CSS-BASERAD GRID RENDERING
   * Istället för att lägga till grid-linjer på canvas, lägger vi ett CSS-grid ovanpå canvas
   * Använder 1px rena linjer med precise positionering för att förhindra subbpixel-problem
   */
  function renderGrid() {
    // Bail out early if not mounted or no canvas or server-side
    if (!isMounted || !canvas || typeof window === 'undefined') {
      return;
    }
    
    // Ta bort eventuella överliggande grid-element
    const existingOverlayGrid = document.getElementById('canvas-grid-overlay');
    if (existingOverlayGrid) {
      existingOverlayGrid.remove();
    }
    
    // Ta bort de gamla grid-objekten från canvas
    const existingGridLines = canvas.getObjects().filter(obj => obj.gridElement);
    existingGridLines.forEach(line => canvas.remove(line));
    
    // Kontrollera om grid är aktiverad
    if (!$currentDocument?.metadata?.grid?.enabled) {
      canvas.renderAll();
      return;
    }
    
    const { size, color, opacity, subdivisions, units = 'mm' } = $currentDocument.metadata.grid;
    
    // Beräkna grid-storlek i pixlar - VIKTIGT: använd INTEGER pixlar
    let gridSize;
    if (convertToPixels) {
      // Convert grid size from document units to pixels using our utility function
      // Math.floor istället för Math.round för att säkerställa exakt pixelpositionering
      gridSize = Math.max(10, Math.floor(convertToPixels(size, units)));
    } else {
      // Fallback conversion (same as the original)
      const pxPerMm = 3.78; // Approximate conversion at 96 DPI
      gridSize = Math.max(10, Math.floor(size * pxPerMm));
    }
    
    // Beräkna underindelningens storlek - OCKSÅ med INTEGER pixlar
    const subSize = Math.max(1, Math.floor(gridSize / subdivisions));
    
    // Hitta canvas container
    const canvasContainer = canvasElement.parentElement;
    if (!canvasContainer) {
      console.error('Could not find canvas container');
      return;
    }
    
    // Säkerställ att canvas container har rätt positionering
    canvasContainer.style.position = 'relative';
    
    // Skaffa exakta pixeldimensioner från canvas
    const canvasWidth = Math.floor(width);
    const canvasHeight = Math.floor(height);
    
    // Hämta exakt canvasElement position för perfekt justering
    const canvasRect = canvasElement.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    
    // Beräkna offset mellan canvas och container (för pixel-perfect positionering)
    const offsetLeft = canvasRect.left - containerRect.left;
    const offsetTop = canvasRect.top - containerRect.top;
    
    // Skapa CSS för grid-överlagringen med förbättrad precision
    // Använd translateZ(0) för att tvinga pixelsnapping i moderna webbläsare
    const gridOverlayCSS = `
      position: absolute;
      top: ${Math.floor(offsetTop)}px;
      left: ${Math.floor(offsetLeft)}px;
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
      pointer-events: none;
      z-index: 10;
      background-color: transparent;
      transform-origin: 0 0;
      transform: translateZ(0);
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      will-change: transform;
    `;
    
    // Skapa grid-överlagringselementet
    const gridOverlay = document.createElement('div');
    gridOverlay.id = 'canvas-grid-overlay';
    gridOverlay.style.cssText = gridOverlayCSS;
    
    // Skapa SVG-baserat grid istället för CSS background
    // SVG ger bättre kontroll över renderingen
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', canvasWidth);
    svg.setAttribute('height', canvasHeight);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    
    // Lägg till en definierad pattern för huvudgrid
    const mainPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    mainPattern.setAttribute('id', 'mainGrid');
    mainPattern.setAttribute('width', gridSize);
    mainPattern.setAttribute('height', gridSize);
    mainPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    
    // Skapa huvudgridlinjer
    const mainHorizLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    mainHorizLine.setAttribute('x1', '0');
    mainHorizLine.setAttribute('y1', '0');
    mainHorizLine.setAttribute('x2', gridSize);
    mainHorizLine.setAttribute('y2', '0');
    mainHorizLine.setAttribute('stroke', color);
    mainHorizLine.setAttribute('stroke-width', '1');
    mainHorizLine.setAttribute('stroke-opacity', opacity);
    mainPattern.appendChild(mainHorizLine);
    
    const mainVertLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    mainVertLine.setAttribute('x1', '0');
    mainVertLine.setAttribute('y1', '0');
    mainVertLine.setAttribute('x2', '0');
    mainVertLine.setAttribute('y2', gridSize);
    mainVertLine.setAttribute('stroke', color);
    mainVertLine.setAttribute('stroke-width', '1');
    mainVertLine.setAttribute('stroke-opacity', opacity);
    mainPattern.appendChild(mainVertLine);
    
    svg.appendChild(mainPattern);
    
    // Lägg till en definierad pattern för undergrid om tillämpligt
    if (subdivisions > 1 && subSize > 1) {
      const subPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      subPattern.setAttribute('id', 'subGrid');
      subPattern.setAttribute('width', subSize);
      subPattern.setAttribute('height', subSize);
      subPattern.setAttribute('patternUnits', 'userSpaceOnUse');
      
      // Skapa undergridlinjer med lägre opacitet
      const subHorizLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      subHorizLine.setAttribute('x1', '0');
      subHorizLine.setAttribute('y1', '0');
      subHorizLine.setAttribute('x2', subSize);
      subHorizLine.setAttribute('y2', '0');
      subHorizLine.setAttribute('stroke', color);
      subHorizLine.setAttribute('stroke-width', '1');
      subHorizLine.setAttribute('stroke-opacity', opacity * 0.5);
      subPattern.appendChild(subHorizLine);
      
      const subVertLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      subVertLine.setAttribute('x1', '0');
      subVertLine.setAttribute('y1', '0');
      subVertLine.setAttribute('x2', '0');
      subVertLine.setAttribute('y2', subSize);
      subVertLine.setAttribute('stroke', color);
      subVertLine.setAttribute('stroke-width', '1');
      subVertLine.setAttribute('stroke-opacity', opacity * 0.5);
      subPattern.appendChild(subVertLine);
      
      svg.appendChild(subPattern);
      
      // Lägg till en rektangel för undergrid
      const subRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      subRect.setAttribute('width', '100%');
      subRect.setAttribute('height', '100%');
      subRect.setAttribute('fill', 'url(#subGrid)');
      svg.appendChild(subRect);
    }
    
    // Lägg till en rektangel för huvudgrid
    const mainRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    mainRect.setAttribute('width', '100%');
    mainRect.setAttribute('height', '100%');
    mainRect.setAttribute('fill', 'url(#mainGrid)');
    svg.appendChild(mainRect);
    
    // Lägg till SVG till gridet
    gridOverlay.appendChild(svg);
    
    // Lägg till grid-överlagringen i canvas container
    canvasContainer.appendChild(gridOverlay);
    
    // För debugging - lägg till en synlig ram runt canvas och grid
    // för att se om de är korrekt justerade
    if (window.DEBUG_GRID_ALIGNMENT) {
      gridOverlay.style.border = '1px solid red';
      canvasElement.style.border = '1px solid blue';
      console.log('Canvas rect:', canvasRect);
      console.log('Container rect:', containerRect);
      console.log('Grid overlay CSS:', gridOverlayCSS);
    }
    
    // Rendera canvas för att se till att allt visas korrekt
    canvas.renderAll();
  }
  
  // Guide creation and management functions
  function createHorizontalGuide(position) {
    if (!canvas || !$currentDocument || !$currentPage) return;
    
    // Create the guide line on the canvas
    const guide = new fabric.Line([0, position, width, position], {
      stroke: '#0066CC',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: true,
      guide: true,
      horizontal: true,
      excludeFromExport: true,
      originalPosition: position // Store original position for updating
    });
    
    // Add guide to canvas
    canvas.add(guide);
    
    // Save guide position to document
    currentDocument.update(doc => {
      const pageIndex = doc.pages.findIndex(p => p.id === $currentPage);
      if (pageIndex >= 0) {
        const updatedPages = [...doc.pages];
        
        // Initialize guides array if it doesn't exist
        if (!updatedPages[pageIndex].guides) {
          updatedPages[pageIndex].guides = { horizontal: [], vertical: [] };
        }
        
        // Add new guide position
        updatedPages[pageIndex].guides.horizontal.push(position);
        
        return {
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        };
      }
      return doc;
    });
    
    // Add drag behavior
    makeGuideDraggable(guide);
    
    return guide;
  }
  
  function createVerticalGuide(position) {
    if (!canvas || !$currentDocument || !$currentPage) return;
    
    // Create the guide line on the canvas
    const guide = new fabric.Line([position, 0, position, height], {
      stroke: '#0066CC',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: true,
      guide: true,
      horizontal: false,
      excludeFromExport: true,
      originalPosition: position // Store original position for updating
    });
    
    // Add guide to canvas
    canvas.add(guide);
    
    // Save guide position to document
    currentDocument.update(doc => {
      const pageIndex = doc.pages.findIndex(p => p.id === $currentPage);
      if (pageIndex >= 0) {
        const updatedPages = [...doc.pages];
        
        // Initialize guides array if it doesn't exist
        if (!updatedPages[pageIndex].guides) {
          updatedPages[pageIndex].guides = { horizontal: [], vertical: [] };
        }
        
        // Add new guide position
        updatedPages[pageIndex].guides.vertical.push(position);
        
        return {
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        };
      }
      return doc;
    });
    
    // Add drag behavior
    makeGuideDraggable(guide);
    
    return guide;
  }
  
  // Make guides draggable
  function makeGuideDraggable(guide) {
    guide.on('mousedown', function(e) {
      // Skip if it's a right-click
      if (e.e.button === 2) return;
      
      e.e.stopPropagation();
      
      const isHorizontal = guide.horizontal;
      
      // Set up move handler
      const moveHandler = function(moveEvent) {
        const pointer = canvas.getPointer(moveEvent.e);
        
        if (isHorizontal) {
          guide.set({ y1: pointer.y, y2: pointer.y });
        } else {
          guide.set({ x1: pointer.x, x2: pointer.x });
        }
        
        canvas.renderAll();
      };
      
      // Set up mouseup handler
      const upHandler = function() {
        canvas.off('mouse:move', moveHandler);
        canvas.off('mouse:up', upHandler);
        
        // Update guide position in document
        const newPos = isHorizontal ? guide.y1 : guide.x1;
        updateGuidePosition(guide, newPos);
      };
      
      // Add event listeners
      canvas.on('mouse:move', moveHandler);
      canvas.on('mouse:up', upHandler);
    });
  }
  
  // Update guide position in document
  function updateGuidePosition(guide, newPosition) {
    if (!$currentDocument || !$currentPage) return;
    
    const isHorizontal = guide.horizontal;
    const oldPosition = guide.originalPosition;
    
    currentDocument.update(doc => {
      const pageIndex = doc.pages.findIndex(p => p.id === $currentPage);
      if (pageIndex >= 0) {
        const updatedPages = [...doc.pages];
        const guides = updatedPages[pageIndex].guides;
        
        if (!guides) return doc;
        
        // Find and update the guide position
        const guideArray = isHorizontal ? guides.horizontal : guides.vertical;
        const guideIndex = guideArray.indexOf(oldPosition);
        
        if (guideIndex >= 0) {
          guideArray[guideIndex] = newPosition;
          guide.originalPosition = newPosition;
        }
        
        return {
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        };
      }
      return doc;
    });
  }
  
  // Delete a guide
  function deleteGuide(index, isHorizontal) {
    if (!canvas || !$currentDocument || !$currentPage) return;
    
    // Remove from document first
    currentDocument.update(doc => {
      const pageIndex = doc.pages.findIndex(p => p.id === $currentPage);
      if (pageIndex >= 0) {
        const updatedPages = [...doc.pages];
        const guides = updatedPages[pageIndex].guides;
        
        if (!guides) return doc;
        
        // Get the guide array and position
        const guideArray = isHorizontal ? guides.horizontal : guides.vertical;
        
        if (index >= 0 && index < guideArray.length) {
          // Remove the guide position
          guideArray.splice(index, 1);
          
          // Now remove from canvas
          const guidesToRemove = canvas.getObjects().filter(obj => 
            obj.guide && obj.horizontal === isHorizontal
          );
          
          if (index < guidesToRemove.length) {
            canvas.remove(guidesToRemove[index]);
          }
        }
        
        return {
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        };
      }
      return doc;
    });
  }
  
  // Load guides for current page
  function loadGuides() {
    if (!canvas || !$currentDocument || !$currentPage) return;
    
    // Clear existing guides
    const existingGuides = canvas.getObjects().filter(obj => obj.guide);
    existingGuides.forEach(guide => canvas.remove(guide));
    
    // Find current page
    const currentPageObj = $currentDocument.pages.find(p => p.id === $currentPage);
    if (!currentPageObj || !currentPageObj.guides) return;
    
    // Create horizontal guides
    if (currentPageObj.guides.horizontal && Array.isArray(currentPageObj.guides.horizontal)) {
      currentPageObj.guides.horizontal.forEach(yPos => {
        createHorizontalGuide(yPos);
      });
    }
    
    // Create vertical guides
    if (currentPageObj.guides.vertical && Array.isArray(currentPageObj.guides.vertical)) {
      currentPageObj.guides.vertical.forEach(xPos => {
        createVerticalGuide(xPos);
      });
    }
  }
  
  // Handler for ruler events
  function handleCreateGuide(event) {
    const { position, isHorizontal } = event.detail;
    if (isHorizontal) {
      createHorizontalGuide(position);
    } else {
      createVerticalGuide(position);
    }
  }
  
  function handleUpdateGuide(event) {
    // This would be used for live updating during drag
    // Implementation depends on how you want to handle visual updates
  }
  
  function handleDeleteGuide(event) {
    const { index, isHorizontal } = event.detail;
    deleteGuide(index, isHorizontal);
  }
  
  /**
   * Handle double-click events on canvas objects
   * @param {Object} options - Fabric.js mouse event options
   */
  function handleDoubleClick(options) {
    if (options.target && options.target.fromMaster && options.target.overridable) {
      // Double-click on an overridable master page object - auto-override it
      overrideMasterObject(options.target);
    }
  }
  
  /**
   * Handle context menu override action
   * @param {Object} event - Event object containing the target object
   */
  function handleContextMenuOverride(event) {
    const { object } = event.detail;
    if (object && object.fromMaster && object.overridable) {
      overrideMasterObject(object);
    }
  }
  
  /**
   * Handle context menu edit master action
   * @param {Object} event - Event object containing the master ID
   */
  function handleContextMenuEditMaster(event) {
    const { masterId } = event.detail;
    if (masterId) {
      dispatch('editMasterPage', { masterPageId: masterId });
    }
  }
  
  // Function to handle textflow when text object content changes
  function updateTextFlow(textObject) {
    if (!textObject || !textFlow) return;
    
    // If the textbox has linked objects, update the text flow
    if (textObject.linkedObjectIds && textObject.linkedObjectIds.length > 0) {
      textFlow.updateTextFlow(textObject.id);
      canvas.renderAll();
    }
  }
  
  // Export functions that will be updated once canvas is initialized
  export let bringForward;
  export let sendBackward;
  export let bringToFront;
  export let sendToBack;
  export let copySelectedObjects;
  export let cutSelectedObjects;
  export let pasteObjects;
  
  // Export undo/redo functions
  export function undo() {
    if (historyManager && historyManager.canUndo()) {
      historyManager.undo();
    }
  }
  
  export function redo() {
    if (historyManager && historyManager.canRedo()) {
      historyManager.redo();
    }
  }
  
  /**
   * Apply a master page to the current canvas
   * @param {string} masterPageId - ID of the master page to apply
   * @param {Object} overrides - Map of overridden master objects
   */
  function applyMasterPage(masterPageId, overrides = {}) {
    if (!canvas || !$currentDocument) return;
    
    // Find the master page
    const masterPage = $currentDocument.masterPages.find(mp => mp.id === masterPageId);
    if (!masterPage || !masterPage.canvasJSON) return;
    
    try {
      // Parse JSON if it's a string
      const jsonData = typeof masterPage.canvasJSON === 'string'
        ? JSON.parse(masterPage.canvasJSON)
        : masterPage.canvasJSON;
        
      // Keep track of current objects
      const currentObjects = canvas.getObjects();
      const currentObjectsMap = {};
      
      // Map current objects by their IDs for later reference
      currentObjects.forEach(obj => {
        if (obj.id) {
          currentObjectsMap[obj.id] = obj;
        }
      });
      
      // Process master page objects
      if (jsonData && jsonData.objects && Array.isArray(jsonData.objects)) {
        // For better reliability, gather all objects to enliven at once
        const objectsToEnliven = [];
        
        jsonData.objects.forEach(objData => {
          // Skip objects that are overridden
          if (objData.masterObjectId && overrides[objData.masterObjectId]) {
            return;
          }
          objectsToEnliven.push(objData);
        });
        
        if (objectsToEnliven.length > 0) {
          console.log(`Enlivening ${objectsToEnliven.length} master page objects`);
          // Batch enliven all objects at once for better performance
          try {
            fabric.util.enlivenObjects(objectsToEnliven, (objects) => {
              console.log(`Successfully enlivened ${objects.length} master objects`);
              
              objects.forEach((fabricObj, index) => {
                if (!fabricObj) {
                  console.error("Failed to enliven object at index", index);
                  return;
                }
                
                // Get original data to check masterObjectId
                const origData = objectsToEnliven[index];
                
                // Mark as from master page
                fabricObj.fromMaster = true;
                fabricObj.masterId = masterPageId;
                fabricObj.masterObjectId = origData.masterObjectId || 
                  `master-obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                fabricObj.overridable = origData.overridable !== false; // Default to true
                
                // Special settings for master objects
                fabricObj.selectable = false;
                fabricObj.evented = true; // Allow events for context menu
                fabricObj.hoverCursor = 'not-allowed';
                fabricObj.visible = true; // Ensure visibility
                
                // Add a subtle visual difference to master objects
                fabricObj.opacity = fabricObj.opacity || 1;
                
                // Add to canvas
                canvas.add(fabricObj);
                
                // Make sure master objects are rendered behind regular objects
                fabricObj.moveTo(0);
              });
              
              // Force a render after all objects are added
              canvas.requestRenderAll();
              canvas.renderAll();
            });
          } catch (error) {
            console.error("Error enlivening master page objects:", error);
            
            // Fallback to manual object creation if enlivenObjects fails
            objectsToEnliven.forEach(objData => {
              try {
                // Create objects manually based on type
                let fabricObj = null;
                
                switch(objData.type) {
                  case 'textbox':
                    fabricObj = new fabric.Textbox(objData.text || 'Text', {
                      left: objData.left || 0,
                      top: objData.top || 0,
                      width: objData.width || 200,
                      fontFamily: objData.fontFamily || 'Arial',
                      fontSize: objData.fontSize || 16,
                      fill: objData.fill || '#000',
                      angle: objData.angle || 0,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1
                    });
                    break;
                    
                  case 'rect':
                    fabricObj = new fabric.Rect({
                      left: objData.left || 0,
                      top: objData.top || 0,
                      width: objData.width || 50,
                      height: objData.height || 50,
                      fill: objData.fill || '#ccc',
                      stroke: objData.stroke,
                      strokeWidth: objData.strokeWidth,
                      angle: objData.angle || 0,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1
                    });
                    break;
                    
                  case 'ellipse':
                    fabricObj = new fabric.Ellipse({
                      left: objData.left || 0,
                      top: objData.top || 0,
                      rx: objData.rx || 25,
                      ry: objData.ry || 25,
                      fill: objData.fill || '#ccc',
                      stroke: objData.stroke,
                      strokeWidth: objData.strokeWidth,
                      angle: objData.angle || 0,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1
                    });
                    break;
                    
                  case 'line':
                    fabricObj = new fabric.Line(
                      [objData.x1 || 0, objData.y1 || 0, objData.x2 || 50, objData.y2 || 50],
                      {
                        left: objData.left || 0,
                        top: objData.top || 0,
                        stroke: objData.stroke || '#000',
                        strokeWidth: objData.strokeWidth || 1,
                        angle: objData.angle || 0,
                        scaleX: objData.scaleX || 1,
                        scaleY: objData.scaleY || 1
                      }
                    );
                    break;
                }
                
                if (fabricObj) {
                  // Add master page properties
                  fabricObj.fromMaster = true;
                  fabricObj.masterId = masterPageId;
                  fabricObj.masterObjectId = objData.masterObjectId || 
                    `master-obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  fabricObj.overridable = objData.overridable !== false;
                  fabricObj.selectable = false;
                  fabricObj.evented = true;
                  fabricObj.hoverCursor = 'not-allowed';
                  fabricObj.visible = true;
                  fabricObj.opacity = objData.opacity || 1;
                  
                  // Add to canvas
                  canvas.add(fabricObj);
                  fabricObj.moveTo(0);
                }
              } catch (objError) {
                console.error("Error creating fallback object:", objError);
              }
            });
            
            canvas.requestRenderAll();
            canvas.renderAll();
          }
        }
      }
      
      canvas.renderAll();
    } catch (err) {
      console.error('Error applying master page:', err);
    }
  }
  
  /**
   * Override a master page object
   * @param {Object} masterObject - The master object to override
   */
  export function overrideMasterObject(masterObject) {
    if (!canvas || !masterObject || !masterObject.fromMaster || !masterObject.masterObjectId) return;
    
    try {
      console.log(`Overriding master object: ${masterObject.type}, ID: ${masterObject.masterObjectId}`);
      
      // Clone the master object without master-specific properties
      // Use our own cloning method to ensure compatibility with latest Fabric.js
      let clone;
      
      // Handle cloning differently based on object type
      switch (masterObject.type) {
        case 'textbox':
          clone = new fabric.Textbox(masterObject.text || 'Text', {
            left: masterObject.left,
            top: masterObject.top,
            width: masterObject.width,
            fontFamily: masterObject.fontFamily,
            fontSize: masterObject.fontSize,
            fontStyle: masterObject.fontStyle,
            fontWeight: masterObject.fontWeight,
            textAlign: masterObject.textAlign,
            fill: masterObject.fill,
            angle: masterObject.angle,
            scaleX: masterObject.scaleX,
            scaleY: masterObject.scaleY
          });
          break;
          
        case 'rect':
          clone = new fabric.Rect({
            left: masterObject.left,
            top: masterObject.top,
            width: masterObject.width,
            height: masterObject.height,
            fill: masterObject.fill,
            stroke: masterObject.stroke,
            strokeWidth: masterObject.strokeWidth,
            rx: masterObject.rx,
            ry: masterObject.ry,
            angle: masterObject.angle,
            scaleX: masterObject.scaleX,
            scaleY: masterObject.scaleY
          });
          break;
          
        case 'ellipse':
          clone = new fabric.Ellipse({
            left: masterObject.left,
            top: masterObject.top,
            rx: masterObject.rx,
            ry: masterObject.ry,
            fill: masterObject.fill,
            stroke: masterObject.stroke,
            strokeWidth: masterObject.strokeWidth,
            angle: masterObject.angle,
            scaleX: masterObject.scaleX,
            scaleY: masterObject.scaleY
          });
          break;
          
        case 'line':
          clone = new fabric.Line(
            [masterObject.x1, masterObject.y1, masterObject.x2, masterObject.y2],
            {
              left: masterObject.left,
              top: masterObject.top,
              stroke: masterObject.stroke,
              strokeWidth: masterObject.strokeWidth,
              angle: masterObject.angle,
              scaleX: masterObject.scaleX,
              scaleY: masterObject.scaleY
            }
          );
          break;
          
        default:
          // For other object types, try standard cloning
          try {
            clone = fabric.util.object.clone(masterObject);
          } catch (cloneErr) {
            console.error("Error cloning master object:", cloneErr);
            
            // Fallback to creating a rectangle placeholder
            clone = new fabric.Rect({
              left: masterObject.left || 100,
              top: masterObject.top || 100,
              width: masterObject.width || 100,
              height: masterObject.height || 50,
              fill: '#f0f0f0',
              stroke: '#ff0000',
              strokeDashArray: [5, 5],
              rx: 5,
              ry: 5
            });
          }
          break;
      }
      
      // Generate a new unique ID for the clone
      clone.id = `override-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Remove master-specific properties
      clone.fromMaster = false;
      clone.masterId = undefined;
      clone.masterObjectId = undefined;
      clone.overridable = undefined;
      
      // Make selectable and interactive
      clone.selectable = $activeTool === ToolType.SELECT;
      clone.evented = true;
      clone.hoverCursor = 'move';
      clone.visible = true;
      
      // Restore full opacity
      clone.opacity = 1;
      
      // For text objects, ensure they have proper event handlers
      if (clone.type === 'textbox') {
        if (!clone.linkedObjectIds) clone.linkedObjectIds = [];
        clone.on('modified', () => updateTextFlow(clone));
        clone.on('changed', () => updateTextFlow(clone));
      }
      
      console.log("Adding cloned object to canvas");
      
      // Add to canvas
      canvas.add(clone);
      
      // Remove the master object
      canvas.remove(masterObject);
      
      // Mark as overridden in the current page
      if ($currentPage && $currentDocument) {
        const pageIndex = $currentDocument.pages.findIndex(p => p.id === $currentPage);
        if (pageIndex >= 0) {
          const updatedPages = [...$currentDocument.pages];
          if (!updatedPages[pageIndex].overrides) {
            updatedPages[pageIndex].overrides = {};
          }
          
          updatedPages[pageIndex].overrides[masterObject.masterObjectId] = true;
          
          currentDocument.update(doc => ({
            ...doc,
            pages: updatedPages,
            lastModified: new Date()
          }));
        }
      }
      
      // Ensure visibility
      canvas.setActiveObject(clone);
      canvas.requestRenderAll();
      canvas.renderAll();
      
      return clone;
    } catch (err) {
      console.error("Error overriding master object:", err);
      return null;
    }
  }
  
  // Export functions for external components
  export function getCanvas() {
    return canvas;
  }
  
  export function getSelectedObject() {
    return selectedObject;
  }
  
  export function getTextFlow() {
    return textFlow;
  }
  
  /**
   * Special recovery function to recreate objects from JSON when they're missing from canvas
   * @param {string} pageJson - The JSON string containing object data
   * @returns {number} Number of objects recreated
   */
  export function recoverObjectsFromJson(pageJson) {
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
      
      // Track how many objects we successfully created
      let createdCount = 0;
      
      // Create each object
      jsonData.objects.forEach((objData, index) => {
        let fabricObj = null;
        
        try {
          // Determine object type
          const objType = (objData.type || "").toLowerCase();
          console.log(`RECOVERY: Creating object #${index} of type ${objType}`);
          
          // Create appropriate object based on type
          switch (objType) {
            case 'textbox':
              fabricObj = new fabric.Textbox(objData.text || 'Text', {
                left: objData.left || 100,
                top: objData.top || 100,
                width: objData.width || 200,
                fontFamily: objData.fontFamily || 'Arial',
                fontSize: objData.fontSize || 16,
                fontWeight: objData.fontWeight || 'normal',
                fontStyle: objData.fontStyle || 'normal',
                textAlign: objData.textAlign || 'left',
                fill: objData.fill || '#000000',
                id: objData.id || generateId(),
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                visible: true,
                evented: true,
                selectable: true,
                opacity: 1
              });
              break;
              
            case 'rect':
              fabricObj = new fabric.Rect({
                left: objData.left || 100,
                top: objData.top || 100,
                width: objData.width || 100,
                height: objData.height || 100,
                fill: objData.fill || '#cccccc',
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                id: objData.id || generateId(),
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                visible: true,
                evented: true,
                selectable: true,
                opacity: 1
              });
              break;
              
            case 'ellipse':
              fabricObj = new fabric.Ellipse({
                left: objData.left || 100,
                top: objData.top || 100,
                rx: objData.rx || 50,
                ry: objData.ry || 50,
                fill: objData.fill || '#cccccc',
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                id: objData.id || generateId(),
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                visible: true,
                evented: true,
                selectable: true,
                opacity: 1
              });
              break;
              
            case 'line':
              fabricObj = new fabric.Line([
                objData.x1 || 0, 
                objData.y1 || 0, 
                objData.x2 || 100, 
                objData.y2 || 100
              ], {
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                id: objData.id || generateId(),
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                visible: true,
                evented: true, 
                selectable: true,
                opacity: 1
              });
              break;
              
            default:
              console.log(`RECOVERY: Unsupported object type: ${objType}`);
              return; // Skip this object
          }
          
          // If object created successfully, add it to canvas
          if (fabricObj) {
            canvas.add(fabricObj);
            createdCount++;
          }
        } catch (err) {
          console.error(`RECOVERY: Error creating object #${index}:`, err);
        }
      });
      
      // Multiple force renders
      canvas.requestRenderAll();
      canvas.renderAll();
      
      // Delayed render for better reliability
      setTimeout(() => {
        canvas.requestRenderAll();
        canvas.renderAll();
      }, 100);
      
      console.log(`RECOVERY: Successfully recreated ${createdCount}/${objectCount} objects`);
      return createdCount;
    } catch (err) {
      console.error("RECOVERY: Failed to recover objects:", err);
      return 0;
    }
  }
  
  /**
   * Implement snap-to-grid and snap-to-guides functionality
   */
  function setupSnapping() {
    if (!canvas) return;
    
    // Object moving event
    canvas.on('object:moving', function(e) {
      const obj = e.target;
      
      // Skip snapping for master page objects
      if (obj.fromMaster && !obj.overridden) return;
      
      // Check if grid snap is enabled
      if ($currentDocument?.metadata?.grid?.snap) {
        snapToGrid(obj);
      }
      
      // Always snap to guides if they exist
      snapToGuides(obj);
      
      // Create smart guides when objects align with each other
      createSmartGuides(obj);
    });
    
    // Object scaling event
    canvas.on('object:scaling', function(e) {
      const obj = e.target;
      
      // Skip snapping for master page objects
      if (obj.fromMaster && !obj.overridden) return;
      
      // Only snap to grid during scaling if enabled
      if ($currentDocument?.metadata?.grid?.snap) {
        // Scaling snapping is more complex, as we'd need to snap all four corners
        // This simplified version snaps the object center during scaling
        const center = obj.getCenterPoint();
        snapPointToGrid(center);
        
        // Update object position based on snapped center
        obj.setPositionByOrigin(center, 'center', 'center');
      }
    });
  }
  
  /**
   * Snap an object to the grid
   * @param {Object} obj - The Fabric.js object to snap
   */
  function snapToGrid(obj) {
    // Bail out early if not mounted or server-side
    if (!isMounted || typeof window === 'undefined') return;
    
    if (!$currentDocument?.metadata?.grid || !$currentDocument.metadata.grid.snap) return;
    
    const { size, snapThreshold, units = 'mm' } = $currentDocument.metadata.grid;
    
    // Fallback till standard pixelkonvertering om convertToPixels inte är laddad än
    let gridSize;
    if (convertToPixels) {
      // Convert grid size from document units to pixels using our utility function
      gridSize = convertToPixels(size, units);
    } else {
      // Fallback conversion (same as the original)
      const pxPerMm = 3.78; // Approximate conversion at 96 DPI
      gridSize = size * pxPerMm;
    }
    
    // Get object bounds
    const objBounds = obj.getBoundingRect();
    
    // Snap center point
    const objCenter = {
      x: objBounds.left + objBounds.width / 2,
      y: objBounds.top + objBounds.height / 2
    };
    
    // Snap horizontal position
    let nearestGridX;
    
    if (snapToGridPoint) {
      // Använd utility-funktionen om tillgänglig
      nearestGridX = snapToGridPoint(objCenter.x, gridSize, snapThreshold);
    } else {
      // Fallback implementation (original code)
      const nearestX = Math.round(objCenter.x / gridSize) * gridSize;
      if (Math.abs(objCenter.x - nearestX) < snapThreshold) {
        nearestGridX = nearestX;
      } else {
        nearestGridX = null;
      }
    }
    
    if (nearestGridX !== null) {
      const deltaX = nearestGridX - objCenter.x;
      obj.left += deltaX;
      
      // Show snap indicator
      showSnapIndicator(nearestGridX, false);
    }
    
    // Snap vertical position
    let nearestGridY;
    
    if (snapToGridPoint) {
      // Använd utility-funktionen om tillgänglig
      nearestGridY = snapToGridPoint(objCenter.y, gridSize, snapThreshold);
    } else {
      // Fallback implementation (original code)
      const nearestY = Math.round(objCenter.y / gridSize) * gridSize;
      if (Math.abs(objCenter.y - nearestY) < snapThreshold) {
        nearestGridY = nearestY;
      } else {
        nearestGridY = null;
      }
    }
    
    if (nearestGridY !== null) {
      const deltaY = nearestGridY - objCenter.y;
      obj.top += deltaY;
      
      // Show snap indicator
      showSnapIndicator(nearestGridY, true);
    }
  }
  
  /**
   * Snap a point to the grid
   * @param {Object} point - The point {x,y} to snap
   * @returns {Object} The snapped point
   */
  function snapPointToGrid(point) {
    if (!$currentDocument?.metadata?.grid) return point;
    
    const { size, snapThreshold } = $currentDocument.metadata.grid;
    
    // Convert grid size from document units (mm) to pixels
    const pxPerMm = 3.78; // Approximate conversion
    const gridSize = size * pxPerMm;
    
    // Snap coordinates
    const nearestGridX = Math.round(point.x / gridSize) * gridSize;
    if (Math.abs(point.x - nearestGridX) < snapThreshold) {
      point.x = nearestGridX;
    }
    
    const nearestGridY = Math.round(point.y / gridSize) * gridSize;
    if (Math.abs(point.y - nearestGridY) < snapThreshold) {
      point.y = nearestGridY;
    }
    
    return point;
  }
  
  /**
   * Snap objects to guides
   * @param {Object} obj - The Fabric.js object to snap
   */
  function snapToGuides(obj) {
    if (!canvas || !$currentDocument || !$currentPage) return;
    
    // Get current page guides
    const currentPageObj = $currentDocument.pages.find(p => p.id === $currentPage);
    if (!currentPageObj || !currentPageObj.guides) return;
    
    const snapThreshold = $currentDocument?.metadata?.grid?.snapThreshold || 5;
    
    // Get object bounds
    const objBounds = obj.getBoundingRect();
    
    // Snap to horizontal guides
    if (currentPageObj.guides.horizontal && currentPageObj.guides.horizontal.length > 0) {
      currentPageObj.guides.horizontal.forEach(guideY => {
        // Check if object's top edge is close to the guide
        if (Math.abs(objBounds.top - guideY) < snapThreshold) {
          // Snap top edge to guide
          const delta = guideY - objBounds.top;
          obj.top += delta;
          
          // Show snap indicator
          showSnapIndicator(guideY, true);
        } 
        // Check if object's bottom edge is close to the guide
        else if (Math.abs(objBounds.top + objBounds.height - guideY) < snapThreshold) {
          // Snap bottom edge to guide
          const delta = guideY - (objBounds.top + objBounds.height);
          obj.top += delta;
          
          // Show snap indicator
          showSnapIndicator(guideY, true);
        } 
        // Check if object's center is close to the guide
        else if (Math.abs(objBounds.top + objBounds.height/2 - guideY) < snapThreshold) {
          // Snap center to guide
          const delta = guideY - (objBounds.top + objBounds.height/2);
          obj.top += delta;
          
          // Show snap indicator
          showSnapIndicator(guideY, true);
        }
      });
    }
    
    // Snap to vertical guides
    if (currentPageObj.guides.vertical && currentPageObj.guides.vertical.length > 0) {
      currentPageObj.guides.vertical.forEach(guideX => {
        // Check if object's left edge is close to the guide
        if (Math.abs(objBounds.left - guideX) < snapThreshold) {
          // Snap left edge to guide
          const delta = guideX - objBounds.left;
          obj.left += delta;
          
          // Show snap indicator
          showSnapIndicator(guideX, false);
        } 
        // Check if object's right edge is close to the guide
        else if (Math.abs(objBounds.left + objBounds.width - guideX) < snapThreshold) {
          // Snap right edge to guide
          const delta = guideX - (objBounds.left + objBounds.width);
          obj.left += delta;
          
          // Show snap indicator
          showSnapIndicator(guideX, false);
        } 
        // Check if object's center is close to the guide
        else if (Math.abs(objBounds.left + objBounds.width/2 - guideX) < snapThreshold) {
          // Snap center to guide
          const delta = guideX - (objBounds.left + objBounds.width/2);
          obj.left += delta;
          
          // Show snap indicator
          showSnapIndicator(guideX, false);
        }
      });
    }
  }
  
  /**
   * Shows a temporary visual indicator when an object snaps
   * @param {number} position - The position of the snap indicator
   * @param {boolean} isHorizontal - Whether the indicator is horizontal
   */
  function showSnapIndicator(position, isHorizontal) {
    if (!canvas) return;
    
    // Remove any existing snap indicators
    const existingIndicators = canvas.getObjects().filter(obj => obj.snapIndicator);
    existingIndicators.forEach(indicator => canvas.remove(indicator));
    
    // Create a temporary snap indicator
    const indicator = isHorizontal
      ? new fabric.Line([0, position, width, position], {
          stroke: '#ff3366',
          strokeWidth: 1,
          opacity: 0.8,
          selectable: false,
          evented: false,
          snapIndicator: true,
          excludeFromExport: true
        })
      : new fabric.Line([position, 0, position, height], {
          stroke: '#ff3366',
          strokeWidth: 1,
          opacity: 0.8,
          selectable: false,
          evented: false,
          snapIndicator: true,
          excludeFromExport: true
        });
    
    // Add to canvas
    canvas.add(indicator);
    
    // Remove after a short delay
    setTimeout(() => {
      canvas.remove(indicator);
      canvas.renderAll();
    }, 500);
  }
  
  /**
   * Create smart guides when objects align with each other
   * @param {Object} activeObj - The active object being moved/resized
   */
  function createSmartGuides(activeObj) {
    if (!canvas) return;
    
    // Remove existing smart guides
    const existingSmartGuides = canvas.getObjects().filter(obj => obj.smartGuide);
    existingSmartGuides.forEach(guide => canvas.remove(guide));
    
    // Skip if only one object or no selection
    if (!activeObj) return;
    
    // Get all other objects
    const otherObjects = canvas.getObjects().filter(obj => 
      obj !== activeObj && 
      !obj.guide && 
      !obj.gridElement && 
      !obj.smartGuide &&
      !obj.snapIndicator &&
      obj.visible
    );
    
    if (otherObjects.length === 0) return;
    
    // Get active object bounds
    const activeBounds = activeObj.getBoundingRect();
    const snapThreshold = $currentDocument?.metadata?.grid?.snapThreshold || 5;
    
    // Check for alignments with other objects
    otherObjects.forEach(otherObj => {
      const otherBounds = otherObj.getBoundingRect();
      
      // Check for horizontal alignment (tops, centers, bottoms)
      // Top edges alignment
      checkAlignment(
        activeBounds.top, 
        otherBounds.top, 
        true, 
        'top-alignment'
      );
      
      // Center alignment
      checkAlignment(
        activeBounds.top + activeBounds.height/2, 
        otherBounds.top + otherBounds.height/2, 
        true, 
        'center-alignment'
      );
      
      // Bottom edges alignment
      checkAlignment(
        activeBounds.top + activeBounds.height, 
        otherBounds.top + otherBounds.height, 
        true, 
        'bottom-alignment'
      );
      
      // Check for vertical alignment (lefts, centers, rights)
      // Left edges alignment
      checkAlignment(
        activeBounds.left, 
        otherBounds.left, 
        false, 
        'left-alignment'
      );
      
      // Center alignment
      checkAlignment(
        activeBounds.left + activeBounds.width/2, 
        otherBounds.left + otherBounds.width/2, 
        false, 
        'center-alignment'
      );
      
      // Right edges alignment
      checkAlignment(
        activeBounds.left + activeBounds.width, 
        otherBounds.left + otherBounds.width, 
        false, 
        'right-alignment'
      );
    });
    
    // Check for alignment and create guide if aligned
    function checkAlignment(pos1, pos2, isHorizontal, type) {
      if (Math.abs(pos1 - pos2) < snapThreshold) {
        // Create smart guide
        const guide = isHorizontal
          ? new fabric.Line([0, pos2, width, pos2], {
              stroke: '#00cc00',
              strokeWidth: 1,
              strokeDashArray: [4, 4],
              selectable: false,
              evented: false,
              smartGuide: true,
              alignmentType: type,
              excludeFromExport: true
            })
          : new fabric.Line([pos2, 0, pos2, height], {
              stroke: '#00cc00',
              strokeWidth: 1,
              strokeDashArray: [4, 4],
              selectable: false,
              evented: false,
              smartGuide: true,
              alignmentType: type,
              excludeFromExport: true
            });
        
        canvas.add(guide);
        
        // Make sure it's above content but below UI elements
        // Use canvas.bringForward several times instead of moveTo
        for (let i = 0; i < 10; i++) {
          canvas.bringForward(guide);
        }
        
        // Snap the object to align perfectly
        if (isHorizontal) {
          activeObj.top += (pos2 - pos1);
        } else {
          activeObj.left += (pos2 - pos1);
        }
      }
    }
  }
  
  /**
   * Check if an object is from a master page
   * @param {Object} obj - The object to check
   * @returns {boolean} Whether the object is from a master page
   */
  export function isObjectFromMaster(obj) {
    return obj && obj.fromMaster === true;
  }
  
  /**
   * Get a list of all master page objects on the canvas
   * @returns {Array} Array of master page objects
   */
  export function getMasterPageObjects() {
    if (!canvas) return [];
    
    return canvas.getObjects().filter(obj => obj.fromMaster);
  }
  
  /**
   * Save a specific page's content without changing the current page
   * @param {string} pageId - ID of the page to save
   * @param {Array} objects - Canvas objects to save
   */
  function saveSpecificPage(pageId, objects) {
    if (!pageId) {
      console.warn("Cannot save specific page: No page ID provided");
      return;
    }
    
    if (!$currentDocument) {
      console.warn(`Cannot save specific page ${pageId}: No current document`);
      return;
    }
    
    // Get the index of the page to save
    let pageIndexToSave = $currentDocument.pages.findIndex(p => p.id === pageId);
    if (pageIndexToSave < 0) {
      console.warn(`Cannot save specific page ${pageId}: Page not found in document`);
      return;
    }
    
    try {
      console.log(`Saving specific page ${pageId} directly with ${objects.length} objects`);
      
      // If no objects, save minimal state
      if (objects.length === 0) {
        const emptyCanvasJSON = JSON.stringify({
          "version": "4.6.0",
          "objects": [],
          "background": "white"
        });
        
        // Update document with empty canvas
        const updatedPages = [...$currentDocument.pages];
        updatedPages[pageIndexToSave] = {
          ...updatedPages[pageIndexToSave],
          canvasJSON: emptyCanvasJSON,
          masterPageId: updatedPages[pageIndexToSave].masterPageId,
          overrides: updatedPages[pageIndexToSave].overrides || {}
        };
        
        // Update the store
        currentDocument.update(doc => ({
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        }));
        
        console.log(`Saved empty page ${pageId}`);
        return;
      }
      
      // Create canvas-like object with toJSON method
      const tempCanvas = {
        _objects: objects,
        backgroundColor: 'white',
        toJSON: function(propertiesToInclude) {
          return {
            version: "4.6.0",
            objects: this._objects.map(obj => obj.toJSON(propertiesToInclude)),
            background: this.backgroundColor
          };
        }
      };
      
      // Serialize with custom properties
      const canvasData = tempCanvas.toJSON([
        'id', 
        'linkedObjectIds', 
        'fromMaster', 
        'masterId', 
        'masterObjectId', 
        'overridable'
      ]);
      
      // Verify objects in the JSON match what we expect
      const jsonObjectCount = canvasData.objects ? canvasData.objects.length : 0;
      console.log(`JSON has ${jsonObjectCount} objects (expected ${objects.length})`);
      
      // Stringify
      const canvasJSON = JSON.stringify(canvasData);
      console.log(`Serialized JSON for page ${pageId}: ${canvasJSON.length} characters`);
      
      // Create updated page object
      const updatedPages = [...$currentDocument.pages];
      updatedPages[pageIndexToSave] = {
        ...updatedPages[pageIndexToSave],
        canvasJSON: canvasJSON,
        masterPageId: updatedPages[pageIndexToSave].masterPageId,
        overrides: updatedPages[pageIndexToSave].overrides || {}
      };
      
      // Update the store
      currentDocument.update(doc => ({
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      }));
      
      console.log(`Page ${pageId} saved successfully with ${objects.length} objects`);
    } catch (err) {
      console.error(`Error saving specific page ${pageId}:`, err);
      throw err;
    }
  }

  /**
   * Manual object creation function
   * Creates Fabric.js objects directly from JSON data without relying on loadFromJSON
   * @param {Array} objectsData - Array of object data from JSON
   * @returns {Array} Array of created Fabric.js objects
   */
  function createObjectsManually(objectsData) {
    if (!objectsData || !Array.isArray(objectsData)) {
      console.error("Invalid objects data:", objectsData);
      return [];
    }
    
    console.log(`Creating ${objectsData.length} objects manually`);
    const createdObjects = [];
    
    // Process each object in the JSON data
    objectsData.forEach((objData, index) => {
      try {
        // Create different types of objects based on their 'type' property
        const objType = (objData.type || "").toLowerCase();
        let fabricObj = null;
        
        console.log(`Creating object #${index} of type: ${objType}`);
        
        switch (objType) {
          case 'textbox':
            fabricObj = new fabric.Textbox(objData.text || 'Text', {
              left: objData.left || 100,
              top: objData.top || 100,
              width: objData.width || 200,
              fontFamily: objData.fontFamily || 'Arial',
              fontSize: objData.fontSize || 16,
              fontStyle: objData.fontStyle || 'normal',
              fontWeight: objData.fontWeight || 'normal',
              textAlign: objData.textAlign || 'left',
              fill: objData.fill || '#000000',
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || generateId(),
              linkedObjectIds: objData.linkedObjectIds || []
            });
            break;
            
          case 'rect':
            fabricObj = new fabric.Rect({
              left: objData.left || 100,
              top: objData.top || 100,
              width: objData.width || 100,
              height: objData.height || 100,
              fill: objData.fill || '#cccccc',
              stroke: objData.stroke || '#000000',
              strokeWidth: objData.strokeWidth || 1,
              rx: objData.rx || 0,
              ry: objData.ry || 0,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || generateId()
            });
            break;
            
          case 'circle':
            fabricObj = new fabric.Circle({
              left: objData.left || 100,
              top: objData.top || 100,
              radius: objData.radius || 50,
              fill: objData.fill || '#cccccc',
              stroke: objData.stroke || '#000000',
              strokeWidth: objData.strokeWidth || 1,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || generateId()
            });
            break;
            
          case 'ellipse':
            fabricObj = new fabric.Ellipse({
              left: objData.left || 100,
              top: objData.top || 100,
              rx: objData.rx || 50,
              ry: objData.ry || 50,
              fill: objData.fill || '#cccccc',
              stroke: objData.stroke || '#000000',
              strokeWidth: objData.strokeWidth || 1,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || generateId()
            });
            break;
            
          case 'line':
            fabricObj = new fabric.Line([
              objData.x1 || 0, 
              objData.y1 || 0, 
              objData.x2 || 100, 
              objData.y2 || 100
            ], {
              left: objData.left || 0,
              top: objData.top || 0,
              stroke: objData.stroke || '#000000',
              strokeWidth: objData.strokeWidth || 1,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || generateId()
            });
            break;
            
          case 'polygon':
            if (objData.points && Array.isArray(objData.points)) {
              fabricObj = new fabric.Polygon(objData.points, {
                left: objData.left || 0,
                top: objData.top || 0,
                fill: objData.fill || '#cccccc',
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                id: objData.id || generateId()
              });
            }
            break;
            
          case 'polyline':
            if (objData.points && Array.isArray(objData.points)) {
              fabricObj = new fabric.Polyline(objData.points, {
                left: objData.left || 0,
                top: objData.top || 0,
                fill: objData.fill || 'transparent',
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                id: objData.id || generateId()
              });
            }
            break;
            
          case 'path':
            if (objData.path) {
              fabricObj = new fabric.Path(objData.path, {
                left: objData.left || 0,
                top: objData.top || 0,
                fill: objData.fill || 'transparent',
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                id: objData.id || generateId()
              });
            }
            break;
            
          case 'image':
            // For images, we need a special approach with fabric.Image.fromURL
            // Store this for special handling after creating other objects
            console.log("Image object detected, will handle separately");
            break;
            
          case 'group':
            // For groups, we need to create the objects inside first
            if (objData.objects && Array.isArray(objData.objects)) {
              const groupObjects = createObjectsManually(objData.objects);
              if (groupObjects.length > 0) {
                fabricObj = new fabric.Group(groupObjects, {
                  left: objData.left || 0,
                  top: objData.top || 0,
                  angle: objData.angle || 0,
                  scaleX: objData.scaleX || 1,
                  scaleY: objData.scaleY || 1,
                  id: objData.id || generateId()
                });
              }
            }
            break;
            
          default:
            console.log(`Unrecognized object type: ${objType}`);
            break;
        }
        
        // If we successfully created an object, set additional properties from the data
        if (fabricObj) {
          // Ensure critical properties are set
          fabricObj.visible = true;
          fabricObj.evented = true;
          fabricObj.selectable = $activeTool === ToolType.SELECT;
          fabricObj.opacity = objData.opacity !== undefined ? objData.opacity : 1;
          
          // Copy master page properties if present
          if (objData.fromMaster) {
            fabricObj.fromMaster = true;
            fabricObj.masterId = objData.masterId;
            fabricObj.masterObjectId = objData.masterObjectId;
            fabricObj.overridable = objData.overridable !== false; // Default to true
            fabricObj.selectable = false;
            fabricObj.hoverCursor = 'not-allowed';
          }
          
          // Copy other custom properties
          const standardProps = [
            'type', 'left', 'top', 'width', 'height', 'radius', 'rx', 'ry',
            'fill', 'stroke', 'strokeWidth', 'angle', 'scaleX', 'scaleY',
            'opacity', 'text', 'fontFamily', 'fontSize', 'fontWeight',
            'fontStyle', 'textAlign', 'x1', 'y1', 'x2', 'y2', 'points', 'path'
          ];
          
          // Copy any remaining properties
          Object.keys(objData).forEach(key => {
            if (!standardProps.includes(key) && key !== 'objects') {
              fabricObj[key] = objData[key];
            }
          });
          
          // Add text flow event handlers for textbox objects
          if (objType === 'textbox' && textFlow) {
            fabricObj.on('modified', () => updateTextFlow(fabricObj));
            fabricObj.on('changed', () => updateTextFlow(fabricObj));
          }
          
          createdObjects.push(fabricObj);
          console.log(`Successfully created ${objType} object`);
        }
      } catch (err) {
        console.error(`Error creating object #${index}:`, err);
      }
    });
    
    console.log(`Created ${createdObjects.length}/${objectsData.length} objects manually`);
    return createdObjects;
  }

  /**
   * Export save functions to allow external components to trigger saves
   */
  export { saveCurrentPage, saveSpecificPage };
  
  // Undo/redo functions now defined above
  
  /**
   * Delete currently selected objects
   */
  export function deleteSelectedObjects() {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Check if it's a master page object
    if (activeObject.fromMaster && activeObject.overridable) {
      // If it's an overridable master object, override it first, then delete
      const overriddenObj = overrideMasterObject(activeObject);
      if (overriddenObj) {
        canvas.remove(overriddenObj);
      }
    } else if (!activeObject.fromMaster || activeObject.fromMaster === false) {
      // For regular objects or overridden master objects
      if (activeObject.type === 'activeSelection') {
        // For multiple selected objects
        activeObject.forEachObject(obj => {
          if (!obj.fromMaster || obj.fromMaster === false) {
            canvas.remove(obj);
          }
        });
        canvas.discardActiveObject();
      } else {
        // For single selected object
        canvas.remove(activeObject);
      }
    }
    
    canvas.renderAll();
    selectedObject = null;
    
    dispatch('objectselected', { object: null, objectType: null });
  }
  
  // Layer management and clipboard functions are now created and exported 
  // using the helper functions from Canvas.helpers.js
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
    on:scroll={handleScroll}
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
  on:change={handleImageUpload}
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