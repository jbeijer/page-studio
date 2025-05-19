/**
 * ObjectService.js
 * Centralized service for object manipulation in PageStudio
 * 
 * This service handles all object-related functionality including:
 * - Rotating, scaling, and flipping objects
 * - Deleting objects
 * - Copy, cut, and paste operations
 * - Object property management
 */
import { get } from 'svelte/store';
import { fabric } from 'fabric';
import { clipboard } from '$lib/stores/editor';
import documentService from './DocumentService';
import masterPageService from './MasterPageService';

class ObjectService {
  constructor() {
    // Core properties
    this.canvas = null;
    this.initialized = false;
    this.dispatch = null;
    this.generateId = null;
    this.textFlow = null;
    
    // Bind methods to ensure consistent 'this' context
    this.initialize = this.initialize.bind(this);
    this.rotateObject = this.rotateObject.bind(this);
    this.scaleObject = this.scaleObject.bind(this);
    this.flipObject = this.flipObject.bind(this);
    this.deleteSelectedObjects = this.deleteSelectedObjects.bind(this);
    this.getSelectedObject = this.getSelectedObject.bind(this);
    this.isObjectFromMaster = this.isObjectFromMaster.bind(this);
    this.getMasterPageObjects = this.getMasterPageObjects.bind(this);
    this.copySelectedObjects = this.copySelectedObjects.bind(this);
    this.cutSelectedObjects = this.cutSelectedObjects.bind(this);
    this.pasteObjects = this.pasteObjects.bind(this);
    this.ensureObjectVisibility = this.ensureObjectVisibility.bind(this);
    this.updateTextFlow = this.updateTextFlow.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the object service
   * @param {Object} options - Initialization options
   * @returns {ObjectService} This service instance for chaining
   */
  initialize(options = {}) {
    console.log('ObjectService: Initializing');
    
    this.canvas = options.canvas || null;
    this.dispatch = options.dispatch || (() => {});
    this.generateId = options.generateId || (() => `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    this.textFlow = options.textFlow || null;
    this.activeTool = options.activeTool || 'select';
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$objectService = this;
    }
    
    this.initialized = true;
    return this;
  }

  /**
   * Rotate the selected object by a specified angle
   * @param {number} angle - Angle to rotate in degrees
   * @returns {boolean} Success status
   */
  rotateObject(angle) {
    console.log(`ObjectService: Rotating object by ${angle} degrees`);
    if (!this.canvas) {
      console.error("ObjectService: Cannot rotate - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.error("ObjectService: Cannot rotate - No active object selected");
      return false;
    }
    
    // Rotate the object
    activeObject.rotate(activeObject.angle + angle);
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Save the document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Scale the selected object by the specified amounts
   * @param {number} scaleX - Horizontal scale factor
   * @param {number} scaleY - Vertical scale factor
   * @returns {boolean} Success status
   */
  scaleObject(scaleX, scaleY) {
    console.log(`ObjectService: Scaling object by x:${scaleX}, y:${scaleY}`);
    if (!this.canvas) {
      console.error("ObjectService: Cannot scale - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.error("ObjectService: Cannot scale - No active object selected");
      return false;
    }
    
    // Scale the object
    activeObject.scale({
      x: activeObject.scaleX * scaleX,
      y: activeObject.scaleY * scaleY
    });
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Save the document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Flip the selected object horizontally or vertically
   * @param {string} direction - 'horizontal' or 'vertical'
   * @returns {boolean} Success status
   */
  flipObject(direction) {
    console.log(`ObjectService: Flipping object ${direction}`);
    if (!this.canvas) {
      console.error("ObjectService: Cannot flip - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.error("ObjectService: Cannot flip - No active object selected");
      return false;
    }
    
    // Flip the object
    if (direction === 'horizontal') {
      activeObject.set('flipX', !activeObject.flipX);
    } else if (direction === 'vertical') {
      activeObject.set('flipY', !activeObject.flipY);
    } else {
      console.error(`ObjectService: Invalid flip direction: ${direction}`);
      return false;
    }
    
    this.canvas.requestRenderAll();
    this.canvas.renderAll();
    
    // Save the document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Delete currently selected objects
   * @returns {boolean} Success status
   */
  deleteSelectedObjects() {
    console.log("ObjectService: Deleting selected objects");
    if (!this.canvas) {
      console.error("ObjectService: Cannot delete - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.log("ObjectService: No active object to delete");
      return false;
    }
    
    try {
      // Check if it's a master page object
      if (activeObject.fromMaster && activeObject.overridable) {
        // If it's an overridable master object, override it first, then delete
        const overriddenObj = masterPageService.overrideMasterObject(activeObject);
        if (overriddenObj) {
          this.canvas.remove(overriddenObj);
        }
      } else if (!activeObject.fromMaster || activeObject.fromMaster === false) {
        // For regular objects or overridden master objects
        if (activeObject.type === 'activeSelection') {
          // For multiple selected objects
          activeObject.forEachObject(obj => {
            if (!obj.fromMaster || obj.fromMaster === false) {
              this.canvas.remove(obj);
            }
          });
          this.canvas.discardActiveObject();
        } else {
          // For single selected object
          this.canvas.remove(activeObject);
        }
      }
      
      this.canvas.requestRenderAll();
      this.canvas.renderAll();
      
      // Dispatch event to notify UI of deselection
      this.dispatch('objectselected', { object: null, objectType: null });
      
      // Save the document
      documentService.saveCurrentPage();
      return true;
    } catch (err) {
      console.error("ObjectService: Error deleting objects:", err);
      return false;
    }
  }

  /**
   * Get the currently selected object
   * @returns {Object|null} The selected object or null
   */
  getSelectedObject() {
    if (!this.canvas) return null;
    return this.canvas.getActiveObject();
  }

  /**
   * Check if an object is from a master page
   * @param {Object} obj - The object to check
   * @returns {boolean} Whether the object is from a master page
   */
  isObjectFromMaster(obj) {
    return obj && obj.fromMaster === true;
  }

  /**
   * Get a list of all master page objects on the canvas
   * @returns {Array} Array of master page objects
   */
  getMasterPageObjects() {
    if (!this.canvas) return [];
    
    return this.canvas.getObjects().filter(obj => obj.fromMaster);
  }

  /**
   * Copy selected objects to clipboard
   * @returns {boolean} Success status
   */
  copySelectedObjects() {
    console.log("ObjectService: Copying selected objects");
    if (!this.canvas) {
      console.error("ObjectService: Cannot copy - Canvas not initialized");
      return false;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      console.log("ObjectService: No active object to copy");
      return false;
    }
    
    // Skip master objects that haven't been overridden
    if (activeObject.fromMaster && !activeObject.overridden) {
      console.log("ObjectService: Cannot copy un-overridden master objects");
      return false;
    }
    
    try {
      if (activeObject.type === 'activeSelection') {
        // For multiple objects, clone each one and save to clipboard
        const clonedObjects = [];
        
        activeObject.forEachObject(obj => {
          // Skip master objects
          if (obj.fromMaster && !obj.overridden) return;
          
          // Clone the object with all properties
          obj.clone(function(cloned) {
            // Store original position relative to group
            cloned.clipboardData = {
              originX: obj.left,
              originY: obj.top
            };
            
            clonedObjects.push(cloned);
          }, ['id', 'linkedObjectIds']);
        });
        
        // Store as group in clipboard
        clipboard.set({
          objects: clonedObjects,
          isMultiple: true,
          timestamp: Date.now()
        });
      } else {
        // For single object, clone it and save to clipboard
        activeObject.clone(function(cloned) {
          // Add a special property to mark this as clipboard data
          cloned.clipboardData = {
            type: activeObject.type,
            timestamp: Date.now()
          };
          
          clipboard.set({
            objects: [cloned],
            isMultiple: false,
            timestamp: Date.now()
          });
        }, ['id', 'linkedObjectIds']);
      }
      
      return true;
    } catch (err) {
      console.error("ObjectService: Error copying objects:", err);
      return false;
    }
  }

  /**
   * Cut selected objects (copy then delete)
   * @returns {boolean} Success status
   */
  cutSelectedObjects() {
    console.log("ObjectService: Cutting selected objects");
    if (!this.canvas) {
      console.error("ObjectService: Cannot cut - Canvas not initialized");
      return false;
    }
    
    // First copy the objects
    const copySuccess = this.copySelectedObjects();
    if (!copySuccess) {
      console.error("ObjectService: Cut operation failed - Copy failed");
      return false;
    }
    
    // Then delete them
    const deleteSuccess = this.deleteSelectedObjects();
    if (!deleteSuccess) {
      console.error("ObjectService: Cut operation failed - Delete failed");
      return false;
    }
    
    // Save the document
    documentService.saveCurrentPage();
    return true;
  }

  /**
   * Paste objects from clipboard
   * @returns {boolean} Success status
   */
  pasteObjects() {
    console.log("ObjectService: Pasting objects from clipboard");
    if (!this.canvas) {
      console.error("ObjectService: Cannot paste - Canvas not initialized");
      return false;
    }
    
    const clipboardData = get(clipboard);
    if (!clipboardData || !clipboardData.objects || clipboardData.objects.length === 0) {
      console.log("ObjectService: Nothing to paste - Clipboard is empty");
      return false;
    }
    
    try {
      // Create a slight offset for pasted objects to make them visible
      const pasteOffset = 20;
      
      // Deselect any current selection
      this.canvas.discardActiveObject();
      
      if (clipboardData.isMultiple) {
        // For multiple objects, create and add each one
        const newObjects = [];
        
        clipboardData.objects.forEach(obj => {
          const newObj = this._createObjectFromClipboard(obj);
          
          if (newObj) {
            // Offset from original position
            newObj.left += pasteOffset;
            newObj.top += pasteOffset;
            
            // Add to canvas
            this.canvas.add(newObj);
            newObjects.push(newObj);
          }
        });
        
        // Create a group selection of the pasted objects
        if (newObjects.length > 0) {
          const selection = new fabric.ActiveSelection(newObjects, {
            canvas: this.canvas
          });
          this.canvas.setActiveObject(selection);
        }
      } else {
        // For single object
        const obj = clipboardData.objects[0];
        const newObj = this._createObjectFromClipboard(obj);
        
        if (newObj) {
          // Offset from original position
          newObj.left += pasteOffset;
          newObj.top += pasteOffset;
          
          // Add to canvas and select it
          this.canvas.add(newObj);
          this.canvas.setActiveObject(newObj);
        }
      }
      
      this.canvas.requestRenderAll();
      this.canvas.renderAll();
      
      // Save the document
      documentService.saveCurrentPage();
      return true;
    } catch (err) {
      console.error("ObjectService: Error pasting objects:", err);
      return false;
    }
  }

  /**
   * Create a new object from clipboard data (internal method)
   * @param {Object} clipboardObj - The object data from clipboard
   * @returns {Object} A new fabric.js object
   * @private
   */
  _createObjectFromClipboard(clipboardObj) {
    // Start with a clone of the clipboard object
    let newObj;
    
    try {
      clipboardObj.clone(function(cloned) {
        newObj = cloned;
      });
      
      if (!newObj) {
        console.error("ObjectService: Failed to clone clipboard object");
        return null;
      }
      
      // Generate a new ID for the object
      newObj.id = this.generateId();
      
      // Initialize linked objects array for textboxes
      if (newObj.type === 'textbox') {
        newObj.linkedObjectIds = [];
        
        // Setup text flow listeners
        if (this.textFlow) {
          newObj.on('modified', () => this.updateTextFlow(newObj));
          newObj.on('changed', () => this.updateTextFlow(newObj));
        }
      }
      
      // Ensure it's selectable and visible
      newObj.selectable = true;
      newObj.evented = true;
      newObj.visible = true;
      
      return newObj;
    } catch (err) {
      console.error("ObjectService: Error creating object from clipboard:", err);
      return null;
    }
  }

  /**
   * Ensure objects are always visible and evented
   * @param {Object} obj - The fabric.js object
   */
  ensureObjectVisibility(obj) {
    if (!obj) return;
    
    // Set essential properties 
    obj.visible = true;
    obj.evented = true;
    
    // Different handling for master page objects
    if (obj.fromMaster) {
      obj.selectable = false;
      obj.hoverCursor = 'not-allowed';
    } else {
      obj.selectable = this.activeTool === 'select';
    }
  }

  /**
   * Update text flow when text content changes
   * @param {Object} textObject - The fabric.js text object
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
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('ObjectService: Cleaning up resources');
    
    // Clear references
    this.canvas = null;
    this.dispatch = null;
    this.textFlow = null;
    this.initialized = false;
  }
}

// Create singleton instance
const objectService = new ObjectService();

export default objectService;