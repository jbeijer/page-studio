/**
 * GuideService.js
 * Centralized service for guide management in PageStudio
 * 
 * This service handles all guide-related functionality including:
 * - Creating horizontal and vertical guides
 * - Making guides draggable
 * - Updating guide positions
 * - Deleting guides
 * - Loading guides from the document
 * - Saving guides to the document
 */
import { fabric } from 'fabric';
import { get } from 'svelte/store';
import { currentDocument, currentPage, updateDocument } from '$lib/stores/document';
import documentService from './DocumentService';

class GuideService {
  constructor() {
    // Core properties
    this.canvas = null;
    this.canvasWidth = 1240;
    this.canvasHeight = 1754;
    this.initialized = false;
    
    // Guide properties
    this.guideColor = '#0066CC';
    this.guideStrokeWidth = 1;
    this.guideDashArray = [5, 5];
    
    // Bind methods to ensure consistent 'this' context
    this.initialize = this.initialize.bind(this);
    this.createHorizontalGuide = this.createHorizontalGuide.bind(this);
    this.createVerticalGuide = this.createVerticalGuide.bind(this);
    this.makeGuideDraggable = this.makeGuideDraggable.bind(this);
    this.updateGuidePosition = this.updateGuidePosition.bind(this);
    this.deleteGuide = this.deleteGuide.bind(this);
    this.loadGuides = this.loadGuides.bind(this);
    this.loadGuidesFromDocument = this.loadGuidesFromDocument.bind(this);
    this.saveGuidesToDocument = this.saveGuidesToDocument.bind(this);
    this.clearGuides = this.clearGuides.bind(this);
    this.handleCreateGuide = this.handleCreateGuide.bind(this);
    this.handleUpdateGuide = this.handleUpdateGuide.bind(this);
    this.handleDeleteGuide = this.handleDeleteGuide.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the guide service
   * @param {Object} options - Initialization options
   * @returns {GuideService} This service instance for chaining
   */
  initialize(options = {}) {
    console.log('GuideService: Initializing');
    
    this.canvas = options.canvas || null;
    this.canvasWidth = options.width || 1240;
    this.canvasHeight = options.height || 1754;
    
    // Set custom properties if provided
    if (options.guideColor) this.guideColor = options.guideColor;
    if (options.guideStrokeWidth) this.guideStrokeWidth = options.guideStrokeWidth;
    if (options.guideDashArray) this.guideDashArray = options.guideDashArray;
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$guideService = this;
    }
    
    this.initialized = true;
    return this;
  }
  
  /**
   * Create a horizontal guide line
   * @param {number} position - Y position of guide
   * @returns {fabric.Line|null} The created guide object
   */
  createHorizontalGuide(position) {
    if (!this.canvas) {
      console.warn('GuideService: Cannot create guide - Canvas is not available');
      return null;
    }
    
    console.log(`GuideService: Creating horizontal guide at ${position}`);
    
    // Create the guide line on the canvas
    const guide = new fabric.Line([0, position, this.canvasWidth, position], {
      stroke: this.guideColor,
      strokeWidth: this.guideStrokeWidth,
      strokeDashArray: this.guideDashArray,
      selectable: false,
      evented: true,
      guide: true,
      orientation: 'horizontal',
      horizontal: true, // For backward compatibility
      excludeFromExport: true,
      originalPosition: position // Store original position for updating
    });
    
    // Add guide to canvas
    this.canvas.add(guide);
    
    // Make guide draggable
    this.makeGuideDraggable(guide);
    
    // Request canvas render
    this.canvas.requestRenderAll();
    
    // Save guides to document
    this.saveGuidesToDocument();
    
    return guide;
  }
  
  /**
   * Create a vertical guide line
   * @param {number} position - X position of guide
   * @returns {fabric.Line|null} The created guide object
   */
  createVerticalGuide(position) {
    if (!this.canvas) {
      console.warn('GuideService: Cannot create guide - Canvas is not available');
      return null;
    }
    
    console.log(`GuideService: Creating vertical guide at ${position}`);
    
    // Create the guide line on the canvas
    const guide = new fabric.Line([position, 0, position, this.canvasHeight], {
      stroke: this.guideColor,
      strokeWidth: this.guideStrokeWidth,
      strokeDashArray: this.guideDashArray,
      selectable: false,
      evented: true,
      guide: true,
      orientation: 'vertical',
      horizontal: false, // For backward compatibility
      excludeFromExport: true,
      originalPosition: position // Store original position for updating
    });
    
    // Add guide to canvas
    this.canvas.add(guide);
    
    // Make guide draggable
    this.makeGuideDraggable(guide);
    
    // Request canvas render
    this.canvas.requestRenderAll();
    
    // Save guides to document
    this.saveGuidesToDocument();
    
    return guide;
  }
  
  /**
   * Make a guide draggable
   * @param {fabric.Line} guide - Guide object
   */
  makeGuideDraggable(guide) {
    if (!this.canvas || !guide) return;
    
    const canvas = this.canvas;
    const self = this;
    
    // Set up drag behavior
    guide.on('mousedown', function(e) {
      // Save initial position for dragging calculations
      const isHorizontal = guide.orientation === 'horizontal';
      const initialGuidePosition = isHorizontal ? guide.top : guide.left;
      
      // Disable selection when dragging guides
      canvas.selection = false;
      
      // Store original positions for reference
      canvas.lastPosX = e.pointer.x;
      canvas.lastPosY = e.pointer.y;
      
      const moveGuide = function(e) {
        if (guide.orientation === 'horizontal') {
          // Move horizontal guide
          guide.set('top', e.pointer.y);
          guide.setCoords();
          
          // Update endpoints to keep line spanning canvas
          guide.set({
            x1: 0,
            x2: self.canvasWidth,
            y1: guide.top,
            y2: guide.top
          });
        } else {
          // Move vertical guide
          guide.set('left', e.pointer.x);
          guide.setCoords();
          
          // Update endpoints to keep line spanning canvas
          guide.set({
            x1: guide.left,
            x2: guide.left,
            y1: 0,
            y2: self.canvasHeight
          });
        }
        
        canvas.requestRenderAll();
      };
      
      // Activate mousemove handler
      canvas.on('mouse:move', moveGuide);
      
      // Set up mouseup handler to end drag
      canvas.once('mouse:up', function() {
        canvas.off('mouse:move', moveGuide);
        canvas.selection = true;
        canvas.requestRenderAll();
        
        // Update guide position in document
        self.updateGuidePosition(guide);
      });
    });
    
    // Set up double-click to delete guide
    guide.on('dblclick', function() {
      self.deleteGuide(guide);
    });
  }
  
  /**
   * Update guide position in document model
   * @param {fabric.Line} guide - Guide object
   */
  updateGuidePosition(guide) {
    if (!guide) return;
    
    const doc = get(currentDocument);
    const pageId = get(currentPage);
    
    if (!doc || !pageId) {
      console.warn('GuideService: Cannot update guide - Document or page not available');
      return false;
    }
    
    // Update the guide position in the document data
    const isHorizontal = guide.orientation === 'horizontal';
    const originalPosition = guide.originalPosition;
    const newPosition = isHorizontal ? guide.top : guide.left;
    
    // Find the page in the document
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    if (pageIndex < 0) {
      console.warn(`GuideService: Cannot update guide - Page ${pageId} not found in document`);
      return false;
    }
    
    // Clone the current page to update it
    const updatedPages = [...doc.pages];
    
    // Make sure we have guides defined
    if (!updatedPages[pageIndex].guides) {
      updatedPages[pageIndex].guides = { horizontal: [], vertical: [] };
    }
    
    // Get the appropriate guides array
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
    
    // Update the document with the modified page
    updateDocument({
      ...doc,
      pages: updatedPages,
      lastModified: new Date()
    });
    
    // Force save document
    documentService.forceSave();
    
    return true;
  }
  
  /**
   * Delete a guide
   * @param {fabric.Line} guide - Guide object
   * @returns {boolean} Success status
   */
  deleteGuide(guide) {
    if (!this.canvas || !guide) {
      console.warn('GuideService: Cannot delete guide - Canvas or guide not available');
      return false;
    }
    
    const doc = get(currentDocument);
    const pageId = get(currentPage);
    
    if (!doc || !pageId) {
      console.warn('GuideService: Cannot delete guide - Document or page not available');
      return false;
    }
    
    // Remove from canvas
    this.canvas.remove(guide);
    this.canvas.requestRenderAll();
    
    // Get the position to remove
    const isHorizontal = guide.orientation === 'horizontal';
    const position = guide.originalPosition;
    
    // Find the page in the document
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    if (pageIndex < 0) {
      console.warn(`GuideService: Cannot delete guide - Page ${pageId} not found in document`);
      return false;
    }
    
    // Clone the current page to update it
    const updatedPages = [...doc.pages];
    
    // Make sure we have guides defined
    if (!updatedPages[pageIndex].guides) {
      // Nothing to delete
      return true;
    }
    
    // Get the appropriate guides array
    const guidesArray = isHorizontal 
      ? updatedPages[pageIndex].guides.horizontal 
      : updatedPages[pageIndex].guides.vertical;
    
    // Remove from array
    const index = guidesArray.indexOf(position);
    if (index >= 0) {
      guidesArray.splice(index, 1);
    }
    
    // Update the document with the modified page
    updateDocument({
      ...doc,
      pages: updatedPages,
      lastModified: new Date()
    });
    
    // Force save document
    documentService.forceSave();
    
    return true;
  }
  
  /**
   * Load guides from document to canvas
   * @returns {Array} Array of loaded guide objects
   */
  loadGuides() {
    if (!this.canvas) {
      console.warn('GuideService: Cannot load guides - Canvas not available');
      return [];
    }
    
    return this.loadGuidesFromDocument();
  }
  
  /**
   * Load guides from the current document/page
   * @returns {Array} Array of loaded guide objects
   */
  loadGuidesFromDocument() {
    if (!this.canvas) {
      console.warn('GuideService: Cannot load guides - Canvas not available');
      return [];
    }
    
    const doc = get(currentDocument);
    const pageId = get(currentPage);
    
    if (!doc || !pageId) {
      console.warn('GuideService: Cannot load guides - Document or page not available');
      return [];
    }
    
    console.log(`GuideService: Loading guides for page ${pageId}`);
    
    // Remove existing guides from canvas
    this.clearGuides();
    
    // Find current page in document
    const page = doc.pages.find(p => p.id === pageId);
    if (!page || !page.guides) {
      console.log('GuideService: No guides found for current page');
      return [];
    }
    
    const loadedGuides = [];
    
    // Create horizontal guides
    if (page.guides.horizontal && Array.isArray(page.guides.horizontal)) {
      page.guides.horizontal.forEach(position => {
        const guide = new fabric.Line([0, position, this.canvasWidth, position], {
          stroke: this.guideColor,
          strokeWidth: this.guideStrokeWidth,
          strokeDashArray: this.guideDashArray,
          selectable: false,
          evented: true,
          guide: true,
          orientation: 'horizontal',
          horizontal: true, // For backward compatibility
          excludeFromExport: true,
          originalPosition: position
        });
        
        this.canvas.add(guide);
        this.makeGuideDraggable(guide);
        loadedGuides.push(guide);
      });
    }
    
    // Create vertical guides
    if (page.guides.vertical && Array.isArray(page.guides.vertical)) {
      page.guides.vertical.forEach(position => {
        const guide = new fabric.Line([position, 0, position, this.canvasHeight], {
          stroke: this.guideColor,
          strokeWidth: this.guideStrokeWidth,
          strokeDashArray: this.guideDashArray,
          selectable: false,
          evented: true,
          guide: true,
          orientation: 'vertical',
          horizontal: false, // For backward compatibility
          excludeFromExport: true,
          originalPosition: position
        });
        
        this.canvas.add(guide);
        this.makeGuideDraggable(guide);
        loadedGuides.push(guide);
      });
    }
    
    this.canvas.requestRenderAll();
    console.log(`GuideService: Loaded ${loadedGuides.length} guides`);
    
    return loadedGuides;
  }
  
  /**
   * Save the current guides to the document
   * @returns {boolean} Success status
   */
  saveGuidesToDocument() {
    if (!this.canvas) {
      console.warn('GuideService: Cannot save guides - Canvas not available');
      return false;
    }
    
    const doc = get(currentDocument);
    const pageId = get(currentPage);
    
    if (!doc || !pageId) {
      console.warn('GuideService: Cannot save guides - Document or page not available');
      return false;
    }
    
    console.log(`GuideService: Saving guides for page ${pageId}`);
    
    const guides = { 
      horizontal: [], 
      vertical: [] 
    };
    
    // Collect all guides from canvas
    this.canvas.getObjects().forEach(obj => {
      if (obj.guide) {
        if (obj.orientation === 'horizontal') {
          guides.horizontal.push(obj.top);
        } else {
          guides.vertical.push(obj.left);
        }
      }
    });
    
    // Find the page in the document
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    if (pageIndex < 0) {
      console.warn(`GuideService: Cannot save guides - Page ${pageId} not found in document`);
      return false;
    }
    
    // Update the document with the modified page
    const updatedPages = [...doc.pages];
    updatedPages[pageIndex] = {
      ...updatedPages[pageIndex],
      guides
    };
    
    updateDocument({
      ...doc,
      pages: updatedPages,
      lastModified: new Date()
    });
    
    // Force save document
    documentService.forceSave();
    
    return true;
  }
  
  /**
   * Clear all guides from the canvas
   * @returns {boolean} Success status
   */
  clearGuides() {
    if (!this.canvas) {
      console.warn('GuideService: Cannot clear guides - Canvas not available');
      return false;
    }
    
    console.log('GuideService: Clearing all guides from canvas');
    
    // Get all guide objects
    const guides = this.canvas.getObjects().filter(obj => obj.guide);
    
    // Remove each guide
    guides.forEach(guide => {
      this.canvas.remove(guide);
    });
    
    // Request render
    this.canvas.requestRenderAll();
    
    return true;
  }
  
  /**
   * Handle guide creation event
   * @param {Object} detail - Event detail with position and orientation
   * @returns {fabric.Line|null} The created guide object
   */
  handleCreateGuide(detail) {
    if (!this.canvas) {
      console.warn('GuideService: Cannot create guide - Canvas not available');
      return null;
    }
    
    const { position, orientation } = detail;
    
    console.log(`GuideService: Handling guide creation: ${orientation} at ${position}`);
    
    let guide = null;
    
    if (orientation === 'horizontal') {
      guide = this.createHorizontalGuide(position);
    } else {
      guide = this.createVerticalGuide(position);
    }
    
    return guide;
  }
  
  /**
   * Handle guide update event
   * @param {Object} detail - Event detail with position and orientation
   * @returns {boolean} Success status
   */
  handleUpdateGuide(detail) {
    // Update is essentially same as create in terms of persistence
    this.handleCreateGuide(detail);
    return true;
  }
  
  /**
   * Handle guide deletion event
   * @param {Object} detail - Event detail with guide id
   * @returns {boolean} Success status
   */
  handleDeleteGuide(detail) {
    if (!this.canvas) {
      console.warn('GuideService: Cannot delete guide - Canvas not available');
      return false;
    }
    
    const { id } = detail;
    
    if (id) {
      const guideObj = this.canvas.getObjects().find(obj => obj.id === id && obj.guide);
      
      if (guideObj) {
        this.deleteGuide(guideObj);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('GuideService: Cleaning up resources');
    
    // Clear guides from canvas if canvas is available
    if (this.canvas) {
      this.clearGuides();
    }
    
    // Clear references
    this.canvas = null;
  }
}

// Create singleton instance
const guideService = new GuideService();

export default guideService;