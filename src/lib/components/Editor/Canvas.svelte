<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType, currentToolOptions } from '$lib/stores/toolbar';
  import { clipboard } from '$lib/stores/editor';
  import * as fabric from 'fabric';
  import TextFlow from '$lib/utils/text-flow';
  import HistoryManager from '$lib/utils/history-manager';
  import MasterObjectContextMenu from './MasterObjectContextMenu.svelte';
  import { createLayerManagementFunctions, createClipboardFunctions } from './Canvas.helpers.js';
  
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
  
  // History state
  let canUndo = false;
  let canRedo = false;
  
  // Context menu state
  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuObject = null;
  
  // Generate a unique ID for objects when needed
  function generateId() {
    return 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }
  
  // Keep track of the previous page to avoid redundant operations
  let previousPage = null;
  
  // Subscribe to current page changes
  $: if ($currentPage && canvas && $currentPage !== previousPage) {
    console.log(`Page changed from ${previousPage} to ${$currentPage}`);
    
    // Only save the previous page if we had one
    if (previousPage) {
      console.log(`Saving previous page ${previousPage} before switching`);
      
      // Save the current page to the correct previous page ID
      const pageToSaveIndex = $currentDocument.pages.findIndex(p => p.id === previousPage);
      if (pageToSaveIndex >= 0) {
        // Force save of current page with additional verification
        const currentObjects = canvas.getObjects();
        console.log(`Currently ${currentObjects.length} objects on canvas before saving page ${previousPage}`);
        if (currentObjects.length > 0) {
          console.log(`Object types: ${currentObjects.map(obj => obj.type).join(', ')}`);
        }
        
        try {
          // Directly create an updated page object for the current canvas
          if (currentObjects.length > 0) {
            // Create a JSON representation of the canvas
            const canvasData = canvas.toJSON([
              'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
            ]);
            
            console.log(`Saving ${currentObjects.length} objects to page ${previousPage}`);
            const canvasJSON = JSON.stringify(canvasData);
            
            // Update the document with this specific page's data
            currentDocument.update(doc => {
              const updatedPages = [...doc.pages];
              updatedPages[pageToSaveIndex] = {
                ...updatedPages[pageToSaveIndex],
                canvasJSON: canvasJSON
              };
              
              return {
                ...doc,
                pages: updatedPages,
                lastModified: new Date()
              };
            });
            
            console.log(`Directly saved page ${previousPage} with ${currentObjects.length} objects`);
          } else {
            console.log(`No objects to save for page ${previousPage}`);
            
            // Save empty page
            const emptyCanvasJSON = JSON.stringify({
              "version": "4.6.0",
              "objects": [],
              "background": "white"
            });
            
            // Update empty page in document
            currentDocument.update(doc => {
              const updatedPages = [...doc.pages];
              updatedPages[pageToSaveIndex] = {
                ...updatedPages[pageToSaveIndex],
                canvasJSON: emptyCanvasJSON
              };
              
              return {
                ...doc,
                pages: updatedPages,
                lastModified: new Date()
              };
            });
            
            console.log(`Saved empty state for page ${previousPage}`);
          }
        } catch (err) {
          console.error(`Error saving page ${previousPage}:`, err);
        }
      } else {
        console.error(`Could not find page ${previousPage} in document to save`);
      }
      
      // Add a forced save to document store to ensure persistence
      console.log("Forcing document save to ensure data persistence");
      currentDocument.update(doc => {
        return { ...doc, lastModified: new Date() };
      });
    }
    
    // Wait a moment to ensure save is complete before loading new page
    setTimeout(() => {
      // Update our tracking variable before loading the new page
      const oldPage = previousPage;
      previousPage = $currentPage;
      
      // Clear the canvas before loading the new page
      canvas.clear();
      canvas.backgroundColor = 'white';
      canvas.renderAll();
      
      // Now load the new page (without calling saveCurrentPage again)
      console.log(`Loading new page: ${$currentPage} (after saving ${oldPage})`);
      loadPage($currentPage, false); // Pass false to avoid saving again
    }, 100);
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
  
  onMount(() => {
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
        overrides: {}
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
    if (!canvas || !$currentDocument) return;
    
    console.log(`loadPage called for page: ${pageId} (shouldSaveFirst: ${shouldSaveFirst})`);
    
    // Save current page first (only if requested and we have a current page)
    if (shouldSaveFirst && $currentPage) {
      console.log(`Saving current page ${$currentPage} before loading ${pageId}`);
      
      // Use our manual save method to ensure correct page is updated
      const pageToSaveIndex = $currentDocument.pages.findIndex(p => p.id === $currentPage);
      if (pageToSaveIndex >= 0) {
        const currentObjects = canvas.getObjects();
        if (currentObjects.length > 0) {
          // Create a JSON representation of the canvas
          const canvasData = canvas.toJSON([
            'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
          ]);
          
          console.log(`Saving ${currentObjects.length} objects to page ${$currentPage}`);
          const canvasJSON = JSON.stringify(canvasData);
          
          // Update the document with this specific page's data
          currentDocument.update(doc => {
            const updatedPages = [...doc.pages];
            updatedPages[pageToSaveIndex] = {
              ...updatedPages[pageToSaveIndex],
              canvasJSON: canvasJSON
            };
            
            return {
              ...doc,
              pages: updatedPages,
              lastModified: new Date()
            };
          });
        } else {
          // Save empty page
          const emptyCanvasJSON = JSON.stringify({
            "version": "4.6.0",
            "objects": [],
            "background": "white"
          });
          
          // Update the document
          currentDocument.update(doc => {
            const updatedPages = [...doc.pages];
            updatedPages[pageToSaveIndex] = {
              ...updatedPages[pageToSaveIndex],
              canvasJSON: emptyCanvasJSON
            };
            
            return {
              ...doc,
              pages: updatedPages,
              lastModified: new Date()
            };
          });
        }
      }
    }
    
    // Force canvas to clear and reset
    canvas.clear();
    canvas.backgroundColor = 'white';
    canvas.renderAll();
    
    // Find the page to load 
    const pageToLoad = $currentDocument.pages.find(p => p.id === pageId);
    
    console.log(`Page to load:`, pageId, pageToLoad ? 'found' : 'not found');
    
    if (pageToLoad) {
      // Clear canvas again to be sure
      canvas.clear();
      canvas.backgroundColor = 'white';
      
      // Force another render to ensure canvas is totally clean
      canvas.renderAll();
      
      // Log detailed info about the page we're about to load
      console.log("Loading page data:", {
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
      
      // Load content if it exists
      if (pageToLoad.canvasJSON) {
        try {
          console.log("Loading canvas content for page:", pageId);
          
          // Parse JSON if it's a string (from IndexedDB storage)
          const jsonData = typeof pageToLoad.canvasJSON === 'string'
            ? JSON.parse(pageToLoad.canvasJSON)
            : pageToLoad.canvasJSON;
          
          const objectCount = jsonData.objects ? jsonData.objects.length : 0;
          console.log(`Canvas JSON parsed successfully, contains ${objectCount} objects`);
          
          // Verify fabric.js is fully loaded before we try to create objects
          console.log("Fabric version:", fabric.version);
          console.log("Fabric capabilities check:", {
            hasCanvas: !!fabric.Canvas,
            hasUtil: !!fabric.util,
            hasEnlivenObjects: !!(fabric.util && fabric.util.enlivenObjects),
            hasTextbox: !!fabric.Textbox
          });
          
          if (objectCount > 0) {
            console.log("Object types to load:", jsonData.objects.map(obj => obj.type));
          }
          
          // RADICAL NEW APPROACH: Create objects directly using Fabric constructors
          // instead of using enlivenObjects which seems to be failing
          
          // Skip for empty canvases
          if (objectCount === 0) {
            console.log("Canvas is empty, simply setting background");
            // Just set the background color for empty canvas
            canvas.backgroundColor = jsonData.background || 'white';
            canvas.requestRenderAll();
            canvas.renderAll();
          } else {
            // For canvases with objects, create them directly based on their type
            console.log(`Loading ${objectCount} objects into canvas using direct creation`);
            
            try {
              // Set the canvas background first
              canvas.backgroundColor = jsonData.background || 'white';
              
              // Create objects directly by type
              let createdCount = 0;
              
              jsonData.objects.forEach((objData, index) => {
                let fabricObj = null;
                
                // Create different types of objects based on their 'type' property
                switch (objData.type.toLowerCase()) {
                  case 'textbox':
                    console.log(`Creating textbox #${index} with text: ${objData.text}`);
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
                      id: objData.id || generateId(),
                      angle: objData.angle || 0,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1,
                      lockMovementX: objData.lockMovementX || false,
                      lockMovementY: objData.lockMovementY || false,
                      selectable: $activeTool === ToolType.SELECT,
                      evented: true
                    });
                    break;
                    
                  case 'rect':
                    console.log(`Creating rectangle #${index}`);
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
                      id: objData.id || generateId(),
                      selectable: $activeTool === ToolType.SELECT,
                      evented: true
                    });
                    break;
                    
                  case 'ellipse':
                    console.log(`Creating ellipse #${index}`);
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
                      id: objData.id || generateId(),
                      selectable: $activeTool === ToolType.SELECT,
                      evented: true
                    });
                    break;
                    
                  case 'line':
                    console.log(`Creating line #${index}`);
                    fabricObj = new fabric.Line([
                      objData.x1 || 0, 
                      objData.y1 || 0, 
                      objData.x2 || 100, 
                      objData.y2 || 100
                    ], {
                      stroke: objData.stroke || '#000000',
                      strokeWidth: objData.strokeWidth || 1,
                      angle: objData.angle || 0,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1,
                      id: objData.id || generateId(),
                      selectable: $activeTool === ToolType.SELECT,
                      evented: true
                    });
                    break;
                    
                  case 'image':
                    // Images are more complex to recreate, we'll use a placeholder for now
                    console.log(`Creating image placeholder for #${index}`);
                    // We'll use a rect as placeholder and add text saying "Image"
                    fabricObj = new fabric.Rect({
                      left: objData.left || 100,
                      top: objData.top || 100,
                      width: objData.width || 100,
                      height: objData.height || 100,
                      fill: '#eeeeee',
                      stroke: '#000000',
                      strokeDashArray: [5, 5],
                      id: objData.id || generateId(),
                      selectable: $activeTool === ToolType.SELECT,
                      evented: true
                    });
                    
                    // Add text saying "Image" on top of the placeholder
                    const imgText = new fabric.Text('Image', {
                      left: (objData.left || 100) + (objData.width || 100) / 2,
                      top: (objData.top || 100) + (objData.height || 100) / 2,
                      originX: 'center',
                      originY: 'center',
                      fontSize: 12,
                      fontFamily: 'Arial',
                      fill: '#666666'
                    });
                    canvas.add(imgText);
                    break;
                    
                  default:
                    console.log(`Unsupported object type: ${objData.type}`);
                    return; // Skip this object
                }
                
                // If we successfully created an object, add it to the canvas
                if (fabricObj) {
                  // Add the object to the canvas
                  canvas.add(fabricObj);
                  
                  // Copy ALL custom properties from the original object
                  // This ensures we don't miss any important metadata
                  Object.keys(objData).forEach(key => {
                    // Skip properties that are standard Fabric object properties
                    // or that were already set during construction
                    const standardProps = [
                      'type', 'left', 'top', 'width', 'height', 'fill', 
                      'stroke', 'strokeWidth', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
                      'angle', 'scaleX', 'scaleY', 'fontFamily', 'fontSize', 
                      'fontWeight', 'fontStyle', 'text', 'textAlign'
                    ];
                    
                    if (!standardProps.includes(key)) {
                      // Copy the custom property
                      fabricObj[key] = objData[key];
                    }
                  });
                  
                  // Explicitly set important properties to ensure they're copied
                  if (objData.fromMaster) {
                    fabricObj.fromMaster = objData.fromMaster;
                    fabricObj.masterId = objData.masterId;
                    fabricObj.masterObjectId = objData.masterObjectId;
                    fabricObj.overridable = objData.overridable !== false; // Default to true
                  }
                  
                  // Set up event handlers for text flow
                  if (fabricObj.type === 'textbox' && textFlow) {
                    if (!fabricObj.linkedObjectIds) {
                      fabricObj.linkedObjectIds = objData.linkedObjectIds || [];
                    }
                    
                    fabricObj.on('modified', () => updateTextFlow(fabricObj));
                    fabricObj.on('changed', () => updateTextFlow(fabricObj));
                  }
                  
                  createdCount++;
                }
              });
              
              console.log(`Created ${createdCount}/${objectCount} objects directly`);
              
              // Final check
              const finalObjects = canvas.getObjects();
              console.log(`Canvas now has ${finalObjects.length} total objects`);
              
              // Print detailed object info for debugging
              if (finalObjects.length > 0) {
                console.log("Recreated objects list:");
                finalObjects.forEach((obj, idx) => {
                  console.log(`[${idx}] Type: ${obj.type}, Pos: (${Math.round(obj.left)},${Math.round(obj.top)}), ID: ${obj.id}`);
                });
              } else {
                console.warn("No objects were successfully created! This should be investigated.");
              }
              
              // Force multiple renders to ensure visibility
              canvas.requestRenderAll();
              canvas.renderAll();
              
              // Additional render cycle with delay
              setTimeout(() => {
                // Ensure all objects are properly set up
                canvas.getObjects().forEach(obj => {
                  obj.evented = true;
                  obj.selectable = $activeTool === ToolType.SELECT;
                });
                
                canvas.requestRenderAll();
                canvas.renderAll();
                
                // Log the result
                console.log(`After final render: ${canvas.getObjects().length} objects visible on canvas`);
              }, 100);
            } catch (err) {
              console.error("Error creating objects directly:", err);
            }
          }
          
        } catch (err) {
          console.error('Error parsing canvas JSON:', err);
          console.error('Data that caused the error:', 
            typeof pageToLoad.canvasJSON === 'string' ? 
              pageToLoad.canvasJSON.substring(0, 100) + '...' : 
              JSON.stringify(pageToLoad.canvasJSON).substring(0, 100) + '...');
          
          // Continue with a blank canvas if JSON parsing fails
          canvas.clear();
          canvas.backgroundColor = 'white';
          canvas.renderAll();
        }
      } else {
        console.log("No canvas data to load, starting with empty canvas");
      }
      
      // Apply master page if specified
      if (pageToLoad.masterPageId) {
        applyMasterPage(pageToLoad.masterPageId, pageToLoad.overrides || {});
      }
    }
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
        
        // Create fabric image object
        fabric.Image.fromURL(imgSrc, function(fabricImg) {
          // Scale down very large images to fit canvas better
          const maxDimension = Math.max(img.width, img.height);
          let scale = 1;
          
          if (maxDimension > 1000) {
            scale = 1000 / maxDimension;
          }
          
          fabricImg.set({
            left: (canvas.width - img.width * scale) / 2,
            top: (canvas.height - img.height * scale) / 2,
            scaleX: scale,
            scaleY: scale
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
          
          canvas.add(fabricImg);
          canvas.setActiveObject(fabricImg);
          canvas.renderAll();
          
          // Reset file input for future uploads
          event.target.value = '';
        });
      };
      
      img.src = imgSrc;
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
        jsonData.objects.forEach(objData => {
          // Skip objects that are overridden
          if (objData.masterObjectId && overrides[objData.masterObjectId]) {
            return;
          }
          
          // Create the fabric object from the JSON
          fabric.util.enlivenObjects([objData], (objects) => {
            if (objects.length === 0) return;
            
            const fabricObj = objects[0];
            
            // Mark as from master page
            fabricObj.fromMaster = true;
            fabricObj.masterId = masterPageId;
            fabricObj.masterObjectId = objData.masterObjectId || `master-obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            fabricObj.overridable = objData.overridable !== false; // Default to true
            
            // Special settings for master objects
            fabricObj.selectable = false;
            fabricObj.evented = true; // Allow events for context menu
            fabricObj.hoverCursor = 'not-allowed';
            
            // Add a subtle visual difference to master objects
            fabricObj.opacity = fabricObj.opacity || 1;
            
            // Add to canvas
            canvas.add(fabricObj);
            
            // Make sure master objects are rendered behind regular objects
            fabricObj.moveTo(0);
          });
        });
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
    
    // Clone the master object without master-specific properties
    const clone = fabric.util.object.clone(masterObject);
    
    // Remove master-specific properties
    clone.fromMaster = false;
    clone.masterId = undefined;
    clone.masterObjectId = undefined;
    clone.overridable = undefined;
    
    // Make selectable and interactive
    clone.selectable = true;
    clone.evented = true;
    clone.hoverCursor = 'move';
    
    // Restore full opacity
    clone.opacity = 1;
    
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
    
    canvas.renderAll();
    
    return clone;
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
   * Export saveCurrentPage function to allow external components to trigger saves
   */
  export { saveCurrentPage };
  
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
  <div class="canvas-container flex items-center justify-center p-8">
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