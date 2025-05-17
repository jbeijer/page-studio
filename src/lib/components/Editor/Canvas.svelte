<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType, currentToolOptions } from '$lib/stores/toolbar';
  import * as fabric from 'fabric';
  import TextFlow from '$lib/utils/text-flow';
  import HistoryManager from '$lib/utils/history-manager';
  import MasterObjectContextMenu from './MasterObjectContextMenu.svelte';
  
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
  
  // Subscribe to current page changes
  $: if ($currentPage && canvas) {
    loadPage($currentPage);
  }
  
  // Handle active tool changes
  $: if (canvas && $activeTool) {
    setupCanvasForTool($activeTool);
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
        dispatch('historyChange', { canUndo, canRedo });
      }
    });
    
    // Set up keyboard shortcuts for undo/redo
    const handleKeyboard = (e) => {
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
  
  function loadPage(pageId) {
    if (!canvas || !$currentDocument) return;
    
    // Save current page first
    saveCurrentPage();
    
    // Find the page to load
    const pageToLoad = $currentDocument.pages.find(p => p.id === pageId);
    
    if (pageToLoad) {
      // Clear canvas
      canvas.clear();
      canvas.backgroundColor = 'white';
      
      // Load content if it exists
      if (pageToLoad.canvasJSON) {
        try {
          // Parse JSON if it's a string (from IndexedDB storage)
          const jsonData = typeof pageToLoad.canvasJSON === 'string'
            ? JSON.parse(pageToLoad.canvasJSON)
            : pageToLoad.canvasJSON;
            
          canvas.loadFromJSON(jsonData, () => {
            // Set up event handlers for text objects after loading
            const textObjects = canvas.getObjects('textbox');
            if (textObjects.length > 0 && textFlow) {
              textObjects.forEach(textObj => {
                if (!textObj.id) textObj.id = generateId();
                if (!textObj.linkedObjectIds) textObj.linkedObjectIds = [];
                
                // Set up event handlers for text flow
                textObj.on('modified', () => updateTextFlow(textObj));
                textObj.on('changed', () => updateTextFlow(textObj));
              });
            }
            
            canvas.renderAll();
          });
        } catch (err) {
          console.error('Error loading canvas JSON:', err);
          // Continue with a blank canvas if JSON parsing fails
        }
      }
      
      // Apply master page if specified
      if (pageToLoad.masterPageId) {
        applyMasterPage(pageToLoad.masterPageId, pageToLoad.overrides || {});
      }
    }
  }
  
  function saveCurrentPage() {
    if (!canvas || !$currentPage || !$currentDocument) return;
    
    const pageIndex = $currentDocument.pages.findIndex(p => p.id === $currentPage);
    if (pageIndex >= 0) {
      // Serialize canvas with custom properties
      const canvasJSON = JSON.stringify(canvas.toJSON([
        'id', 
        'linkedObjectIds', 
        'fromMaster', 
        'masterId', 
        'masterObjectId', 
        'overridable'
      ]));
      
      const updatedPages = [...$currentDocument.pages];
      
      // Preserve the masterPageId and overrides when saving
      const masterPageId = updatedPages[pageIndex].masterPageId;
      const overrides = updatedPages[pageIndex].overrides || {};
      
      updatedPages[pageIndex] = {
        ...updatedPages[pageIndex],
        canvasJSON: canvasJSON,
        masterPageId: masterPageId,
        overrides: overrides
      };
      
      currentDocument.update(doc => ({
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      }));
    }
  }
  
  // Tool-related functions
  function setupCanvasForTool(toolType) {
    if (!canvas) return;
    
    // Reset canvas drawing mode
    canvas.isDrawingMode = false;
    
    // Enable/disable selection based on tool
    canvas.selection = toolType === ToolType.SELECT;
    
    // Make objects selectable only with the select tool
    const canvasObjects = canvas.getObjects();
    canvasObjects.forEach(obj => {
      // Master page objects have special handling
      if (obj.fromMaster) {
        obj.selectable = false; // Master objects are never directly selectable
        obj.evented = true; // But they can receive events for context menu
      } else {
        obj.selectable = toolType === ToolType.SELECT;
        obj.evented = toolType === ToolType.SELECT;
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
    
    // Render the canvas with the new settings
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
          evented: false
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
          evented: false
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
            evented: false
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
      // Make the drawn object selectable if we're switching back to select tool
      drawingObject.set({
        selectable: true,
        evented: true
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
   * Undo the last canvas action
   */
  export function undo() {
    if (historyManager && historyManager.canUndo()) {
      historyManager.undo();
    }
  }
  
  /**
   * Redo the last undone action
   */
  export function redo() {
    if (historyManager && historyManager.canRedo()) {
      historyManager.redo();
    }
  }
  
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