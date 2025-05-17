/**
 * Canvas.objects.js
 * Manages object manipulation functionality for the Canvas component
 */

/**
 * Create object manipulation functions for the Canvas component
 * @param {Object} context - Canvas context with shared references and methods
 * @returns {Object} Object manipulation functions
 */
export function createObjectManipulation(context) {
  const { 
    canvas, 
    saveCurrentPage, 
    generateId, 
    clipboard, 
    textFlow, 
    updateTextFlow 
  } = context;

  /**
   * Rotate the selected object by a specified angle
   * @param {number} angle - Angle to rotate in degrees
   */
  function rotateObject(angle) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    activeObject.rotate(activeObject.angle + angle);
    canvas.renderAll();
  }

  /**
   * Scale the selected object by the specified amounts
   * @param {number} scaleX - Horizontal scale factor
   * @param {number} scaleY - Vertical scale factor
   */
  function scaleObject(scaleX, scaleY) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    activeObject.scale({
      x: activeObject.scaleX * scaleX,
      y: activeObject.scaleY * scaleY
    });
    canvas.renderAll();
  }

  /**
   * Flip the selected object horizontally or vertically
   * @param {string} direction - 'horizontal' or 'vertical'
   */
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

  /**
   * Delete currently selected objects
   */
  function deleteSelectedObjects() {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Check if it's a master page object
    if (activeObject.fromMaster && activeObject.overridable) {
      // If it's an overridable master object, override it first, then delete
      const overriddenObj = context.overrideMasterObject(activeObject);
      if (overriddenObj) {
        canvas.remove(overriddenObj);
      }
    } else if (!activeObject.fromMaster || activeObject.fromMaster === false) {
      // For regular objects or overridden master objects
      if (activeObject.type === 'activeSelection') {
        // CRITICAL: For multiple selected objects
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
    context.selectedObject = null;
    
    context.dispatch('objectselected', { object: null, objectType: null });
  }

  /**
   * Get the currently selected object
   * @returns {Object|null} The selected object or null
   */
  function getSelectedObject() {
    return context.selectedObject;
  }

  /**
   * Check if an object is from a master page
   * @param {Object} obj - The object to check
   * @returns {boolean} Whether the object is from a master page
   */
  function isObjectFromMaster(obj) {
    return obj && obj.fromMaster === true;
  }

  /**
   * Get a list of all master page objects on the canvas
   * @returns {Array} Array of master page objects
   */
  function getMasterPageObjects() {
    if (!canvas) return [];
    
    return canvas.getObjects().filter(obj => obj.fromMaster);
  }

  /**
   * Copy selected objects to clipboard
   */
  function copySelectedObjects() {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Skip master objects that haven't been overridden
    if (activeObject.fromMaster && !activeObject.overridden) return;
    
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
    } catch (err) {
      console.error("ERROR: Error copying objects:", err);
    }
  }

  /**
   * Cut selected objects (copy then delete)
   */
  function cutSelectedObjects() {
    if (!canvas) return;
    
    // First copy the objects
    copySelectedObjects();
    
    // Then delete them
    deleteSelectedObjects();
    
    // Save the page state
    saveCurrentPage();
  }

  /**
   * Paste objects from clipboard
   */
  function pasteObjects() {
    if (!canvas || !clipboard) return;
    
    const clipboardData = clipboard.get();
    if (!clipboardData || !clipboardData.objects || clipboardData.objects.length === 0) {
      console.log("Nothing to paste");
      return;
    }
    
    try {
      // Create a slight offset for pasted objects to make them visible
      const pasteOffset = 20;
      
      // Deselect any current selection
      canvas.discardActiveObject();
      
      if (clipboardData.isMultiple) {
        // For multiple objects, create and add each one
        const newObjects = [];
        
        clipboardData.objects.forEach(obj => {
          const newObj = createObjectFromClipboard(obj);
          
          if (newObj) {
            // Offset from original position
            newObj.left += pasteOffset;
            newObj.top += pasteOffset;
            
            // Add to canvas
            canvas.add(newObj);
            newObjects.push(newObj);
          }
        });
        
        // Create a group selection of the pasted objects
        if (newObjects.length > 0) {
          const selection = new fabric.ActiveSelection(newObjects, {
            canvas: canvas
          });
          canvas.setActiveObject(selection);
        }
      } else {
        // For single object
        const obj = clipboardData.objects[0];
        const newObj = createObjectFromClipboard(obj);
        
        if (newObj) {
          // Offset from original position
          newObj.left += pasteOffset;
          newObj.top += pasteOffset;
          
          // Add to canvas and select it
          canvas.add(newObj);
          canvas.setActiveObject(newObj);
        }
      }
      
      canvas.requestRenderAll();
      canvas.renderAll();
      
      // Save the page state
      saveCurrentPage();
    } catch (err) {
      console.error("ERROR: Error pasting objects:", err);
    }
  }

  /**
   * Create a new object from clipboard data
   * @param {Object} clipboardObj - The object data from clipboard
   * @returns {Object} A new fabric.js object
   */
  function createObjectFromClipboard(clipboardObj) {
    // Start with a clone of the clipboard object
    let newObj;
    
    try {
      clipboardObj.clone(function(cloned) {
        newObj = cloned;
      });
      
      if (!newObj) {
        console.error("ERROR: Failed to clone clipboard object");
        return null;
      }
      
      // Generate a new ID for the object
      newObj.id = generateId();
      
      // Initialize linked objects array for textboxes
      if (newObj.type === 'textbox') {
        newObj.linkedObjectIds = [];
        
        // Setup text flow listeners
        if (textFlow) {
          newObj.on('modified', () => updateTextFlow(newObj));
          newObj.on('changed', () => updateTextFlow(newObj));
        }
      }
      
      // Ensure it's selectable and visible
      newObj.selectable = true;
      newObj.evented = true;
      newObj.visible = true;
      
      return newObj;
    } catch (err) {
      console.error("ERROR: Error creating object from clipboard:", err);
      return null;
    }
  }

  // CRITICAL: Ensure objects are always visible and evented
  function ensureObjectVisibility(obj) {
    if (!obj) return;
    
    // Set essential properties 
    obj.visible = true;
    obj.evented = true;
    
    // Different handling for master page objects
    if (obj.fromMaster) {
      obj.selectable = false;
      obj.hoverCursor = 'not-allowed';
    } else {
      obj.selectable = context.activeTool === 'select';
    }
  }

  // Return the object manipulation functions
  return {
    rotateObject,
    scaleObject,
    flipObject,
    deleteSelectedObjects,
    getSelectedObject,
    isObjectFromMaster,
    getMasterPageObjects,
    copySelectedObjects,
    cutSelectedObjects,
    pasteObjects,
    ensureObjectVisibility
  };
}