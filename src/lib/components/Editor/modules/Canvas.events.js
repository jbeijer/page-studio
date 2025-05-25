/**
 * Canvas.events.js
 * Manages event handling for the Canvas component
 */

import { ToolType } from '$lib/stores/toolbar';
import { createTextObject, createShadow } from '$lib/utils/fabric-helpers';
import { fabric } from 'fabric';

/**
 * Create event handling functions for the Canvas component
 * @param {Object} context - Canvas context with shared references and methods
 * @returns {Object} Event handling functions
 */
export function createEventHandlers(context) {
  // We're using explicit imports from fabric package
  console.log("Using modern fabric imports in Canvas.events.js");
  
  const {
    canvas,
    generateId,
    saveCurrentPage,
    textFlow,
    updateTextFlow,
    snapToGrid,
    snapToGuides,
    createSmartGuides
  } = context;

  // State variables
  let isDrawing = false;
  let drawingObject = null;

  /**
   * Handle mouse down events on the canvas
   * @param {Object} options - Fabric.js event options
   */
  function handleMouseDown(options) {
    if (!canvas) {
      console.error("No canvas available in handleMouseDown");
      return;
    }
    
    try {
      const pointer = canvas.getPointer(options.e);
      if (!pointer) {
        console.error("Could not get pointer position in handleMouseDown");
        return;
      }
      
      // Get the current active tool directly from the context
      // which will have the up-to-date value from the store
      const currentActiveTool = context.activeTool;
      
      console.log(`Mouse down at position: x=${pointer.x}, y=${pointer.y}, Active tool: ${currentActiveTool}`);
      isDrawing = true;
      
      // Call appropriate handler based on current tool
      switch (currentActiveTool) {
        case ToolType.SELECT:
          // Selection is handled by Fabric.js automatically
          console.log("Select tool active - using Fabric.js built-in selection");
          break;
          
        case ToolType.TEXT:
          console.log("Text tool active - creating text object");
          handleTextToolMouseDown(options, pointer);
          break;
          
        case ToolType.IMAGE:
          console.log("Image tool active - opening file dialog");
          handleImageToolMouseDown(options);
          break;
          
        case ToolType.RECTANGLE:
          console.log("Rectangle tool active - creating rectangle object");
          handleRectangleToolMouseDown(options, pointer);
          break;
          
        case ToolType.ELLIPSE:
          console.log("Ellipse tool active - creating ellipse object");
          handleEllipseToolMouseDown(options, pointer);
          break;
          
        case ToolType.LINE:
          console.log("Line tool active - creating line object");
          handleLineToolMouseDown(options, pointer);
          break;
          
        default:
          console.log(`Unknown tool active: ${currentActiveTool}`);
          break;
      }
    } catch (error) {
      console.error("Error in handleMouseDown:", error);
      isDrawing = false;
    }
  }

  /**
   * Handle Text tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleTextToolMouseDown(options, pointer) {
    if (options.target) return;
    
    console.log("Text tool mouse down event triggered at", pointer.x, pointer.y);
        
    const textOptions = context.currentToolOptions;
    console.log("Creating text with options:", textOptions);
    
    try {
      const text = createTextObject('Edit this text', {
        left: pointer.x,
        top: pointer.y,
        fontFamily: textOptions.fontFamily || 'Arial',
        fontSize: textOptions.fontSize || 16,
        fontStyle: textOptions.fontStyle || 'normal',
        fontWeight: textOptions.fontWeight || 'normal',
        textAlign: textOptions.textAlign || 'left',
        width: 200,
        fill: '#000000',
        editable: true,
        id: generateId(), // Add unique ID for text flow
        linkedObjectIds: [], // Initialize linked objects array
        objectCaching: true // Enable object caching for better performance
      });
      
      if (!text) {
        console.error("ERROR: Failed to create text object");
        return;
      }
      
      console.log("Text object created successfully:", text);
      
      // Ensure text is visible and active
      text.visible = true;
      text.opacity = 1;
      text.selectable = true;
      text.evented = true;
      
      canvas.add(text);
      console.log("Text added to canvas. Canvas now has", canvas.getObjects().length, "objects");
      
      canvas.setActiveObject(text);
      
      // Try to enter editing mode if supported
      if (typeof text.enterEditing === 'function') {
        text.enterEditing();
        console.log("Entered text editing mode");
      }
      
      // Force canvas rendering
      canvas.requestRenderAll();
      canvas.renderAll();
      
      isDrawing = false;
      
      // Add text to TextFlow manager
      if (textFlow) {
        // Hook up events when textboxes are linked
        text.on('modified', () => updateTextFlow(text));
        text.on('changed', () => updateTextFlow(text));
        console.log("Text flow events connected");
      }
    } catch (error) {
      console.error("ERROR: Exception while creating text object:", error);
    }
  }

  /**
   * Handle Image tool mouse down
   * @param {Object} options - Fabric.js event options
   */
  function handleImageToolMouseDown(options) {
    // Open file dialog when the canvas is clicked
    if (context.imageInput && !options.target) {
      context.imageInput.click();
      isDrawing = false;
    }
  }

  /**
   * Handle Rectangle tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleRectangleToolMouseDown(options, pointer) {
    const rectOptions = context.currentToolOptions;
    
    try {
      drawingObject = new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: rectOptions.fill || '#cccccc',
        stroke: rectOptions.stroke || '#000000',
        strokeWidth: rectOptions.strokeWidth || 1,
        rx: rectOptions.cornerRadius || 0,
        ry: rectOptions.cornerRadius || 0,
        selectable: false,
        evented: true  // Keep evented true for visibility
      });
      
      if (!drawingObject) {
        console.error("ERROR: Failed to create rectangle object");
        return;
      }
      
      canvas.add(drawingObject);
      canvas.requestRenderAll();
      console.log("Rectangle created:", drawingObject);
    } catch (error) {
      console.error("ERROR: Error creating rectangle:", error);
      drawingObject = null;
    }
  }

  /**
   * Handle Ellipse tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleEllipseToolMouseDown(options, pointer) {
    const ellipseOptions = context.currentToolOptions;
    
    try {
      drawingObject = new fabric.Ellipse({
        left: pointer.x,
        top: pointer.y,
        rx: 0,
        ry: 0,
        fill: ellipseOptions.fill || '#cccccc',
        stroke: ellipseOptions.stroke || '#000000',
        strokeWidth: ellipseOptions.strokeWidth || 1,
        selectable: false,
        evented: true  // Keep evented true for visibility
      });
      
      if (!drawingObject) {
        console.error("ERROR: Failed to create ellipse object");
        return;
      }
      
      canvas.add(drawingObject);
    } catch (error) {
      console.error("ERROR: Error creating ellipse:", error);
      drawingObject = null;
    }
  }

  /**
   * Handle Line tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleLineToolMouseDown(options, pointer) {
    const lineOptions = context.currentToolOptions;
    
    try {
      drawingObject = new fabric.Line(
        [pointer.x, pointer.y, pointer.x, pointer.y], 
        {
          stroke: lineOptions.stroke || '#000000',
          strokeWidth: lineOptions.strokeWidth || 1,
          selectable: false,
          evented: true  // Keep evented true for visibility
        }
      );
      
      if (!drawingObject) {
        console.error("ERROR: Failed to create line object");
        return;
      }
      
      canvas.add(drawingObject);
    } catch (error) {
      console.error("ERROR: Error creating line:", error);
      drawingObject = null;
    }
  }

  /**
   * Handle mouse move events on the canvas
   * @param {Object} options - Fabric.js event options
   */
  function handleMouseMove(options) {
    if (!isDrawing || !drawingObject) return;
    if (!canvas) {
      console.error("No canvas available in handleMouseMove");
      return;
    }
    
    try {
      const pointer = canvas.getPointer(options.e);
      if (!pointer) {
        console.error("Could not get pointer position in handleMouseMove");
        return;
      }
      
      // Get the current active tool from context to ensure it's up-to-date
      const currentActiveTool = context.activeTool;
      
      // Call appropriate handler based on current tool
      switch (currentActiveTool) {
        case ToolType.RECTANGLE:
          handleRectangleToolMouseMove(pointer);
          break;
          
        case ToolType.ELLIPSE:
          handleEllipseToolMouseMove(pointer);
          break;
          
        case ToolType.LINE:
          handleLineToolMouseMove(pointer);
          break;
      }
      
      // Ensure the canvas is rendered
      try {
        canvas.renderAll();
      } catch (renderError) {
        console.error("Error rendering canvas:", renderError);
      }
    } catch (error) {
      console.error("Error in handleMouseMove:", error);
    }
  }

  /**
   * Handle Rectangle tool mouse move
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleRectangleToolMouseMove(pointer) {
    if (!drawingObject || typeof drawingObject.set !== 'function') {
      console.error("Invalid rectangle object in handleRectangleToolMouseMove");
      return;
    }
    
    try {
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
    } catch (error) {
      console.error("Error updating rectangle:", error);
    }
  }

  /**
   * Handle Ellipse tool mouse move
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleEllipseToolMouseMove(pointer) {
    if (!drawingObject || typeof drawingObject.set !== 'function') {
      console.error("Invalid ellipse object in handleEllipseToolMouseMove");
      return;
    }
    
    try {
      // Update ellipse dimensions
      const rx = Math.abs(pointer.x - drawingObject.left) / 2;
      const ry = Math.abs(pointer.y - drawingObject.top) / 2;
      
      // Adjust position to keep center of ellipse fixed
      const centerX = Math.min(pointer.x, drawingObject.left) + rx;
      const centerY = Math.min(pointer.y, drawingObject.top) + ry;
      
      drawingObject.set({
        rx: rx,
        ry: ry,
        left: centerX - rx,
        top: centerY - ry
      });
    } catch (error) {
      console.error("Error updating ellipse:", error);
    }
  }

  /**
   * Handle Line tool mouse move
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleLineToolMouseMove(pointer) {
    // Update line end point
    if (drawingObject && typeof drawingObject.set === 'function') {
      drawingObject.set({
        x2: pointer.x,
        y2: pointer.y
      });
    } else {
      console.error("Invalid line object in handleLineToolMouseMove");
    }
  }

  /**
   * Handle mouse up events on the canvas
   */
  function handleMouseUp() {
    isDrawing = false;
    
    if (!canvas) {
      console.error("No canvas available in handleMouseUp");
      return;
    }
    
    if (drawingObject) {
      try {
        // Make the drawn object properly set for interactivity
        drawingObject.set({
          selectable: context.activeTool === ToolType.SELECT, // Only selectable in SELECT mode
          evented: true, // Always evented to ensure visibility
          hoverCursor: context.activeTool === ToolType.SELECT ? 'move' : 'default'
        });
        
        // Clean up tiny objects (likely accidental clicks)
        if (context.activeTool === ToolType.RECTANGLE || context.activeTool === ToolType.ELLIPSE) {
          if ((drawingObject.width < 5 && drawingObject.height < 5) || 
              (drawingObject.rx < 2.5 && drawingObject.ry < 2.5)) {
            console.log("Removing tiny shape object (likely accidental)");
            canvas.remove(drawingObject);
          }
        } else if (context.activeTool === ToolType.LINE) {
          const dx = drawingObject.x2 - drawingObject.x1;
          const dy = drawingObject.y2 - drawingObject.y1;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 5) {
            console.log("Removing tiny line object (likely accidental)");
            canvas.remove(drawingObject);
          }
        }
        
        // Clear drawing object reference
        drawingObject = null;
        
        // Request a complete render cycle with error handling
        try {
          console.log("Requesting canvas render after mouse up");
          canvas.requestRenderAll();
          canvas.renderAll();
        } catch (renderError) {
          console.error("Error rendering canvas after mouse up:", renderError);
        }
      } catch (error) {
        console.error("Error in handleMouseUp:", error);
        drawingObject = null;
      }
    }
  }

  /**
   * Handle double click events on the canvas
   * @param {Object} options - Fabric.js event options
   */
  function handleDoubleClick(options) {
    if (!canvas) return;
    
    const target = options.target;
    
    // Handle double-clicking on text objects to enter edit mode
    // Check for both textbox and text/itext types
    if (target && (target.type === 'textbox' || target.type === 'text' || target.type === 'i-text')) {
      canvas.setActiveObject(target);
      
      // Make sure enterEditing exists before calling it
      if (typeof target.enterEditing === 'function') {
        target.enterEditing();
      }
    }
  }

  /**
   * Handle object selection events
   * @param {Object} options - Fabric.js event options
   */
  function handleObjectSelected(options) {
    const activeObject = canvas.getActiveObject();
    
    // Make sure text objects have an ID for text flow
    if (activeObject && activeObject.type === 'textbox' && !activeObject.id) {
      activeObject.id = generateId();
      if (!activeObject.linkedObjectIds) {
        activeObject.linkedObjectIds = [];
      }
    }
    
    // If the selected object is from a master page, pass that info
    const isMasterObject = activeObject && activeObject.fromMaster === true;
    
    context.dispatch('objectselected', { 
      object: activeObject, 
      objectType: activeObject?.type,
      fromMaster: isMasterObject,
      masterId: isMasterObject ? activeObject.masterId : null,
      masterObjectId: isMasterObject ? activeObject.masterObjectId : null,
      overridable: isMasterObject ? activeObject.overridable : null
    });
    
    // Update selected object in context
    context.selectedObject = activeObject;
  }

  /**
   * Handle selection cleared events
   */
  function handleSelectionCleared() {
    context.selectedObject = null;
    context.dispatch('objectselected', { object: null, objectType: null });
  }

  /**
   * Handle right-click events on canvas objects
   * @param {Object} options - Fabric.js mouse event options
   */
  function handleRightClick(options) {
    options.e.preventDefault();
    
    if (options.target && options.target.fromMaster) {
      // Right-click on a master page object
      context.contextMenuX = options.e.clientX;
      context.contextMenuY = options.e.clientY;
      context.contextMenuObject = options.target;
      context.showContextMenu = true;
      
      // Also dispatch event for external components
      context.dispatch('masterObjectRightClick', {
        object: options.target,
        x: options.e.clientX,
        y: options.e.clientY
      });
    } else {
      // Hide the context menu if clicking elsewhere
      context.showContextMenu = false;
    }
    
    return false;
  }

  /**
   * Handle scroll events on the canvas container
   */
  function handleScroll() {
    if (context.canvasContainer) {
      context.canvasScrollX = context.canvasContainer.scrollLeft;
      context.canvasScrollY = context.canvasContainer.scrollTop;
    }
  }

  /**
   * Handle image upload from file input
   * @param {Event} event - File input change event
   */
  function handleImageUpload(event) {
    if (!event.target.files || !event.target.files[0]) return;
    
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const imgSrc = e.target.result;
      
      // Create a temporary image to get dimensions
      const img = new Image();
      img.onload = function() {
        const imageOptions = context.currentToolOptions;
        
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

  /**
   * Handle keyboard events for the canvas
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleKeyboard(e) {
    // Skip keyboard shortcuts if in a text input
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable) {
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      // Ctrl+Z or Cmd+Z for Undo
      e.preventDefault();
      context.undo();
    } else if (
      ((e.ctrlKey || e.metaKey) && e.key === 'y') || 
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
    ) {
      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z for Redo
      e.preventDefault();
      context.redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      // Ctrl+C or Cmd+C for Copy
      if (canvas.getActiveObject()) {
        e.preventDefault();
        context.copySelectedObjects();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      // Ctrl+X or Cmd+X for Cut
      if (canvas.getActiveObject()) {
        e.preventDefault();
        context.cutSelectedObjects();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      // Ctrl+V or Cmd+V for Paste
      e.preventDefault();
      context.pasteObjects();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Delete selected objects
      if (canvas.getActiveObject()) {
        context.deleteSelectedObjects();
      }
    }
  }

  /**
   * Register event handlers with the canvas
   */
  function registerEventHandlers() {
    if (!canvas) return;
    
    // First, remove any existing event handlers to avoid duplication
    try {
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');
      canvas.off('mouse:dblclick');
      canvas.off('selection:created');
      canvas.off('selection:updated');
      canvas.off('selection:cleared');
      canvas.off('object:modified');
      canvas.off('object:added');
      canvas.off('object:removed');
    } catch (err) {
      console.warn("Error when cleaning up old event handlers:", err);
    }
    
    console.log("Registering canvas event handlers");
    
    // Set up mouse event handlers
    canvas.on('mouse:down', (options) => {
      // Get the current active tool directly from context for accurate logging
      const currentTool = context.activeTool;
      
      console.log(`Mouse down event detected. Active tool: ${currentTool}`, 
        options.pointer ? { x: options.pointer.x, y: options.pointer.y } : "No pointer data"
      );
      
      // Handle right-clicks separately
      if (options.e && options.e.button === 2) {
        handleRightClick(options);
        return;
      }
      
      // Call the normal handler for non-right-clicks
      handleMouseDown(options);
    });
    
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:dblclick', handleDoubleClick);
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);
    canvas.on('selection:cleared', handleSelectionCleared);
    
    // Add handlers for object movement and scaling with grid snapping
    if (context.snapObjectToGrid) {
      // Snap objects when they are being moved
      canvas.on('object:moving', (options) => {
        if (options.target && context.snapObjectToGrid) {
          try {
            context.snapObjectToGrid(options.target);
          } catch (err) {
            console.error("Error applying grid snap during object move:", err);
          }
        }
      });
      
      // Snap objects when they are being scaled
      canvas.on('object:scaling', (options) => {
        if (options.target && context.snapObjectToGrid) {
          try {
            context.snapObjectToGrid(options.target);
          } catch (err) {
            console.error("Error applying grid snap during object scaling:", err);
          }
        }
      });
      
      // Snap objects when they are being rotated (to nearest 15 degrees)
      canvas.on('object:rotating', (options) => {
        if (options.target) {
          try {
            // Snap rotation to nearest 15 degrees
            const angle = options.target.angle;
            const snapAngle = Math.round(angle / 15) * 15;
            options.target.set({ angle: snapAngle });
          } catch (err) {
            console.error("Error applying angle snap during object rotation:", err);
          }
        }
      });
    }
    
    // Listen for changes to update store with better debugging and error handling
    // Import the document module functions for direct access
    // We need this for safer saveCurrentPage access
    const documentModule = context.documentManagement || {};
    const saveCurrentPageDirectly = documentModule.saveCurrentPage || saveCurrentPage;
    
    // Register for objects:loaded event - custom event for page loading completion
    canvas.on('objects:loaded', (options) => {
      console.log(`Objects loaded event received - ${options.count} objects loaded`);
      
      // Make sure all objects are properly set up
      canvas.getObjects().forEach(obj => {
        obj.visible = true;
        obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
      });
      
      // Force an immediate save to ensure the current page is stored
      setTimeout(() => {
        try {
          console.log("Triggering save after objects loaded event");
          if (typeof saveCurrentPageDirectly === 'function') {
            saveCurrentPageDirectly();
          } else if (typeof saveCurrentPage === 'function') {
            saveCurrentPage();
          } else if (context && typeof context.saveCurrentPage === 'function') {
            context.saveCurrentPage();
          }
        } catch (err) {
          console.error("Error saving after objects loaded:", err);
        }
      }, 500);
    });
    
    canvas.on('object:modified', (options) => {
      console.log("Object modified:", options.target ? options.target.type : "unknown");
      try {
        // Ensure the modified object is visible
        if (options.target) {
          options.target.visible = true;
          options.target.opacity = options.target.opacity === 0 ? 1 : options.target.opacity;
          
          // Apply grid snapping to final position if enabled
          if (context.snapObjectToGrid) {
            context.snapObjectToGrid(options.target);
          }
        }
        
        // Try all possible save methods
        if (typeof saveCurrentPageDirectly === 'function') {
          saveCurrentPageDirectly();
        } else if (typeof saveCurrentPage === 'function') {
          saveCurrentPage();
        } else if (context && typeof context.saveCurrentPage === 'function') {
          context.saveCurrentPage();
        } else if (context && context.documentManagement && typeof context.documentManagement.saveCurrentPage === 'function') {
          context.documentManagement.saveCurrentPage();
        } else if (window.$debugCanvas && typeof window.$debugCanvas.forceSave === 'function') {
          window.$debugCanvas.forceSave();
        } else {
          console.warn("saveCurrentPage function not available in object:modified event");
        }
      } catch (err) {
        console.error("Error in object:modified handler:", err);
      }
    });
    
    canvas.on('object:added', (options) => {
      console.log("Object added:", options.target ? options.target.type : "unknown");
      try {
        // Apply grid snapping to newly added objects
        if (options.target && context.snapObjectToGrid) {
          // Skip snapping for objects being created by drawing tools as they're still being sized
          // drawingObject is set during shape drawing operations
          if (!drawingObject || drawingObject !== options.target) {
            context.snapObjectToGrid(options.target);
          }
        }
        
        if (typeof saveCurrentPageDirectly === 'function') {
          saveCurrentPageDirectly();
        } else if (typeof saveCurrentPage === 'function') {
          saveCurrentPage();
        } else if (context && typeof context.saveCurrentPage === 'function') {
          context.saveCurrentPage();
        } else if (context && context.documentManagement && typeof context.documentManagement.saveCurrentPage === 'function') {
          context.documentManagement.saveCurrentPage();
        } else if (window.$debugCanvas && typeof window.$debugCanvas.forceSave === 'function') {
          window.$debugCanvas.forceSave();
        } else {
          console.warn("saveCurrentPage function not available in object:added event");
        }
      } catch (err) {
        console.error("Error in object:added handler:", err);
      }
    });
    
    canvas.on('object:removed', (options) => {
      console.log("Object removed:", options.target ? options.target.type : "unknown");
      try {
        if (typeof saveCurrentPageDirectly === 'function') {
          saveCurrentPageDirectly();
        } else if (typeof saveCurrentPage === 'function') {
          saveCurrentPage();
        } else if (context && typeof context.saveCurrentPage === 'function') {
          context.saveCurrentPage();
        } else if (context && context.documentManagement && typeof context.documentManagement.saveCurrentPage === 'function') {
          context.documentManagement.saveCurrentPage();
        } else if (window.$debugCanvas && typeof window.$debugCanvas.forceSave === 'function') {
          window.$debugCanvas.forceSave();
        } else {
          console.warn("saveCurrentPage function not available in object:removed event");
        }
      } catch (err) {
        console.error("Error in object:removed handler:", err);
      }
    });
    
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyboard);
    
    console.log("Canvas event handlers successfully registered");
  }

  /**
   * Remove event handlers from the canvas
   */
  function removeEventHandlers() {
    if (!canvas) return;
    
    canvas.off('mouse:down', handleMouseDown);
    canvas.off('mouse:move', handleMouseMove);
    canvas.off('mouse:up', handleMouseUp);
    canvas.off('mouse:dblclick', handleDoubleClick);
    canvas.off('selection:created', handleObjectSelected);
    canvas.off('selection:updated', handleObjectSelected);
    canvas.off('selection:cleared', handleSelectionCleared);
    
    window.removeEventListener('keydown', handleKeyboard);
  }

  // Return the event handler functions
  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleObjectSelected,
    handleSelectionCleared,
    handleRightClick,
    handleScroll,
    handleImageUpload,
    handleKeyboard,
    registerEventHandlers,
    removeEventHandlers,
    
    // Getter for drawingObject and isDrawing state
    getDrawingObject: () => drawingObject,
    isDrawing: () => isDrawing
  };
}