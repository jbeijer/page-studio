/**
 * Canvas.layers.js
 * Manages object layering functionality for the Canvas component
 */

/**
 * Create layer management functions for the Canvas component
 * @param {Object} context - Canvas context with shared references and methods
 * @returns {Object} Layer management functions
 */
export function createLayerManagement(context) {
  const { canvas, saveCurrentPage } = context;

  /**
   * Check if the selected object can be manipulated
   * (Prevents operations on master objects)
   * @param {Object} obj - The object to check
   * @returns {boolean} True if object can be manipulated
   */
  function canManipulateObject(obj) {
    // CRITICAL: Prevent layer operations on master objects
    if (obj && obj.fromMaster && !obj.overridden) {
      console.log("Cannot manipulate master object:", obj);
      return false;
    }
    return true;
  }

  /**
   * Bring the selected object one layer forward
   * @returns {boolean} Success status
   */
  function bringForward() {
    console.log("Canvas.bringForward called directly");
    if (!canvas) {
      console.error("Cannot bring forward: Canvas not initialized");
      return false;
    }
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      console.error("Cannot bring forward: No active object selected");
      return false;
    }
    
    // Check if object is a master object
    if (!canManipulateObject(activeObject)) {
      console.error("Cannot bring forward: Object is from master page");
      return false;
    }
    
    // Handle activeSelection (multiple objects)
    if (activeObject.type === 'activeSelection') {
      activeObject.forEachObject(obj => {
        if (canManipulateObject(obj)) {
          canvas.bringForward(obj);
        }
      });
    } else {
      console.log("Actually bringing forward object:", activeObject);
      canvas.bringForward(activeObject);
    }
    
    canvas.renderAll();
    saveCurrentPage();
    return true;
  }

  /**
   * Send the selected object one layer backward
   * @returns {boolean} Success status
   */
  function sendBackward() {
    console.log("Canvas.sendBackward called directly");
    if (!canvas) {
      console.error("Cannot send backward: Canvas not initialized");
      return false;
    }
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      console.error("Cannot send backward: No active object selected");
      return false;
    }
    
    // Check if object is a master object
    if (!canManipulateObject(activeObject)) {
      console.error("Cannot send backward: Object is from master page");
      return false;
    }
    
    // Handle activeSelection (multiple objects)
    if (activeObject.type === 'activeSelection') {
      activeObject.forEachObject(obj => {
        if (canManipulateObject(obj)) {
          canvas.sendBackward(obj);
        }
      });
    } else {
      console.log("Actually sending backward object:", activeObject);
      canvas.sendBackward(activeObject);
    }
    
    canvas.renderAll();
    saveCurrentPage();
    return true;
  }

  /**
   * Bring the selected object to the front (top layer)
   * @returns {boolean} Success status
   */
  function bringToFront() {
    console.log("Canvas.bringToFront called directly");
    if (!canvas) {
      console.error("Cannot bring to front: Canvas not initialized");
      return false;
    }
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      console.error("Cannot bring to front: No active object selected");
      return false;
    }
    
    // Check if object is a master object
    if (!canManipulateObject(activeObject)) {
      console.error("Cannot bring to front: Object is from master page");
      return false;
    }
    
    // Handle activeSelection (multiple objects)
    if (activeObject.type === 'activeSelection') {
      activeObject.forEachObject(obj => {
        if (canManipulateObject(obj)) {
          canvas.bringToFront(obj);
        }
      });
    } else {
      console.log("Actually bringing to front object:", activeObject);
      canvas.bringToFront(activeObject);
    }
    
    canvas.renderAll();
    saveCurrentPage();
    return true;
  }

  /**
   * Send the selected object to the back (bottom layer)
   * @returns {boolean} Success status
   */
  function sendToBack() {
    console.log("Canvas.sendToBack called directly");
    if (!canvas) {
      console.error("Cannot send to back: Canvas not initialized");
      return false;
    }
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) {
      console.error("Cannot send to back: No active object selected");
      return false;
    }
    
    // Check if object is a master object
    if (!canManipulateObject(activeObject)) {
      console.error("Cannot send to back: Object is from master page");
      return false;
    }
    
    // Handle activeSelection (multiple objects)
    if (activeObject.type === 'activeSelection') {
      activeObject.forEachObject(obj => {
        if (canManipulateObject(obj)) {
          canvas.sendToBack(obj);
        }
      });
    } else {
      console.log("Actually sending to back object:", activeObject);
      canvas.sendToBack(activeObject);
    }
    
    canvas.renderAll();
    saveCurrentPage();
    return true;
  }

  /**
   * Get layer index for an object
   * @param {Object} obj - The fabric.js object
   * @returns {number} Layer index or -1 if not found
   */
  function getObjectLayerIndex(obj) {
    if (!canvas || !obj) return -1;
    
    const objects = canvas.getObjects();
    return objects.indexOf(obj);
  }

  /**
   * Check if object is at the top layer
   * @param {Object} obj - The fabric.js object
   * @returns {boolean} True if object is at top layer
   */
  function isObjectAtTop(obj) {
    if (!canvas || !obj) return false;
    
    const objects = canvas.getObjects();
    return objects.indexOf(obj) === objects.length - 1;
  }

  /**
   * Check if object is at the bottom layer
   * @param {Object} obj - The fabric.js object
   * @returns {boolean} True if object is at bottom layer
   */
  function isObjectAtBottom(obj) {
    if (!canvas || !obj) return false;
    
    const objects = canvas.getObjects();
    return objects.indexOf(obj) === 0;
  }

  /**
   * Move object to specific layer index
   * @param {Object} obj - The fabric.js object
   * @param {number} index - Target layer index
   * @returns {boolean} Success status
   */
  function moveObjectToIndex(obj, index) {
    if (!canvas || !obj) return false;
    
    const objects = canvas.getObjects();
    if (index < 0 || index >= objects.length) return false;
    
    // Remove and reinsert at index
    canvas.remove(obj);
    objects.splice(index, 0, obj);
    canvas.add(obj);
    
    canvas.renderAll();
    saveCurrentPage();
    return true;
  }

  // Return the layer management functions
  return {
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    getObjectLayerIndex,
    isObjectAtTop,
    isObjectAtBottom,
    moveObjectToIndex
  };
}