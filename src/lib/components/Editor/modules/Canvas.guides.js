/**
 * Canvas.guides.js
 * Manages guide-related functionality for the Canvas component
 * 
 * This module handles the creation, updating, deletion and persistence of guides
 * on the canvas for snapping objects to grid or specific positions.
 */

/**
 * Create guide management functions for the Canvas component
 * @param {Object} context - Canvas context with shared references and methods
 * @returns {Object} Guide management functions
 */
export function createGuideManagement(context) {
  const { 
    canvas, 
    createHorizontalGuide, 
    createVerticalGuide, 
    deleteGuide 
  } = context;

  /**
   * Handle guide creation event
   * @param {Object} detail - Event detail with position and orientation
   * @returns {Object} The created guide object
   */
  function handleCreateGuide(detail) {
    const { position, orientation } = detail;
    let guideObj;
    
    if (orientation === 'horizontal') {
      guideObj = createHorizontalGuide(canvas, position);
    } else {
      guideObj = createVerticalGuide(canvas, position);
    }
    
    // Save guides to document
    saveGuidesToDocument();
    
    return guideObj;
  }
  
  /**
   * Handle guide update event
   * @param {Object} detail - Event detail with position and orientation
   * @returns {boolean} Success status
   */
  function handleUpdateGuide(detail) {
    // Update is essentially same as create in terms of persistence
    handleCreateGuide(detail);
    return true;
  }
  
  /**
   * Handle guide deletion event
   * @param {Object} detail - Event detail with guide id
   * @returns {boolean} Success status
   */
  function handleDeleteGuide(detail) {
    const { id } = detail;
    
    if (id && canvas) {
      const guideObj = canvas.getObjects().find(obj => obj.id === id && obj.guide);
      if (guideObj) {
        deleteGuide(canvas, guideObj);
        
        // Save guides to document
        saveGuidesToDocument();
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Save the current guides to the document
   * @returns {boolean} Success status
   */
  function saveGuidesToDocument() {
    // Access through context to get current values
    const doc = context.get ? context.get('currentDocument') : context.currentDocument;
    const pageId = context.get ? context.get('currentPage') : context.currentPage;
    
    if (!canvas || !doc || !pageId) {
      console.warn("Cannot save guides: Canvas, document or current page not available");
      return false;
    }
    
    const guides = { 
      horizontal: [], 
      vertical: [] 
    };
    
    // Collect all guides from canvas
    canvas.getObjects().forEach(obj => {
      if (obj.guide) {
        if (obj.orientation === 'horizontal') {
          guides.horizontal.push(obj.top);
        } else {
          guides.vertical.push(obj.left);
        }
      }
    });
    
    // Update document
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    if (pageIndex >= 0) {
      const updatedPages = [...doc.pages];
      updatedPages[pageIndex] = {
        ...updatedPages[pageIndex],
        guides
      };
      
      if (context.currentDocument && context.currentDocument.update) {
        context.currentDocument.update(docToUpdate => ({
          ...docToUpdate,
          pages: updatedPages
        }));
        return true;
      } else {
        console.error("Cannot update document: context.currentDocument.update is not available");
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Load guides from the document
   * @returns {Array} An array of guide objects added to the canvas
   */
  function loadGuidesFromDocument() {
    // Access through context to get current values
    const doc = context.get ? context.get('currentDocument') : context.currentDocument;
    const pageId = context.get ? context.get('currentPage') : context.currentPage;
    const loadGuides = context.loadGuides || context.refreshGuides;
    
    if (!canvas || !doc || !pageId) {
      console.warn("Cannot load guides: Canvas, document or current page not available");
      return [];
    }
    
    if (loadGuides) {
      return loadGuides(canvas, doc, pageId);
    } else {
      console.warn("Cannot load guides: loadGuides function not available in context");
      return [];
    }
  }
  
  /**
   * Clear all guides from the canvas
   * @returns {boolean} Success status
   */
  function clearGuides() {
    if (!canvas) return false;
    
    const guides = canvas.getObjects().filter(obj => obj.guide);
    
    guides.forEach(guide => {
      canvas.remove(guide);
    });
    
    canvas.renderAll();
    return true;
  }
  
  // Return the guide management functions
  return {
    handleCreateGuide,
    handleUpdateGuide,
    handleDeleteGuide,
    saveGuidesToDocument,
    loadGuidesFromDocument,
    clearGuides
  };
}