/**
 * Guide management utilities for Canvas component
 * @module Canvas.guides
 */

import * as fabric from 'fabric';

/**
 * Create a horizontal guide line
 * @param {Object} params - Guide parameters
 * @param {Object} params.canvas - Fabric.js canvas
 * @param {Object} params.currentDocument - Document store
 * @param {string} params.currentPage - Current page ID
 * @param {number} params.position - Y position of guide
 * @param {number} params.width - Canvas width
 * @returns {Object|undefined} The created guide object
 */
export function createHorizontalGuide({ canvas, currentDocument, currentPage, position, width }) {
  if (!canvas || !currentDocument || !currentPage) return;
  
  // Create the guide line on the canvas
  const guide = new fabric.Line([0, position, width, position], {
    stroke: '#0066CC',
    strokeWidth: 1,
    strokeDashArray: [5, 5],
    selectable: false,
    evented: true,
    guide: true,
    horizontal: true,
    excludeFromExport: true,
    originalPosition: position // Store original position for updating
  });
  
  // Add guide to canvas
  canvas.add(guide);
  
  // Save guide position to document
  currentDocument.update(doc => {
    const pageIndex = doc.pages.findIndex(p => p.id === currentPage);
    if (pageIndex >= 0) {
      const updatedPages = [...doc.pages];
      
      // Initialize guides array if it doesn't exist
      if (!updatedPages[pageIndex].guides) {
        updatedPages[pageIndex].guides = { horizontal: [], vertical: [] };
      }
      
      // Add new guide position
      updatedPages[pageIndex].guides.horizontal.push(position);
      
      return {
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      };
    }
    return doc;
  });
  
  return guide;
}

/**
 * Create a vertical guide line
 * @param {Object} params - Guide parameters
 * @param {Object} params.canvas - Fabric.js canvas
 * @param {Object} params.currentDocument - Document store
 * @param {string} params.currentPage - Current page ID
 * @param {number} params.position - X position of guide
 * @param {number} params.height - Canvas height
 * @returns {Object|undefined} The created guide object
 */
export function createVerticalGuide({ canvas, currentDocument, currentPage, position, height }) {
  if (!canvas || !currentDocument || !currentPage) return;
  
  // Create the guide line on the canvas
  const guide = new fabric.Line([position, 0, position, height], {
    stroke: '#0066CC',
    strokeWidth: 1,
    strokeDashArray: [5, 5],
    selectable: false,
    evented: true,
    guide: true,
    horizontal: false,
    excludeFromExport: true,
    originalPosition: position // Store original position for updating
  });
  
  // Add guide to canvas
  canvas.add(guide);
  
  // Save guide position to document
  currentDocument.update(doc => {
    const pageIndex = doc.pages.findIndex(p => p.id === currentPage);
    if (pageIndex >= 0) {
      const updatedPages = [...doc.pages];
      
      // Initialize guides array if it doesn't exist
      if (!updatedPages[pageIndex].guides) {
        updatedPages[pageIndex].guides = { horizontal: [], vertical: [] };
      }
      
      // Add new guide position
      updatedPages[pageIndex].guides.vertical.push(position);
      
      return {
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      };
    }
    return doc;
  });
  
  return guide;
}

/**
 * Make a guide draggable
 * @param {Object} params - Guide parameters
 * @param {Object} params.guide - Fabric guide object
 * @param {Object} params.canvas - Fabric.js canvas 
 * @param {Object} params.currentDocument - Document store
 * @param {string} params.currentPage - Current page ID
 * @param {Function} params.saveFunction - Function to call to save changes
 */
export function makeGuideDraggable({ guide, canvas, currentDocument, currentPage, saveFunction }) {
  if (!guide || !canvas) return;
  
  // Set up drag behavior
  guide.on('mousedown', (e) => {
    // Save initial position for dragging calculations
    const initialGuidePosition = guide.horizontal ? guide.top : guide.left;
    
    // Disable selection when dragging guides
    canvas.selection = false;
    
    // Store original positions for reference
    canvas.lastPosX = e.pointer.x;
    canvas.lastPosY = e.pointer.y;
    
    // Activate mousemove handler
    canvas.on('mouse:move', moveGuide);
    
    // Set up mouseup handler to end drag
    canvas.on('mouse:up', () => {
      canvas.off('mouse:move', moveGuide);
      canvas.selection = true;
      canvas.renderAll();
      
      // Update guide position in document
      updateGuidePosition(guide, currentDocument, currentPage, saveFunction);
    });
    
    // Define guide movement function
    function moveGuide(e) {
      if (guide.horizontal) {
        // Move horizontal guide
        guide.set('top', e.pointer.y);
        guide.setCoords();
      } else {
        // Move vertical guide
        guide.set('left', e.pointer.x);
        guide.setCoords();
      }
      
      // Update endpoints to keep line spanning canvas
      if (guide.horizontal) {
        guide.set({
          x1: 0,
          x2: canvas.width,
          y1: guide.top,
          y2: guide.top
        });
      } else {
        guide.set({
          x1: guide.left,
          x2: guide.left,
          y1: 0,
          y2: canvas.height
        });
      }
      
      canvas.renderAll();
    }
  });
  
  // Set up double-click to delete guide
  guide.on('dblclick', () => {
    deleteGuide(guide, canvas, currentDocument, currentPage, saveFunction);
  });
}

/**
 * Update guide position in document model
 * @param {Object} guide - Guide object
 * @param {Object} currentDocument - Document store
 * @param {string} currentPage - Current page ID  
 * @param {Function} saveFunction - Function to call to save changes
 */
export function updateGuidePosition(guide, currentDocument, currentPage, saveFunction) {
  if (!guide || !currentDocument) return;
  
  // Update the guide position in the document data
  currentDocument.update(doc => {
    const pageIndex = doc.pages.findIndex(p => p.id === currentPage);
    if (pageIndex >= 0) {
      const updatedPages = [...doc.pages];
      
      // Make sure we have guides defined
      if (!updatedPages[pageIndex].guides) {
        updatedPages[pageIndex].guides = { horizontal: [], vertical: [] };
      }
      
      // Find the original position to replace
      const isHorizontal = guide.horizontal;
      const originalPosition = guide.originalPosition;
      const newPosition = isHorizontal ? guide.top : guide.left;
      
      const guidesArray = isHorizontal 
        ? updatedPages[pageIndex].guides.horizontal 
        : updatedPages[pageIndex].guides.vertical;
      
      // Replace old position with new one
      const index = guidesArray.indexOf(originalPosition);
      if (index >= 0) {
        guidesArray[index] = newPosition;
      } else {
        // If not found, just add to the array
        guidesArray.push(newPosition);
      }
      
      // Update guide's stored original position
      guide.originalPosition = newPosition;
      
      // Save the updated document
      if (saveFunction) saveFunction();
      
      return {
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      };
    }
    return doc;
  });
}

/**
 * Delete a guide
 * @param {Object} guide - Guide object
 * @param {Object} canvas - Fabric.js canvas
 * @param {Object} currentDocument - Document store
 * @param {string} currentPage - Current page ID
 * @param {Function} saveFunction - Function to call to save changes 
 */
export function deleteGuide(guide, canvas, currentDocument, currentPage, saveFunction) {
  if (!guide || !canvas || !currentDocument) return;
  
  // Remove from canvas
  canvas.remove(guide);
  canvas.renderAll();
  
  // Remove from document data
  currentDocument.update(doc => {
    const pageIndex = doc.pages.findIndex(p => p.id === currentPage);
    if (pageIndex >= 0) {
      const updatedPages = [...doc.pages];
      
      // Make sure we have guides defined
      if (!updatedPages[pageIndex].guides) {
        return doc; // Nothing to delete
      }
      
      // Get the position to remove
      const isHorizontal = guide.horizontal;
      const position = guide.originalPosition;
      
      const guidesArray = isHorizontal 
        ? updatedPages[pageIndex].guides.horizontal 
        : updatedPages[pageIndex].guides.vertical;
      
      // Remove from array
      const index = guidesArray.indexOf(position);
      if (index >= 0) {
        guidesArray.splice(index, 1);
      }
      
      // Save the updated document
      if (saveFunction) saveFunction();
      
      return {
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      };
    }
    return doc;
  });
}

/**
 * Load guides from current page
 * @param {Object} params - Loading parameters
 * @param {Object} params.canvas - Fabric.js canvas
 * @param {Object} params.currentDocument - Document store
 * @param {string} params.currentPage - Current page ID
 * @param {number} params.width - Canvas width
 * @param {number} params.height - Canvas height
 * @param {Function} params.makeGuideDraggableFunc - Function to make guide draggable
 */
export function loadGuides({ canvas, currentDocument, currentPage, width, height, makeGuideDraggableFunc }) {
  if (!canvas || !currentDocument || !currentPage) return;
  
  // Remove existing guides from canvas
  const existingGuides = canvas.getObjects().filter(obj => obj.guide);
  existingGuides.forEach(guide => canvas.remove(guide));
  
  // Find current page in document
  const page = currentDocument.pages.find(p => p.id === currentPage);
  if (!page || !page.guides) return;
  
  // Create horizontal guides
  if (page.guides.horizontal && Array.isArray(page.guides.horizontal)) {
    page.guides.horizontal.forEach(position => {
      const guide = new fabric.Line([0, position, width, position], {
        stroke: '#0066CC',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: true,
        guide: true,
        horizontal: true,
        excludeFromExport: true,
        originalPosition: position
      });
      
      canvas.add(guide);
      makeGuideDraggableFunc(guide);
    });
  }
  
  // Create vertical guides
  if (page.guides.vertical && Array.isArray(page.guides.vertical)) {
    page.guides.vertical.forEach(position => {
      const guide = new fabric.Line([position, 0, position, height], {
        stroke: '#0066CC',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: true,
        guide: true,
        horizontal: false,
        excludeFromExport: true,
        originalPosition: position
      });
      
      canvas.add(guide);
      makeGuideDraggableFunc(guide);
    });
  }
  
  canvas.renderAll();
}