/**
 * Canvas.events.js
 * Manages event handling for the Canvas component
 */

import { ToolType } from '$lib/stores/toolbar';

/**
 * Create event handling functions for the Canvas component
 * @param {Object} context - Canvas context with shared references and methods
 * @returns {Object} Event handling functions
 */
export function createEventHandlers(context) {
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
    if (!canvas) return;
    
    const pointer = canvas.getPointer(options.e);
    isDrawing = true;
    
    // Call appropriate handler based on current tool
    switch (context.activeTool) {
      case ToolType.SELECT:
        // Selection is handled by Fabric.js automatically
        break;
        
      case ToolType.TEXT:
        handleTextToolMouseDown(options, pointer);
        break;
        
      case ToolType.IMAGE:
        handleImageToolMouseDown(options);
        break;
        
      case ToolType.RECTANGLE:
        handleRectangleToolMouseDown(options, pointer);
        break;
        
      case ToolType.ELLIPSE:
        handleEllipseToolMouseDown(options, pointer);
        break;
        
      case ToolType.LINE:
        handleLineToolMouseDown(options, pointer);
        break;
    }
  }

  /**
   * Handle Text tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleTextToolMouseDown(options, pointer) {
    if (options.target) return;
    
    const textOptions = context.currentToolOptions;
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
      // Hook up events when textboxes are linked
      text.on('modified', () => updateTextFlow(text));
      text.on('changed', () => updateTextFlow(text));
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
  }

  /**
   * Handle Ellipse tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleEllipseToolMouseDown(options, pointer) {
    const ellipseOptions = context.currentToolOptions;
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
  }

  /**
   * Handle Line tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleLineToolMouseDown(options, pointer) {
    const lineOptions = context.currentToolOptions;
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
  }

  /**
   * Handle mouse move events on the canvas
   * @param {Object} options - Fabric.js event options
   */
  function handleMouseMove(options) {
    if (!isDrawing || !drawingObject) return;
    
    const pointer = canvas.getPointer(options.e);
    
    switch (context.activeTool) {
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
    
    canvas.renderAll();
  }

  /**
   * Handle Rectangle tool mouse move
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleRectangleToolMouseMove(pointer) {
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
  }

  /**
   * Handle Ellipse tool mouse move
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleEllipseToolMouseMove(pointer) {
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
  }

  /**
   * Handle Line tool mouse move
   * @param {Object} pointer - Canvas pointer coordinates
   */
  function handleLineToolMouseMove(pointer) {
    // Update line end point
    drawingObject.set({
      x2: pointer.x,
      y2: pointer.y
    });
  }

  /**
   * Handle mouse up events on the canvas
   */
  function handleMouseUp() {
    isDrawing = false;
    
    if (drawingObject) {
      // Make the drawn object properly set for interactivity
      drawingObject.set({
        selectable: context.activeTool === ToolType.SELECT, // Only selectable in SELECT mode
        evented: true, // Always evented to ensure visibility
        hoverCursor: context.activeTool === ToolType.SELECT ? 'move' : 'default'
      });
      
      // Clean up tiny objects (likely accidental clicks)
      if (context.activeTool === ToolType.RECTANGLE || context.activeTool === ToolType.ELLIPSE) {
        if (drawingObject.width < 5 && drawingObject.height < 5) {
          canvas.remove(drawingObject);
        }
      } else if (context.activeTool === ToolType.LINE) {
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

  /**
   * Handle double click events on the canvas
   * @param {Object} options - Fabric.js event options
   */
  function handleDoubleClick(options) {
    if (!canvas) return;
    
    const target = options.target;
    
    // Handle double-clicking on text objects to enter edit mode
    if (target && target.type === 'textbox') {
      canvas.setActiveObject(target);
      target.enterEditing();
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
    
    // Set up mouse event handlers
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:dblclick', handleDoubleClick);
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);
    canvas.on('selection:cleared', handleSelectionCleared);
    
    // Add right-click handler
    canvas.on('mouse:down', function(options) {
      if (options.e.button === 2) { // Right click
        handleRightClick(options);
      }
    });
    
    // Listen for changes to update store
    canvas.on('object:modified', saveCurrentPage);
    canvas.on('object:added', saveCurrentPage);
    canvas.on('object:removed', saveCurrentPage);
    
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyboard);
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