<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType, currentToolOptions } from '$lib/stores/toolbar';
  import * as fabric from 'fabric';
  import TextFlow from '$lib/utils/text-flow';
  
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
        masterPageId: null
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
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);
    canvas.on('selection:cleared', handleSelectionCleared);
    
    // Listen for changes to update store
    canvas.on('object:modified', saveCurrentPage);
    canvas.on('object:added', saveCurrentPage);
    canvas.on('object:removed', saveCurrentPage);
    
    // Setup canvas for initial tool
    setupCanvasForTool($activeTool);
    
    // Initialize TextFlow manager
    textFlow = new TextFlow(canvas);
    
    return () => {
      // Clean up canvas on component unmount
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('selection:created', handleObjectSelected);
      canvas.off('selection:updated', handleObjectSelected);
      canvas.off('selection:cleared', handleSelectionCleared);
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
      
      // Apply master page if specified (placeholder for future implementation)
      if (pageToLoad.masterPageId) {
        // This will be implemented later
        console.log(`Master page ${pageToLoad.masterPageId} will be applied`);
      }
    }
  }
  
  function saveCurrentPage() {
    if (!canvas || !$currentPage || !$currentDocument) return;
    
    const pageIndex = $currentDocument.pages.findIndex(p => p.id === $currentPage);
    if (pageIndex >= 0) {
      // Serialize canvas with custom properties (like textbox IDs and link references)
      const canvasJSON = JSON.stringify(canvas.toJSON(['id', 'linkedObjectIds']));
      
      const updatedPages = [...$currentDocument.pages];
      updatedPages[pageIndex] = {
        ...updatedPages[pageIndex],
        canvasJSON: canvasJSON
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
      obj.selectable = toolType === ToolType.SELECT;
      obj.evented = toolType === ToolType.SELECT;
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
    
    dispatch('objectselected', { object: activeObject, objectType: activeObject?.type });
  }
  
  function handleSelectionCleared() {
    selectedObject = null;
    dispatch('objectselected', { object: null, objectType: null });
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