/**
 * CanvasService.js
 * Centralized service for canvas operations in PageStudio
 * 
 * This service handles all canvas-related functionality including:
 * - Canvas initialization and cleanup
 * - Object creation and manipulation
 * - Layer management
 * - Working with Fabric.js canvas
 */
import { fabric } from 'fabric';
import { get } from 'svelte/store';
import { currentDocument, currentPage } from '$lib/stores/document';
import { canvasReady, updateCanvasReadyStatus } from '$lib/stores/canvasReady';
import { activeTool, currentToolOptions } from '$lib/stores/toolbar';
import documentService from './DocumentService';
import canvasEventService from './CanvasEventService';

class CanvasService {
  constructor() {
    this.canvas = null;
    this.initialized = false;
    this.historyManager = null;
    
    // Bind methods to ensure consistent 'this' context
    this.initialize = this.initialize.bind(this);
    this.createCanvas = this.createCanvas.bind(this);
    this.resetCanvas = this.resetCanvas.bind(this);
    this.createObject = this.createObject.bind(this);
    this.getSelectedObject = this.getSelectedObject.bind(this);
    this.deleteSelectedObjects = this.deleteSelectedObjects.bind(this);
    this.copySelectedObjects = this.copySelectedObjects.bind(this);
    this.pasteObjects = this.pasteObjects.bind(this);
    this.bringForward = this.bringForward.bind(this);
    this.sendBackward = this.sendBackward.bind(this);
    this.bringToFront = this.bringToFront.bind(this);
    this.sendToBack = this.sendToBack.bind(this);
    this.undo = this.undo.bind(this);
    this.redo = this.redo.bind(this);
    this.isCanvasReadyForOperations = this.isCanvasReadyForOperations.bind(this);
    this.setupEventHandlers = this.setupEventHandlers.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the canvas service
   * @param {Object} canvas - Fabric.js canvas instance
   * @param {Object} options - Additional initialization options
   * @returns {CanvasService} This service instance for chaining
   */
  initialize(canvas, options = {}) {
    console.log('CanvasService: Initializing with canvas reference');
    
    // Verify the canvas parameter is actually a Fabric.js canvas instance
    if (!canvas || !canvas.add || typeof canvas.add !== 'function' || !canvas.on || typeof canvas.on !== 'function') {
      console.error('CanvasService: Invalid canvas instance provided. Canvas must be a Fabric.js canvas instance with methods like "add" and "on"');
      return this;
    }
    
    this.canvas = canvas;
    this.options = options;
    this.dispatch = options.dispatch || (() => {});
    this.historyManager = options.historyManager || null;
    
    // Initialize event service if we have a canvas
    if (this.canvas) {
      this.setupEventHandlers();
    }
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$canvasService = this;
    }
    
    this.initialized = true;
    return this;
  }
  
  /**
   * Set up event handlers for the canvas
   */
  setupEventHandlers() {
    if (!this.canvas) {
      console.warn('CanvasService: Cannot setup event handlers - Canvas is null or undefined');
      return false;
    }
    
    console.log('CanvasService: Setting up event handlers');
    
    // Initialize canvas event service
    canvasEventService.initialize({
      canvas: this.canvas,
      dispatch: this.dispatch,
      imageInput: this.options.imageInput,
      textFlow: this.options.textFlow,
      generateId: this.options.generateId,
      activeTool: get(activeTool),
      currentToolOptions: get(currentToolOptions)
    });
    
    // Set up subscription to tool store changes
    if (typeof window !== 'undefined') {
      // Track current subscriptions for cleanup
      this.toolStoreUnsubscribe = activeTool.subscribe(tool => {
        canvasEventService.updateToolState({ activeTool: tool });
      });
      
      this.toolOptionsStoreUnsubscribe = currentToolOptions.subscribe(options => {
        canvasEventService.updateToolState({ currentToolOptions: options });
      });
    }
    
    return true;
  }

  /**
   * Create and initialize a Fabric.js canvas
   * @param {HTMLCanvasElement} canvasElement - Canvas DOM element
   * @param {Object} options - Canvas initialization options
   * @returns {fabric.Canvas} The initialized Fabric.js canvas
   */
  createCanvas(canvasElement, options = {}) {
    console.log('CanvasService: Creating canvas');
    
    try {
      // Default options
      const defaultOptions = {
        width: 1240,
        height: 1754,
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: 'white'
      };
      
      // Merge default options with provided options
      const canvasOptions = { ...defaultOptions, ...options };
      
      // Create canvas
      this.canvas = new fabric.Canvas(canvasElement, canvasOptions);
      
      // Update global reference
      if (typeof window !== 'undefined') {
        window.$canvas = this.canvas;
      }
      
      // Store additional options for service initialization
      this.options = {
        ...this.options,
        ...options,
        imageInput: options.imageInput,
        textFlow: options.textFlow,
        generateId: options.generateId,
        dispatch: options.dispatch
      };
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Set canvas ready status
      updateCanvasReadyStatus({
        hasCanvas: true,
        hasDocument: !!get(currentDocument),
        hasPage: !!get(currentPage),
        isFullyInitialized: true,
        hasActiveObjects: this.canvas.getObjects().length > 0,
        hasError: false,
        errorMessage: null
      });
      
      // Initialize document service with canvas reference
      documentService.initialize(this.canvas);
      
      console.log('CanvasService: Canvas created successfully');
      return this.canvas;
    } catch (error) {
      console.error('CanvasService: Canvas initialization failed:', error);
      
      updateCanvasReadyStatus({
        hasCanvas: false,
        hasError: true,
        errorMessage: `Canvas initialization failed: ${error.message}`
      });
      
      return null;
    }
  }

  /**
   * Reset the canvas to a clean state
   * @returns {boolean} Success status
   */
  resetCanvas() {
    if (!this.canvas) {
      console.warn('CanvasService: Cannot reset canvas - No canvas available');
      return false;
    }
    
    try {
      console.log('CanvasService: Performing complete canvas reset');
      
      // Disable all event handlers temporarily
      this.canvas.off();
      
      // Clear all canvas contents
      this.canvas.clear();
      this.canvas.backgroundColor = 'white';
      
      // Reset internal state completely
      this.canvas._objects = [];
      if (this.canvas._objectsToRender) this.canvas._objectsToRender = [];
      this.canvas.discardActiveObject();
      this.canvas.__eventListeners = {};
      
      // Reset additional internal state
      if (this.canvas._activeObject) this.canvas._activeObject = null;
      if (this.canvas._hoveredTarget) this.canvas._hoveredTarget = null;
      if (this.canvas._currentTransform) this.canvas._currentTransform = null;
      
      // Reset fabric.js-specific state if accessible
      try {
        if (typeof fabric !== 'undefined' && fabric.Canvas) {
          fabric.Canvas.activeInstance = null;
        }
      } catch (err) {
        console.warn('CanvasService: Could not reset fabric.js global state', err);
      }
      
      // Clear global references
      if (typeof window !== 'undefined') {
        window._canvasObjects = null;
        window._previousPageBackup = null;
        window.$emergencyBackup = null;
        
        // Clear any timers
        if (window._pageSaveTimeout) {
          clearTimeout(window._pageSaveTimeout);
          window._pageSaveTimeout = null;
        }
      }
      
      // Force multiple renders to ensure clean state
      this.canvas.requestRenderAll();
      this.canvas.renderAll();
      
      setTimeout(() => {
        this.canvas.requestRenderAll();
        this.canvas.renderAll();
      }, 50);
      
      console.log('CanvasService: Canvas reset complete');
      return true;
    } catch (err) {
      console.error('CanvasService: Error during canvas reset:', err);
      return false;
    }
  }

  /**
   * Create a new object on the canvas
   * @param {string} type - Type of object to create (rect, circle, textbox, etc.)
   * @param {Object} properties - Object properties
   * @returns {fabric.Object} The created object
   */
  createObject(type, properties = {}) {
    if (!this.canvas) {
      console.warn('CanvasService: Cannot create object - No canvas available');
      return null;
    }
    
    // Default position if not specified
    if (properties.left === undefined) properties.left = 100;
    if (properties.top === undefined) properties.top = 100;
    
    // Generate ID if not provided
    if (!properties.id) {
      properties.id = 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }
    
    try {
      let object;
      
      switch (type.toLowerCase()) {
        case 'rect':
        case 'rectangle':
          object = new fabric.Rect({
            width: 100,
            height: 100,
            fill: '#cccccc',
            ...properties
          });
          break;
          
        case 'circle':
          object = new fabric.Circle({
            radius: 50,
            fill: '#cccccc',
            ...properties
          });
          break;
          
        case 'textbox':
        case 'text':
          object = new fabric.Textbox(properties.text || 'Text', {
            width: 200,
            fontFamily: 'Arial',
            fontSize: 16,
            fill: '#000000',
            ...properties
          });
          break;
          
        case 'line':
          object = new fabric.Line([0, 0, 100, 100], {
            stroke: '#000000',
            strokeWidth: 1,
            ...properties
          });
          break;
          
        case 'triangle':
          object = new fabric.Triangle({
            width: 100,
            height: 100,
            fill: '#cccccc',
            ...properties
          });
          break;
          
        case 'image':
          // For images, we need to handle asynchronously
          if (properties.src) {
            return new Promise((resolve, reject) => {
              fabric.Image.fromURL(properties.src, (img) => {
                // Apply properties
                img.set(properties);
                
                // Add to canvas
                this.canvas.add(img);
                this.canvas.renderAll();
                
                resolve(img);
              }, { crossOrigin: 'anonymous' });
            });
          } else {
            console.warn('CanvasService: Cannot create image - No src provided');
            return null;
          }
          
        default:
          console.warn(`CanvasService: Unknown object type: ${type}`);
          return null;
      }
      
      // Add to canvas
      this.canvas.add(object);
      this.canvas.renderAll();
      
      // Save document after object creation
      setTimeout(() => {
        documentService.saveCurrentPage();
      }, 100);
      
      return object;
    } catch (err) {
      console.error(`CanvasService: Error creating object of type ${type}:`, err);
      return null;
    }
  }

  /**
   * Get the currently selected object
   * @returns {fabric.Object|null} Selected object or null if none
   */
  getSelectedObject() {
    if (!this.canvas) {
      return null;
    }
    
    return this.canvas.getActiveObject();
  }

  /**
   * Delete selected objects from the canvas
   * @returns {boolean} Success status
   */
  deleteSelectedObjects() {
    if (!this.canvas) {
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    
    if (!activeObject) {
      return false;
    }
    
    try {
      // Handle multi-selection
      if (activeObject.type === 'activeSelection') {
        // Get objects in selection
        const objects = activeObject.getObjects();
        
        // Remove selection
        this.canvas.discardActiveObject();
        
        // Remove each object
        objects.forEach(obj => {
          this.canvas.remove(obj);
        });
      } else {
        // Remove single object
        this.canvas.remove(activeObject);
      }
      
      this.canvas.requestRenderAll();
      
      // Save document after object deletion
      setTimeout(() => {
        documentService.saveCurrentPage();
      }, 100);
      
      return true;
    } catch (err) {
      console.error('CanvasService: Error deleting objects:', err);
      return false;
    }
  }

  /**
   * Copy selected objects to clipboard
   * @returns {boolean} Success status
   */
  copySelectedObjects() {
    if (!this.canvas) {
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    
    if (!activeObject) {
      return false;
    }
    
    try {
      // Store a copy in memory
      if (typeof window !== 'undefined') {
        window._clipboard = activeObject;
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('CanvasService: Error copying objects:', err);
      return false;
    }
  }

  /**
   * Paste objects from clipboard
   * @returns {boolean} Success status
   */
  pasteObjects() {
    if (!this.canvas || !window._clipboard) {
      return false;
    }
    
    try {
      // Clone the object(s)
      window._clipboard.clone((cloned) => {
        // Offset position slightly for visual distinction
        cloned.set({
          left: cloned.left + 10,
          top: cloned.top + 10,
          // Generate new ID
          id: 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
        });
        
        // Handle group/multiple objects
        if (cloned.type === 'activeSelection') {
          // Get objects in group
          const objects = cloned.getObjects();
          
          // Discard the group
          this.canvas.discardActiveObject();
          
          // Add objects individually with new IDs
          objects.forEach(obj => {
            obj.id = 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            this.canvas.add(obj);
          });
          
          // Create new selection
          this.canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas: this.canvas }));
        } else {
          this.canvas.add(cloned);
          this.canvas.setActiveObject(cloned);
        }
        
        this.canvas.requestRenderAll();
        
        // Save document after paste
        setTimeout(() => {
          documentService.saveCurrentPage();
        }, 100);
      });
      
      return true;
    } catch (err) {
      console.error('CanvasService: Error pasting objects:', err);
      return false;
    }
  }

  /**
   * Move selected object forward in stacking order
   * @returns {boolean} Success status
   */
  bringForward() {
    if (!this.canvas) {
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    
    if (!activeObject) {
      return false;
    }
    
    try {
      this.canvas.bringForward(activeObject);
      this.canvas.requestRenderAll();
      
      // Save document after layer change
      setTimeout(() => {
        documentService.saveCurrentPage();
      }, 100);
      
      return true;
    } catch (err) {
      console.error('CanvasService: Error bringing object forward:', err);
      return false;
    }
  }

  /**
   * Move selected object backward in stacking order
   * @returns {boolean} Success status
   */
  sendBackward() {
    if (!this.canvas) {
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    
    if (!activeObject) {
      return false;
    }
    
    try {
      this.canvas.sendBackwards(activeObject);
      this.canvas.requestRenderAll();
      
      // Save document after layer change
      setTimeout(() => {
        documentService.saveCurrentPage();
      }, 100);
      
      return true;
    } catch (err) {
      console.error('CanvasService: Error sending object backward:', err);
      return false;
    }
  }

  /**
   * Move selected object to top of stacking order
   * @returns {boolean} Success status
   */
  bringToFront() {
    if (!this.canvas) {
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    
    if (!activeObject) {
      return false;
    }
    
    try {
      this.canvas.bringToFront(activeObject);
      this.canvas.requestRenderAll();
      
      // Save document after layer change
      setTimeout(() => {
        documentService.saveCurrentPage();
      }, 100);
      
      return true;
    } catch (err) {
      console.error('CanvasService: Error bringing object to front:', err);
      return false;
    }
  }

  /**
   * Move selected object to bottom of stacking order
   * @returns {boolean} Success status
   */
  sendToBack() {
    if (!this.canvas) {
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    
    if (!activeObject) {
      return false;
    }
    
    try {
      this.canvas.sendToBack(activeObject);
      this.canvas.requestRenderAll();
      
      // Save document after layer change
      setTimeout(() => {
        documentService.saveCurrentPage();
      }, 100);
      
      return true;
    } catch (err) {
      console.error('CanvasService: Error sending object to back:', err);
      return false;
    }
  }

  /**
   * Undo the last canvas operation
   * @returns {boolean} Success status
   */
  undo() {
    if (!this.historyManager) {
      console.warn('CanvasService: Cannot undo - No history manager available');
      return false;
    }
    
    if (!this.historyManager.canUndo()) {
      console.log('CanvasService: Nothing to undo');
      return false;
    }
    
    try {
      this.historyManager.undo();
      return true;
    } catch (err) {
      console.error('CanvasService: Error during undo:', err);
      return false;
    }
  }
  
  /**
   * Redo a previously undone canvas operation
   * @returns {boolean} Success status
   */
  redo() {
    if (!this.historyManager) {
      console.warn('CanvasService: Cannot redo - No history manager available');
      return false;
    }
    
    if (!this.historyManager.canRedo()) {
      console.log('CanvasService: Nothing to redo');
      return false;
    }
    
    try {
      this.historyManager.redo();
      return true;
    } catch (err) {
      console.error('CanvasService: Error during redo:', err);
      return false;
    }
  }
  
  /**
   * Set the history manager for undo/redo support
   * @param {Object} historyManager - History manager instance
   */
  setHistoryManager(historyManager) {
    this.historyManager = historyManager;
  }
  
  /**
   * Check if canvas is ready for operations
   * @returns {boolean} Whether canvas is ready
   */
  isCanvasReadyForOperations() {
    return !!(this.canvas && get(currentDocument) && get(currentPage));
  }

  /**
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('CanvasService: Cleaning up resources');
    
    // Unsubscribe from store subscriptions
    if (this.toolStoreUnsubscribe) {
      this.toolStoreUnsubscribe();
      this.toolStoreUnsubscribe = null;
    }
    
    if (this.toolOptionsStoreUnsubscribe) {
      this.toolOptionsStoreUnsubscribe();
      this.toolOptionsStoreUnsubscribe = null;
    }
    
    // Clean up event service
    try {
      canvasEventService.cleanup();
    } catch (err) {
      console.error('CanvasService: Error cleaning up event service:', err);
    }
    
    // Clean up the canvas
    if (this.canvas) {
      try {
        // Dispose canvas
        this.canvas.dispose();
        this.canvas = null;
        
        // Clear global reference
        if (typeof window !== 'undefined') {
          window.$canvas = null;
        }
      } catch (err) {
        console.error('CanvasService: Error during cleanup:', err);
      }
    }
    
    // Clean up history manager if it exists
    if (this.historyManager && typeof this.historyManager.dispose === 'function') {
      try {
        this.historyManager.dispose();
        this.historyManager = null;
      } catch (err) {
        console.error('CanvasService: Error cleaning up history manager:', err);
      }
    }
  }
}

// Create singleton instance
const canvasService = new CanvasService();

export default canvasService;