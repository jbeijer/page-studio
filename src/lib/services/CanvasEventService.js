/**
 * CanvasEventService.js
 * Centralized service for canvas event handling in PageStudio
 * 
 * This service handles all canvas event management including:
 * - Mouse interactions (click, move, up, double click)
 * - Object selection
 * - Drawing operations
 * - Keyboard shortcuts
 * - Clipboard operations
 */
import { fabric } from 'fabric';
import { get } from 'svelte/store';
import { ToolType } from '$lib/stores/toolbar';
import { createTextObject } from '$lib/utils/fabric-helpers';
import canvasService from './CanvasService';
import documentService from './DocumentService';

class CanvasEventService {
  constructor() {
    // Core properties
    this.canvas = null;
    this.dispatch = null;
    this.imageInput = null;
    this.textFlow = null;
    this.initialized = false;
    
    // Event state
    this.isDrawing = false;
    this.drawingObject = null;
    
    // Event handlers with bound 'this' context
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.handleObjectSelected = this.handleObjectSelected.bind(this);
    this.handleSelectionCleared = this.handleSelectionCleared.bind(this);
    this.handleRightClick = this.handleRightClick.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleImageUpload = this.handleImageUpload.bind(this);
    this.handleKeyboard = this.handleKeyboard.bind(this);
    this.registerEventHandlers = this.registerEventHandlers.bind(this);
    this.removeEventHandlers = this.removeEventHandlers.bind(this);
    
    // Tool-specific handlers
    this.handleTextToolMouseDown = this.handleTextToolMouseDown.bind(this);
    this.handleImageToolMouseDown = this.handleImageToolMouseDown.bind(this);
    this.handleRectangleToolMouseDown = this.handleRectangleToolMouseDown.bind(this);
    this.handleEllipseToolMouseDown = this.handleEllipseToolMouseDown.bind(this);
    this.handleLineToolMouseDown = this.handleLineToolMouseDown.bind(this);
    this.handleRectangleToolMouseMove = this.handleRectangleToolMouseMove.bind(this);
    this.handleEllipseToolMouseMove = this.handleEllipseToolMouseMove.bind(this);
    this.handleLineToolMouseMove = this.handleLineToolMouseMove.bind(this);
    
    // Core methods
    this.initialize = this.initialize.bind(this);
    this.cleanup = this.cleanup.bind(this);
    this.setupContextMenu = this.setupContextMenu.bind(this);
    this.updateTextFlow = this.updateTextFlow.bind(this);
  }

  /**
   * Initialize the canvas event service
   * @param {Object} options - Initialization options
   * @returns {CanvasEventService} This service instance for chaining
   */
  initialize(options = {}) {
    console.log('CanvasEventService: Initializing with options', options);
    
    // Extract required properties from options
    this.canvas = options.canvas || null;
    this.dispatch = options.dispatch || (() => {});
    this.imageInput = options.imageInput || null;
    this.textFlow = options.textFlow || null;
    this.generateId = options.generateId || (() => `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    this.toolStore = options.toolStore || null;
    this.toolOptionsStore = options.toolOptionsStore || null;
    this.activeTool = options.activeTool || ToolType.SELECT;
    this.currentToolOptions = options.currentToolOptions || {};
    
    // Context menu state setup
    this.contextMenuState = {
      showContextMenu: false,
      contextMenuX: 0,
      contextMenuY: 0,
      contextMenuObject: null
    };
    
    // Register handlers with the canvas
    if (this.canvas) {
      this.registerEventHandlers();
    }
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$canvasEventService = this;
    }
    
    this.initialized = true;
    return this;
  }
  
  /**
   * Set up context menu properties
   * @param {Object} contextMenuOptions - Context menu configuration
   */
  setupContextMenu(contextMenuOptions) {
    this.contextMenuState = {
      ...this.contextMenuState,
      ...contextMenuOptions
    };
  }
  
  /**
   * Generate a unique ID for objects
   * @returns {string} Unique ID
   */
  generateObjectId() {
    return this.generateId ? this.generateId() : `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  
  /**
   * Update text flow when text content changes
   * @param {Object} textObject - The text object to update
   */
  updateTextFlow(textObject) {
    if (!textObject || !this.textFlow) return;
    
    // If the textbox has linked objects, update the text flow
    if (textObject.linkedObjectIds && textObject.linkedObjectIds.length > 0) {
      this.textFlow.updateTextFlow(textObject.id);
      this.canvas.renderAll();
    }
  }
  
  /**
   * Handle mouse down events on the canvas
   * @param {Object} options - Fabric.js event options
   */
  handleMouseDown(options) {
    if (!this.canvas) {
      console.error("No canvas available in handleMouseDown");
      return;
    }
    
    try {
      const pointer = this.canvas.getPointer(options.e);
      if (!pointer) {
        console.error("Could not get pointer position in handleMouseDown");
        return;
      }
      
      // Get the current active tool 
      const currentActiveTool = this.activeTool;
      
      console.log(`Mouse down at position: x=${pointer.x}, y=${pointer.y}, Active tool: ${currentActiveTool}`);
      this.isDrawing = true;
      
      // Call appropriate handler based on current tool
      switch (currentActiveTool) {
        case ToolType.SELECT:
          // Selection is handled by Fabric.js automatically
          console.log("Select tool active - using Fabric.js built-in selection");
          break;
          
        case ToolType.TEXT:
          console.log("Text tool active - creating text object");
          this.handleTextToolMouseDown(options, pointer);
          break;
          
        case ToolType.IMAGE:
          console.log("Image tool active - opening file dialog");
          this.handleImageToolMouseDown(options);
          break;
          
        case ToolType.RECTANGLE:
          console.log("Rectangle tool active - creating rectangle object");
          this.handleRectangleToolMouseDown(options, pointer);
          break;
          
        case ToolType.ELLIPSE:
          console.log("Ellipse tool active - creating ellipse object");
          this.handleEllipseToolMouseDown(options, pointer);
          break;
          
        case ToolType.LINE:
          console.log("Line tool active - creating line object");
          this.handleLineToolMouseDown(options, pointer);
          break;
          
        default:
          console.log(`Unknown tool active: ${currentActiveTool}`);
          break;
      }
    } catch (error) {
      console.error("Error in handleMouseDown:", error);
      this.isDrawing = false;
    }
  }

  /**
   * Handle Text tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  handleTextToolMouseDown(options, pointer) {
    if (options.target) return;
    
    console.log("Text tool mouse down event triggered at", pointer.x, pointer.y);
        
    const textOptions = this.currentToolOptions;
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
        id: this.generateObjectId(),
        linkedObjectIds: [],
        objectCaching: true
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
      
      this.canvas.add(text);
      console.log("Text added to canvas. Canvas now has", this.canvas.getObjects().length, "objects");
      
      this.canvas.setActiveObject(text);
      
      // Try to enter editing mode if supported
      if (typeof text.enterEditing === 'function') {
        text.enterEditing();
        console.log("Entered text editing mode");
      }
      
      // Force canvas rendering
      this.canvas.requestRenderAll();
      this.canvas.renderAll();
      
      this.isDrawing = false;
      
      // Add text to TextFlow manager
      if (this.textFlow) {
        // Hook up events when textboxes are linked
        text.on('modified', () => this.updateTextFlow(text));
        text.on('changed', () => this.updateTextFlow(text));
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
  handleImageToolMouseDown(options) {
    // Open file dialog when the canvas is clicked
    if (this.imageInput && !options.target) {
      this.imageInput.click();
      this.isDrawing = false;
    }
  }

  /**
   * Handle Rectangle tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  handleRectangleToolMouseDown(options, pointer) {
    const rectOptions = this.currentToolOptions;
    
    try {
      this.drawingObject = new fabric.Rect({
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
        evented: true
      });
      
      if (!this.drawingObject) {
        console.error("ERROR: Failed to create rectangle object");
        return;
      }
      
      this.canvas.add(this.drawingObject);
      this.canvas.requestRenderAll();
      console.log("Rectangle created:", this.drawingObject);
    } catch (error) {
      console.error("ERROR: Error creating rectangle:", error);
      this.drawingObject = null;
    }
  }

  /**
   * Handle Ellipse tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  handleEllipseToolMouseDown(options, pointer) {
    const ellipseOptions = this.currentToolOptions;
    
    try {
      this.drawingObject = new fabric.Ellipse({
        left: pointer.x,
        top: pointer.y,
        rx: 0,
        ry: 0,
        fill: ellipseOptions.fill || '#cccccc',
        stroke: ellipseOptions.stroke || '#000000',
        strokeWidth: ellipseOptions.strokeWidth || 1,
        selectable: false,
        evented: true
      });
      
      if (!this.drawingObject) {
        console.error("ERROR: Failed to create ellipse object");
        return;
      }
      
      this.canvas.add(this.drawingObject);
    } catch (error) {
      console.error("ERROR: Error creating ellipse:", error);
      this.drawingObject = null;
    }
  }

  /**
   * Handle Line tool mouse down
   * @param {Object} options - Fabric.js event options
   * @param {Object} pointer - Canvas pointer coordinates
   */
  handleLineToolMouseDown(options, pointer) {
    const lineOptions = this.currentToolOptions;
    
    try {
      this.drawingObject = new fabric.Line(
        [pointer.x, pointer.y, pointer.x, pointer.y], 
        {
          stroke: lineOptions.stroke || '#000000',
          strokeWidth: lineOptions.strokeWidth || 1,
          selectable: false,
          evented: true
        }
      );
      
      if (!this.drawingObject) {
        console.error("ERROR: Failed to create line object");
        return;
      }
      
      this.canvas.add(this.drawingObject);
    } catch (error) {
      console.error("ERROR: Error creating line:", error);
      this.drawingObject = null;
    }
  }

  /**
   * Handle mouse move events on the canvas
   * @param {Object} options - Fabric.js event options
   */
  handleMouseMove(options) {
    if (!this.isDrawing || !this.drawingObject) return;
    if (!this.canvas) {
      console.error("No canvas available in handleMouseMove");
      return;
    }
    
    try {
      const pointer = this.canvas.getPointer(options.e);
      if (!pointer) {
        console.error("Could not get pointer position in handleMouseMove");
        return;
      }
      
      // Call appropriate handler based on current tool
      switch (this.activeTool) {
        case ToolType.RECTANGLE:
          this.handleRectangleToolMouseMove(pointer);
          break;
          
        case ToolType.ELLIPSE:
          this.handleEllipseToolMouseMove(pointer);
          break;
          
        case ToolType.LINE:
          this.handleLineToolMouseMove(pointer);
          break;
      }
      
      // Ensure the canvas is rendered
      try {
        this.canvas.renderAll();
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
  handleRectangleToolMouseMove(pointer) {
    if (!this.drawingObject || typeof this.drawingObject.set !== 'function') {
      console.error("Invalid rectangle object in handleRectangleToolMouseMove");
      return;
    }
    
    try {
      // Update rectangle dimensions
      const width = Math.abs(pointer.x - this.drawingObject.left);
      const height = Math.abs(pointer.y - this.drawingObject.top);
      
      // Adjust position if drawing from bottom-right to top-left
      if (pointer.x < this.drawingObject.left) {
        this.drawingObject.set({ left: pointer.x });
      }
      if (pointer.y < this.drawingObject.top) {
        this.drawingObject.set({ top: pointer.y });
      }
      
      this.drawingObject.set({
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
  handleEllipseToolMouseMove(pointer) {
    if (!this.drawingObject || typeof this.drawingObject.set !== 'function') {
      console.error("Invalid ellipse object in handleEllipseToolMouseMove");
      return;
    }
    
    try {
      // Update ellipse dimensions
      const rx = Math.abs(pointer.x - this.drawingObject.left) / 2;
      const ry = Math.abs(pointer.y - this.drawingObject.top) / 2;
      
      // Adjust position to keep center of ellipse fixed
      const centerX = Math.min(pointer.x, this.drawingObject.left) + rx;
      const centerY = Math.min(pointer.y, this.drawingObject.top) + ry;
      
      this.drawingObject.set({
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
  handleLineToolMouseMove(pointer) {
    // Update line end point
    if (this.drawingObject && typeof this.drawingObject.set === 'function') {
      this.drawingObject.set({
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
  handleMouseUp() {
    this.isDrawing = false;
    
    if (!this.canvas) {
      console.error("No canvas available in handleMouseUp");
      return;
    }
    
    if (this.drawingObject) {
      try {
        // Make the drawn object properly set for interactivity
        this.drawingObject.set({
          selectable: this.activeTool === ToolType.SELECT, // Only selectable in SELECT mode
          evented: true, // Always evented to ensure visibility
          hoverCursor: this.activeTool === ToolType.SELECT ? 'move' : 'default'
        });
        
        // Clean up tiny objects (likely accidental clicks)
        if (this.activeTool === ToolType.RECTANGLE || this.activeTool === ToolType.ELLIPSE) {
          if ((this.drawingObject.width < 5 && this.drawingObject.height < 5) || 
              (this.drawingObject.rx < 2.5 && this.drawingObject.ry < 2.5)) {
            console.log("Removing tiny shape object (likely accidental)");
            this.canvas.remove(this.drawingObject);
          }
        } else if (this.activeTool === ToolType.LINE) {
          const dx = this.drawingObject.x2 - this.drawingObject.x1;
          const dy = this.drawingObject.y2 - this.drawingObject.y1;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 5) {
            console.log("Removing tiny line object (likely accidental)");
            this.canvas.remove(this.drawingObject);
          }
        }
        
        // Clear drawing object reference
        this.drawingObject = null;
        
        // Request a complete render cycle with error handling
        try {
          console.log("Requesting canvas render after mouse up");
          this.canvas.requestRenderAll();
          this.canvas.renderAll();
        } catch (renderError) {
          console.error("Error rendering canvas after mouse up:", renderError);
        }
      } catch (error) {
        console.error("Error in handleMouseUp:", error);
        this.drawingObject = null;
      }
    }
  }

  /**
   * Handle double click events on the canvas
   * @param {Object} options - Fabric.js event options
   */
  handleDoubleClick(options) {
    if (!this.canvas) return;
    
    const target = options.target;
    
    // Handle double-clicking on text objects to enter edit mode
    if (target && (target.type === 'textbox' || target.type === 'text' || target.type === 'i-text')) {
      this.canvas.setActiveObject(target);
      
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
  handleObjectSelected(options) {
    if (!this.canvas) return;
    
    const activeObject = this.canvas.getActiveObject();
    
    // Make sure text objects have an ID for text flow
    if (activeObject && activeObject.type === 'textbox' && !activeObject.id) {
      activeObject.id = this.generateObjectId();
      if (!activeObject.linkedObjectIds) {
        activeObject.linkedObjectIds = [];
      }
    }
    
    // If the selected object is from a master page, pass that info
    const isMasterObject = activeObject && activeObject.fromMaster === true;
    
    this.dispatch('objectselected', { 
      object: activeObject, 
      objectType: activeObject?.type,
      fromMaster: isMasterObject,
      masterId: isMasterObject ? activeObject.masterId : null,
      masterObjectId: isMasterObject ? activeObject.masterObjectId : null,
      overridable: isMasterObject ? activeObject.overridable : null
    });
  }

  /**
   * Handle selection cleared events
   */
  handleSelectionCleared() {
    this.dispatch('objectselected', { object: null, objectType: null });
  }

  /**
   * Handle right-click events on canvas objects
   * @param {Object} options - Fabric.js mouse event options
   */
  handleRightClick(options) {
    options.e.preventDefault();
    
    if (options.target && options.target.fromMaster) {
      // Right-click on a master page object
      this.contextMenuState = {
        contextMenuX: options.e.clientX,
        contextMenuY: options.e.clientY,
        contextMenuObject: options.target,
        showContextMenu: true
      };
      
      // Also dispatch event for external components
      this.dispatch('masterObjectRightClick', {
        object: options.target,
        x: options.e.clientX,
        y: options.e.clientY
      });
    } else {
      // Hide the context menu if clicking elsewhere
      this.contextMenuState.showContextMenu = false;
    }
    
    return false;
  }

  /**
   * Handle scroll events on the canvas container
   * @param {Event} event - Scroll event
   */
  handleScroll(event) {
    if (this.canvasContainer) {
      this.canvasScrollX = this.canvasContainer.scrollLeft;
      this.canvasScrollY = this.canvasContainer.scrollTop;
    }
  }

  /**
   * Handle image upload from file input
   * @param {Event} event - File input change event
   */
  handleImageUpload(event) {
    if (!event.target.files || !event.target.files[0]) return;
    
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imgSrc = e.target.result;
      
      // Create a temporary image to get dimensions
      const img = new Image();
      img.onload = () => {
        const imageOptions = this.currentToolOptions;
        
        console.log("Image loaded, creating Fabric image object");
        
        // Create fabric image object with better error handling
        try {
          fabric.Image.fromURL(imgSrc, (fabricImg) => {
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
              left: (this.canvas.width - img.width * scale) / 2,
              top: (this.canvas.height - img.height * scale) / 2,
              scaleX: scale,
              scaleY: scale,
              visible: true,
              evented: true,
              selectable: true,
              id: this.generateObjectId(),
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
            this.canvas.add(fabricImg);
            
            // Ensure object is still visible after adding
            fabricImg.visible = true;
            fabricImg.opacity = 1;
            
            this.canvas.setActiveObject(fabricImg);
            
            // Ensure multiple renders to force visibility
            this.canvas.requestRenderAll();
            this.canvas.renderAll();
            
            // Secondary render cycle
            setTimeout(() => {
              console.log("Secondary render cycle for image");
              fabricImg.visible = true;
              this.canvas.requestRenderAll();
              this.canvas.renderAll();
            }, 100);
            
            // Reset file input for future uploads
            event.target.value = '';
            
            // Save current page after adding image
            setTimeout(() => {
              documentService.saveCurrentPage();
            }, 500);
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
  handleKeyboard(e) {
    // Skip keyboard shortcuts if in a text input
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable) {
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      // Ctrl+Z or Cmd+Z for Undo
      e.preventDefault();
      canvasService.undo();
    } else if (
      ((e.ctrlKey || e.metaKey) && e.key === 'y') || 
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
    ) {
      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z for Redo
      e.preventDefault();
      canvasService.redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      // Ctrl+C or Cmd+C for Copy
      if (this.canvas && this.canvas.getActiveObject()) {
        e.preventDefault();
        canvasService.copySelectedObjects();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      // Ctrl+X or Cmd+X for Cut
      if (this.canvas && this.canvas.getActiveObject()) {
        e.preventDefault();
        canvasService.cutSelectedObjects();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      // Ctrl+V or Cmd+V for Paste
      e.preventDefault();
      canvasService.pasteObjects();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Delete selected objects
      if (this.canvas && this.canvas.getActiveObject()) {
        canvasService.deleteSelectedObjects();
      }
    }
  }

  /**
   * Register event handlers with the canvas
   */
  registerEventHandlers() {
    if (!this.canvas) {
      console.error("CanvasEventService: Cannot register event handlers - No canvas available");
      return;
    }
    
    // First, remove any existing event handlers to avoid duplication
    try {
      this.removeEventHandlers();
    } catch (err) {
      console.warn("Error when cleaning up old event handlers:", err);
    }
    
    console.log("CanvasEventService: Registering canvas event handlers");
    
    // Set up mouse event handlers
    this.canvas.on('mouse:down', (options) => {
      console.log(`Mouse down event detected. Active tool: ${this.activeTool}`, 
        options.pointer ? { x: options.pointer.x, y: options.pointer.y } : "No pointer data"
      );
      
      // Handle right-clicks separately
      if (options.e && options.e.button === 2) {
        this.handleRightClick(options);
        return;
      }
      
      // Call the normal handler for non-right-clicks
      this.handleMouseDown(options);
    });
    
    this.canvas.on('mouse:move', this.handleMouseMove);
    this.canvas.on('mouse:up', this.handleMouseUp);
    this.canvas.on('mouse:dblclick', this.handleDoubleClick);
    this.canvas.on('selection:created', this.handleObjectSelected);
    this.canvas.on('selection:updated', this.handleObjectSelected);
    this.canvas.on('selection:cleared', this.handleSelectionCleared);
    
    // Register for objects:loaded event - custom event for page loading completion
    this.canvas.on('objects:loaded', (options) => {
      console.log(`Objects loaded event received - ${options.count} objects loaded`);
      
      // Make sure all objects are properly set up
      this.canvas.getObjects().forEach(obj => {
        obj.visible = true;
        obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
      });
      
      // Force an immediate save to ensure the current page is stored
      setTimeout(() => {
        try {
          console.log("Triggering save after objects loaded event");
          documentService.saveCurrentPage();
        } catch (err) {
          console.error("Error saving after objects loaded:", err);
        }
      }, 500);
    });
    
    this.canvas.on('object:modified', (options) => {
      console.log("Object modified:", options.target ? options.target.type : "unknown");
      try {
        // Ensure the modified object is visible
        if (options.target) {
          options.target.visible = true;
          options.target.opacity = options.target.opacity === 0 ? 1 : options.target.opacity;
        }
        
        // Save the changes
        documentService.saveCurrentPage();
      } catch (err) {
        console.error("Error in object:modified handler:", err);
      }
    });
    
    this.canvas.on('object:added', (options) => {
      console.log("Object added:", options.target ? options.target.type : "unknown");
      try {
        documentService.saveCurrentPage();
      } catch (err) {
        console.error("Error in object:added handler:", err);
      }
    });
    
    this.canvas.on('object:removed', (options) => {
      console.log("Object removed:", options.target ? options.target.type : "unknown");
      try {
        documentService.saveCurrentPage();
      } catch (err) {
        console.error("Error in object:removed handler:", err);
      }
    });
    
    // Add keyboard event listener
    window.addEventListener('keydown', this.handleKeyboard);
    
    console.log("CanvasEventService: Canvas event handlers successfully registered");
    
    return true;
  }

  /**
   * Remove event handlers from the canvas
   */
  removeEventHandlers() {
    if (!this.canvas) return;
    
    console.log("CanvasEventService: Removing event handlers");
    
    // Remove all event handlers
    this.canvas.off('mouse:down');
    this.canvas.off('mouse:move');
    this.canvas.off('mouse:up');
    this.canvas.off('mouse:dblclick');
    this.canvas.off('selection:created');
    this.canvas.off('selection:updated');
    this.canvas.off('selection:cleared');
    this.canvas.off('object:modified');
    this.canvas.off('object:added');
    this.canvas.off('object:removed');
    this.canvas.off('objects:loaded');
    
    // Remove keyboard event listener
    window.removeEventListener('keydown', this.handleKeyboard);
    
    return true;
  }

  /**
   * Get the current draw state
   * @returns {Object} Draw state with isDrawing and drawingObject
   */
  getDrawState() {
    return {
      isDrawing: this.isDrawing,
      drawingObject: this.drawingObject
    };
  }

  /**
   * Update the active tool and tool options
   * @param {Object} toolInfo - Tool information
   */
  updateToolState(toolInfo = {}) {
    if (toolInfo.activeTool !== undefined) {
      this.activeTool = toolInfo.activeTool;
    }
    
    if (toolInfo.currentToolOptions !== undefined) {
      this.currentToolOptions = toolInfo.currentToolOptions;
    }
  }

  /**
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('CanvasEventService: Cleaning up resources');
    
    // Remove event handlers
    this.removeEventHandlers();
    
    // Clear references
    this.canvas = null;
    this.dispatch = null;
    this.imageInput = null;
    this.textFlow = null;
    this.drawingObject = null;
    this.isDrawing = false;
    
    return true;
  }
}

// Create singleton instance
const canvasEventService = new CanvasEventService();

export default canvasEventService;