// Helper functions for Canvas component
import * as fabric from 'fabric';

/**
 * Create a wrapper around Canvas layer management functions
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Function} saveFunction - Function to save canvas state
 * @returns {Object} Layer management functions
 */
export function createLayerManagementFunctions(canvas, saveFunction) {
  /**
   * Move selected object one layer forward
   */
  function bringForward() {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Log for debugging 
    console.log("Bringing forward object:", activeObject);
    console.log("Object type:", activeObject.type);
    
    // Remove fromMaster check to allow all objects to be moved
    if (activeObject.type === 'activeSelection') {
      // Handle group selection - sort objects by their z-index first to avoid conflicts
      const objects = activeObject.getObjects();
      objects.sort((a, b) => canvas.getObjects().indexOf(b) - canvas.getObjects().indexOf(a));
      
      objects.forEach(obj => {
        console.log("Moving group object:", obj);
        canvas.bringForward(obj);
      });
    } else {
      canvas.bringForward(activeObject);
    }
    
    canvas.renderAll();
    saveFunction();
  }
  
  /**
   * Move selected object one layer backward
   */
  function sendBackward() {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Log for debugging
    console.log("Sending backward object:", activeObject);
    
    if (activeObject.type === 'activeSelection') {
      // Handle group selection - sort objects by their z-index first to avoid conflicts
      const objects = activeObject.getObjects();
      objects.sort((a, b) => canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b));
      
      objects.forEach(obj => {
        console.log("Moving group object backward:", obj);
        canvas.sendBackward(obj);
      });
    } else {
      canvas.sendBackward(activeObject);
    }
    
    canvas.renderAll();
    saveFunction();
  }
  
  /**
   * Bring selected object to the front of the layer stack
   */
  function bringToFront() {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Log for debugging
    console.log("Bringing to front object:", activeObject);
    
    if (activeObject.type === 'activeSelection') {
      // Handle group selection - sort objects by their z-index first to avoid conflicts
      const objects = activeObject.getObjects();
      objects.sort((a, b) => canvas.getObjects().indexOf(b) - canvas.getObjects().indexOf(a));
      
      objects.forEach(obj => {
        console.log("Moving group object to front:", obj);
        canvas.bringToFront(obj);
      });
    } else {
      canvas.bringToFront(activeObject);
    }
    
    canvas.renderAll();
    saveFunction();
  }
  
  /**
   * Send selected object to the back of the layer stack
   */
  function sendToBack() {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Log for debugging
    console.log("Sending to back object:", activeObject);
    
    if (activeObject.type === 'activeSelection') {
      // Handle group selection - sort objects by their z-index first to avoid conflicts
      const objects = activeObject.getObjects();
      objects.sort((a, b) => canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b));
      
      objects.forEach(obj => {
        console.log("Moving group object to back:", obj);
        canvas.sendToBack(obj);
      });
    } else {
      canvas.sendToBack(activeObject);
    }
    
    canvas.renderAll();
    saveFunction();
  }

  return {
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack
  };
}

/**
 * Create a wrapper around Canvas clipboard functions
 * @param {Object} canvas - Fabric.js canvas instance
 * @param {Function} saveFunction - Function to save canvas state
 * @param {Function} deleteFunction - Function to delete selected objects
 * @param {Function} generateIdFunction - Function to generate unique IDs
 * @param {Object} clipboardStore - Svelte store for clipboard data
 * @param {Object} textFlow - TextFlow instance
 * @returns {Object} Clipboard management functions
 */
export function createClipboardFunctions(canvas, saveFunction, deleteFunction, generateIdFunction, clipboardStore, textFlow) {
  /**
   * Copy selected objects to clipboard
   */
  function copySelectedObjects() {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Check if it's a master page object (can't copy these directly)
    if (activeObject.fromMaster && !activeObject.overridable) return;
    
    // Create a copy of the selected objects
    if (activeObject.type === 'activeSelection') {
      // For multiple selected objects
      const selectedObjects = activeObject.getObjects().filter(obj => !obj.fromMaster || obj.overridable);
      if (selectedObjects.length === 0) return;
      
      // Copy each object to JSON
      const objectsToClipboard = selectedObjects.map(obj => {
        // Create a clean copy of the object
        const copy = fabric.util.object.clone(obj);
        
        // If it's a master object, convert it to a regular object
        if (copy.fromMaster) {
          copy.fromMaster = false;
          copy.masterId = undefined;
          copy.masterObjectId = undefined;
          copy.overridable = undefined;
        }
        
        return copy.toJSON(['id', 'linkedObjectIds']);
      });
      
      // Store in clipboard
      clipboardStore.set(objectsToClipboard);
    } else {
      // For single selected object
      const copy = fabric.util.object.clone(activeObject);
      
      // If it's a master object, convert it to a regular object
      if (copy.fromMaster) {
        copy.fromMaster = false;
        copy.masterId = undefined;
        copy.masterObjectId = undefined;
        copy.overridable = undefined;
      }
      
      clipboardStore.set([copy.toJSON(['id', 'linkedObjectIds'])]);
    }
  }
  
  /**
   * Cut selected objects (copy and then delete)
   */
  function cutSelectedObjects() {
    if (!canvas) return;
    
    // First copy objects to clipboard
    copySelectedObjects();
    
    // Then delete the selected objects
    deleteFunction();
  }
  
  /**
   * Paste objects from clipboard
   */
  function pasteObjects() {
    if (!canvas) return;
    
    // Get objects from clipboard
    let clipboardObjects;
    clipboardStore.subscribe(value => {
      clipboardObjects = value;
    })();
    
    if (!clipboardObjects || clipboardObjects.length === 0) return;
    
    // Clear any active selection first
    canvas.discardActiveObject();
    
    const pastedObjects = [];
    
    // Create a new object for each clipboard entry with slightly offset position
    clipboardObjects.forEach(objData => {
      fabric.util.enlivenObjects([objData], ([fabricObj]) => {
        if (!fabricObj) return;
        
        // Assign a new ID
        fabricObj.id = generateIdFunction();
        
        // Offset position slightly to make it clear this is a copy
        fabricObj.left = (fabricObj.left || 0) + 20;
        fabricObj.top = (fabricObj.top || 0) + 20;
        
        // For text objects, ensure they have linked object IDs
        if (fabricObj.type === 'textbox' && !fabricObj.linkedObjectIds) {
          fabricObj.linkedObjectIds = [];
        }
        
        // Add to canvas
        canvas.add(fabricObj);
        pastedObjects.push(fabricObj);
        
        // Set up event handlers for text flow
        if (fabricObj.type === 'textbox' && textFlow) {
          fabricObj.on('modified', () => updateTextFlow(fabricObj, textFlow));
          fabricObj.on('changed', () => updateTextFlow(fabricObj, textFlow));
        }
      });
    });
    
    // Select all pasted objects
    if (pastedObjects.length > 0) {
      if (pastedObjects.length === 1) {
        canvas.setActiveObject(pastedObjects[0]);
      } else {
        const selection = new fabric.ActiveSelection(pastedObjects, { canvas });
        canvas.setActiveObject(selection);
      }
    }
    
    canvas.renderAll();
    saveFunction();
  }

  // Helper function to update text flow
  function updateTextFlow(textObject, textFlow) {
    if (!textObject || !textFlow) return;
    
    // If the textbox has linked objects, update the text flow
    if (textObject.linkedObjectIds && textObject.linkedObjectIds.length > 0) {
      textFlow.updateTextFlow(textObject.id);
      canvas.renderAll();
    }
  }

  return {
    copySelectedObjects,
    cutSelectedObjects,
    pasteObjects
  };
}