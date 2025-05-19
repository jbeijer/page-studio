/**
 * LayerService.js
 * Centralized service for managing object layers in PageStudio
 * 
 * This service handles all layer-related functionality including:
 * - Moving objects between layers
 * - Bringing objects forward/backward
 * - Sending objects to front/back
 * - Getting object layer information
 */
import { get } from 'svelte/store';
import documentService from './DocumentService';

class LayerService {
  constructor() {
    // Core properties
    this.canvas = null;
    this.initialized = false;
    
    // Bind methods to ensure consistent 'this' context
    this.initialize = this.initialize.bind(this);
    this.canManipulateObject = this.canManipulateObject.bind(this);
    this.bringForward = this.bringForward.bind(this);
    this.sendBackward = this.sendBackward.bind(this);
    this.bringToFront = this.bringToFront.bind(this);
    this.sendToBack = this.sendToBack.bind(this);
    this.getObjectLayerIndex = this.getObjectLayerIndex.bind(this);
    this.isObjectAtTop = this.isObjectAtTop.bind(this);
    this.isObjectAtBottom = this.isObjectAtBottom.bind(this);
    this.moveObjectToIndex = this.moveObjectToIndex.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the layer service
   * @param {Object} options - Initialization options
   * @returns {LayerService} This service instance for chaining
   */
  initialize(options = {}) {
    console.log('LayerService: Initializing');
    
    this.canvas = options.canvas || null;
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$layerService = this;
    }
    
    this.initialized = true;
    return this;
  }
  
  /**
   * Check if the selected object can be manipulated
   * (Prevents operations on master objects)
   * @param {Object} obj - The object to check
   * @returns {boolean} True if object can be manipulated
   */
  canManipulateObject(obj) {
    if (!obj) return false;
    
    // Prevent layer operations on master objects
    if (obj.fromMaster && !obj.overridden) {
      console.log("LayerService: Cannot manipulate master object:", obj);
      return false;
    }
    return true;
  }

  /**
   * Bring the selected object one layer forward
   * @returns {boolean} Success status
   */
  bringForward() {
    console.log("LayerService: bringForward called");
    if (!this.canvas) {
      console.error("LayerService: Cannot bring forward - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.error("LayerService: Cannot bring forward - No active object selected");
      return false;
    }
    
    // Check if object is a master object
    if (!this.canManipulateObject(activeObject)) {
      console.error("LayerService: Cannot bring forward - Object is from master page");
      return false;
    }
    
    // Handle activeSelection (multiple objects)
    if (activeObject.type === 'activeSelection') {
      activeObject.forEachObject(obj => {
        if (this.canManipulateObject(obj)) {
          this.canvas.bringForward(obj);
        }
      });
    } else {
      console.log("LayerService: Bringing forward object:", activeObject);
      this.canvas.bringForward(activeObject);
    }
    
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Save document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Send the selected object one layer backward
   * @returns {boolean} Success status
   */
  sendBackward() {
    console.log("LayerService: sendBackward called");
    if (!this.canvas) {
      console.error("LayerService: Cannot send backward - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.error("LayerService: Cannot send backward - No active object selected");
      return false;
    }
    
    // Check if object is a master object
    if (!this.canManipulateObject(activeObject)) {
      console.error("LayerService: Cannot send backward - Object is from master page");
      return false;
    }
    
    // Handle activeSelection (multiple objects)
    if (activeObject.type === 'activeSelection') {
      activeObject.forEachObject(obj => {
        if (this.canManipulateObject(obj)) {
          this.canvas.sendBackward(obj);
        }
      });
    } else {
      console.log("LayerService: Sending backward object:", activeObject);
      this.canvas.sendBackward(activeObject);
    }
    
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Save document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Bring the selected object to the front (top layer)
   * @returns {boolean} Success status
   */
  bringToFront() {
    console.log("LayerService: bringToFront called");
    if (!this.canvas) {
      console.error("LayerService: Cannot bring to front - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.error("LayerService: Cannot bring to front - No active object selected");
      return false;
    }
    
    // Check if object is a master object
    if (!this.canManipulateObject(activeObject)) {
      console.error("LayerService: Cannot bring to front - Object is from master page");
      return false;
    }
    
    // Handle activeSelection (multiple objects)
    if (activeObject.type === 'activeSelection') {
      activeObject.forEachObject(obj => {
        if (this.canManipulateObject(obj)) {
          this.canvas.bringToFront(obj);
        }
      });
    } else {
      console.log("LayerService: Bringing to front object:", activeObject);
      this.canvas.bringToFront(activeObject);
    }
    
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Save document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Send the selected object to the back (bottom layer)
   * @returns {boolean} Success status
   */
  sendToBack() {
    console.log("LayerService: sendToBack called");
    if (!this.canvas) {
      console.error("LayerService: Cannot send to back - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.error("LayerService: Cannot send to back - No active object selected");
      return false;
    }
    
    // Check if object is a master object
    if (!this.canManipulateObject(activeObject)) {
      console.error("LayerService: Cannot send to back - Object is from master page");
      return false;
    }
    
    // Handle activeSelection (multiple objects)
    if (activeObject.type === 'activeSelection') {
      activeObject.forEachObject(obj => {
        if (this.canManipulateObject(obj)) {
          this.canvas.sendToBack(obj);
        }
      });
    } else {
      console.log("LayerService: Sending to back object:", activeObject);
      this.canvas.sendToBack(activeObject);
    }
    
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Save document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Get layer index for an object
   * @param {Object} obj - The fabric.js object
   * @returns {number} Layer index or -1 if not found
   */
  getObjectLayerIndex(obj) {
    if (!this.canvas || !obj) return -1;
    
    const objects = this.canvas.getObjects();
    return objects.indexOf(obj);
  }

  /**
   * Check if object is at the top layer
   * @param {Object} obj - The fabric.js object
   * @returns {boolean} True if object is at top layer
   */
  isObjectAtTop(obj) {
    if (!this.canvas || !obj) return false;
    
    const objects = this.canvas.getObjects();
    return objects.indexOf(obj) === objects.length - 1;
  }

  /**
   * Check if object is at the bottom layer
   * @param {Object} obj - The fabric.js object
   * @returns {boolean} True if object is at bottom layer
   */
  isObjectAtBottom(obj) {
    if (!this.canvas || !obj) return false;
    
    const objects = this.canvas.getObjects();
    return objects.indexOf(obj) === 0;
  }

  /**
   * Move object to specific layer index
   * @param {Object} obj - The fabric.js object
   * @param {number} index - Target layer index
   * @returns {boolean} Success status
   */
  moveObjectToIndex(obj, index) {
    if (!this.canvas || !obj) {
      console.error("LayerService: Cannot move object - Canvas or object not available");
      return false;
    }
    
    const objects = this.canvas.getObjects();
    if (index < 0 || index >= objects.length) {
      console.error(`LayerService: Invalid layer index ${index} (valid range: 0-${objects.length-1})`);
      return false;
    }
    
    // Check if object is a master object
    if (!this.canManipulateObject(obj)) {
      console.error("LayerService: Cannot move object - Object is from master page");
      return false;
    }
    
    // Remove and reinsert at index
    this.canvas.remove(obj);
    objects.splice(index, 0, obj);
    this.canvas.add(obj);
    
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Save document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('LayerService: Cleaning up resources');
    
    // Clear references
    this.canvas = null;
    this.initialized = false;
  }
}

// Create singleton instance
const layerService = new LayerService();

export default layerService;