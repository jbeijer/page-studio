/**
 * MasterPageService.js
 * Centralized service for master page management in PageStudio
 * 
 * This service handles master page-related functionality including:
 * - Creating, updating, and deleting master pages
 * - Applying master pages to document pages
 * - Overriding master page objects
 */
import { fabric } from 'fabric';
import { get } from 'svelte/store';
import { currentDocument, currentPage, updateDocument } from '$lib/stores/document';
import documentService from './DocumentService';

class MasterPageService {
  constructor() {
    this.canvas = null;
    
    // Bind methods to ensure consistent 'this' context
    this.initialize = this.initialize.bind(this);
    this.createMasterPage = this.createMasterPage.bind(this);
    this.updateMasterPage = this.updateMasterPage.bind(this);
    this.deleteMasterPage = this.deleteMasterPage.bind(this);
    this.applyMasterPage = this.applyMasterPage.bind(this);
    this.overrideMasterObject = this.overrideMasterObject.bind(this);
    this.loadMasterPage = this.loadMasterPage.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the master page service with a canvas reference
   * @param {Object} canvas - Fabric.js canvas instance
   * @returns {MasterPageService} This service instance for chaining
   */
  initialize(canvas) {
    console.log('MasterPageService: Initializing with canvas reference');
    this.canvas = canvas;
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$masterPageService = this;
    }
    
    return this;
  }

  /**
   * Create a new master page
   * @param {Object} options - Master page options
   * @returns {string} ID of the created master page
   */
  createMasterPage(options = { title: 'New Master Page' }) {
    const doc = get(currentDocument);
    
    if (!doc) {
      console.error('MasterPageService: Cannot create master page - No current document');
      return null;
    }
    
    // Generate ID
    const masterId = `master-${Date.now()}`;
    
    // Create master page structure
    const masterPage = {
      id: masterId,
      title: options.title,
      canvasJSON: JSON.stringify({
        version: "5.3.0",
        objects: [],
        background: "white"
      }),
      created: new Date(),
      lastModified: new Date()
    };
    
    console.log(`MasterPageService: Creating new master page "${options.title}" with ID: ${masterId}`);
    
    // Add to document
    const masterPages = [...(doc.masterPages || []), masterPage];
    
    // Update document
    updateDocument({
      ...doc,
      masterPages,
      lastModified: new Date()
    });
    
    // Force save
    documentService.forceSave();
    
    return masterId;
  }

  /**
   * Update an existing master page
   * @param {string} masterId - ID of the master page to update
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success status
   */
  updateMasterPage(masterId, updates = {}) {
    const doc = get(currentDocument);
    
    if (!doc || !doc.masterPages) {
      console.error('MasterPageService: Cannot update master page - No current document or master pages');
      return false;
    }
    
    // Find master page
    const masterIndex = doc.masterPages.findIndex(m => m.id === masterId);
    
    if (masterIndex < 0) {
      console.error(`MasterPageService: Cannot update master page - Master page ${masterId} not found`);
      return false;
    }
    
    try {
      console.log(`MasterPageService: Updating master page "${doc.masterPages[masterIndex].title}" (${masterId})`);
      
      // Create updated master pages array
      const masterPages = [...doc.masterPages];
      
      // Update specific master page
      masterPages[masterIndex] = {
        ...masterPages[masterIndex],
        ...updates,
        lastModified: new Date()
      };
      
      // Update document
      updateDocument({
        ...doc,
        masterPages,
        lastModified: new Date()
      });
      
      // Force save
      documentService.forceSave();
      
      return true;
    } catch (err) {
      console.error(`MasterPageService: Error updating master page ${masterId}:`, err);
      return false;
    }
  }

  /**
   * Delete a master page
   * @param {string} masterId - ID of the master page to delete
   * @returns {boolean} Success status
   */
  deleteMasterPage(masterId) {
    const doc = get(currentDocument);
    
    if (!doc || !doc.masterPages) {
      console.error('MasterPageService: Cannot delete master page - No current document or master pages');
      return false;
    }
    
    try {
      console.log(`MasterPageService: Deleting master page ${masterId}`);
      
      // Filter out the master page to delete
      const masterPages = doc.masterPages.filter(m => m.id !== masterId);
      
      // Check if any pages use this master page
      const affectedPages = doc.pages.filter(p => p.masterPageId === masterId);
      
      // If pages use this master page, we need to remove references
      if (affectedPages.length > 0) {
        console.log(`MasterPageService: ${affectedPages.length} pages reference this master page, updating references`);
        
        // Update pages to remove master page references
        const updatedPages = doc.pages.map(page => {
          if (page.masterPageId === masterId) {
            return {
              ...page,
              masterPageId: null,
              overrides: {}
            };
          }
          return page;
        });
        
        // Update document with both changes
        updateDocument({
          ...doc,
          pages: updatedPages,
          masterPages,
          lastModified: new Date()
        });
      } else {
        // Update document with just master pages change
        updateDocument({
          ...doc,
          masterPages,
          lastModified: new Date()
        });
      }
      
      // Force save
      documentService.forceSave();
      
      return true;
    } catch (err) {
      console.error(`MasterPageService: Error deleting master page ${masterId}:`, err);
      return false;
    }
  }

  /**
   * Apply a master page to a document page
   * @param {string} pageId - ID of the page to apply the master page to
   * @param {string} masterId - ID of the master page to apply
   * @returns {boolean} Success status
   */
  applyMasterPage(pageId, masterId) {
    const doc = get(currentDocument);
    const canvas = this.canvas;
    
    if (!doc || !canvas) {
      console.error('MasterPageService: Cannot apply master page - Missing document or canvas');
      return false;
    }
    
    // Find the page
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    
    if (pageIndex < 0) {
      console.error(`MasterPageService: Cannot apply master page - Page ${pageId} not found`);
      return false;
    }
    
    // Verify master page exists
    const masterPage = doc.masterPages?.find(m => m.id === masterId);
    
    if (!masterPage) {
      console.error(`MasterPageService: Cannot apply master page - Master page ${masterId} not found`);
      return false;
    }
    
    try {
      console.log(`MasterPageService: Applying master page "${masterPage.title}" to page ${pageId}`);
      
      // Save current canvas state first
      documentService.saveCurrentPage();
      
      // Update the page's master page reference
      const updatedPages = [...doc.pages];
      updatedPages[pageIndex] = {
        ...updatedPages[pageIndex],
        masterPageId: masterId,
        overrides: updatedPages[pageIndex].overrides || {}
      };
      
      // Update document
      updateDocument({
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      });
      
      // If this is the current page, apply master page objects to canvas
      if (pageId === get(currentPage)) {
        this.applyMasterPageToCanvas(masterId, updatedPages[pageIndex].overrides || {});
      }
      
      // Force save
      documentService.forceSave();
      
      return true;
    } catch (err) {
      console.error(`MasterPageService: Error applying master page ${masterId} to page ${pageId}:`, err);
      return false;
    }
  }

  /**
   * Override a master page object on the current page
   * @param {Object} masterObject - Master object to override
   * @returns {Object|null} The overridden object or null if failed
   */
  overrideMasterObject(masterObject) {
    const doc = get(currentDocument);
    const pageId = get(currentPage);
    const canvas = this.canvas;
    
    if (!doc || !pageId || !canvas || !masterObject || !masterObject.fromMaster || !masterObject.masterObjectId) {
      console.error('MasterPageService: Cannot override master object - Invalid parameters or missing context');
      return null;
    }
    
    try {
      console.log(`MasterPageService: Overriding master object: ${masterObject.type}, ID: ${masterObject.masterObjectId}`);
      
      // Clone the master object
      let clone;
      
      // Handle cloning differently based on object type
      switch (masterObject.type) {
        case 'textbox':
          clone = new fabric.Textbox(masterObject.text || 'Text', {
            left: masterObject.left,
            top: masterObject.top,
            width: masterObject.width,
            fontFamily: masterObject.fontFamily,
            fontSize: masterObject.fontSize,
            fontStyle: masterObject.fontStyle,
            fontWeight: masterObject.fontWeight,
            textAlign: masterObject.textAlign,
            fill: masterObject.fill,
            angle: masterObject.angle,
            scaleX: masterObject.scaleX,
            scaleY: masterObject.scaleY
          });
          break;
          
        case 'rect':
          clone = new fabric.Rect({
            left: masterObject.left,
            top: masterObject.top,
            width: masterObject.width,
            height: masterObject.height,
            fill: masterObject.fill,
            stroke: masterObject.stroke,
            strokeWidth: masterObject.strokeWidth,
            rx: masterObject.rx,
            ry: masterObject.ry,
            angle: masterObject.angle,
            scaleX: masterObject.scaleX,
            scaleY: masterObject.scaleY
          });
          break;
          
        case 'circle':
          clone = new fabric.Circle({
            left: masterObject.left,
            top: masterObject.top,
            radius: masterObject.radius,
            fill: masterObject.fill,
            stroke: masterObject.stroke,
            strokeWidth: masterObject.strokeWidth,
            angle: masterObject.angle,
            scaleX: masterObject.scaleX,
            scaleY: masterObject.scaleY
          });
          break;
          
        default:
          // For other object types, try standard cloning
          try {
            clone = fabric.util.object.clone(masterObject);
          } catch (cloneErr) {
            console.error("Error cloning master object:", cloneErr);
            return null;
          }
          break;
      }
      
      // Generate a new unique ID for the clone
      clone.id = `override-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Remove master-specific properties
      clone.fromMaster = false;
      clone.masterId = undefined;
      clone.masterObjectId = undefined;
      clone.overridable = undefined;
      
      // Make selectable and interactive
      clone.selectable = true;
      clone.evented = true;
      clone.hoverCursor = 'move';
      clone.visible = true;
      
      // Restore full opacity
      clone.opacity = 1;
      
      // Add to canvas
      canvas.add(clone);
      
      // Remove the master object
      canvas.remove(masterObject);
      
      // Mark as overridden in the current page
      const pageIndex = doc.pages.findIndex(p => p.id === pageId);
      
      if (pageIndex >= 0) {
        const updatedPages = [...doc.pages];
        if (!updatedPages[pageIndex].overrides) {
          updatedPages[pageIndex].overrides = {};
        }
        
        updatedPages[pageIndex].overrides[masterObject.masterObjectId] = true;
        
        // Update document
        updateDocument({
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        });
        
        // Force save
        setTimeout(() => {
          documentService.saveCurrentPage();
        }, 100);
      }
      
      // Ensure visibility
      canvas.setActiveObject(clone);
      canvas.requestRenderAll();
      canvas.renderAll();
      
      return clone;
    } catch (err) {
      console.error("MasterPageService: Error overriding master object:", err);
      return null;
    }
  }

  /**
   * Load a master page into the canvas for editing
   * @param {string} masterId - ID of the master page to load
   * @returns {Promise<boolean>} Success status
   */
  async loadMasterPage(masterId) {
    const doc = get(currentDocument);
    const canvas = this.canvas;
    
    if (!doc || !canvas) {
      console.error('MasterPageService: Cannot load master page - Missing document or canvas');
      return false;
    }
    
    // Find the master page
    const masterPage = doc.masterPages?.find(m => m.id === masterId);
    
    if (!masterPage) {
      console.error(`MasterPageService: Cannot load master page - Master page ${masterId} not found`);
      return false;
    }
    
    try {
      console.log(`MasterPageService: Loading master page "${masterPage.title}" (${masterId})`);
      
      // Save current page first
      documentService.saveCurrentPage();
      
      // Clear canvas
      canvas.clear();
      canvas.backgroundColor = 'white';
      canvas.renderAll();
      
      // Set canvas reference
      canvas.masterPageId = masterId;
      
      // If master page has no content, return early
      if (!masterPage.canvasJSON) {
        console.log(`MasterPageService: Master page ${masterId} has no content, using empty canvas`);
        return true;
      }
      
      // Load master page content
      const jsonData = JSON.parse(masterPage.canvasJSON);
      
      // Set canvas background
      canvas.backgroundColor = jsonData.background || 'white';
      
      if (jsonData.objects && jsonData.objects.length > 0) {
        // Load objects
        fabric.util.enlivenObjects(jsonData.objects, (objects) => {
          // Add all objects to canvas
          objects.forEach(obj => {
            // Ensure all objects are visible and editable
            obj.visible = true;
            obj.evented = true;
            obj.selectable = true;
            
            // Mark as being from this master page
            obj.fromMaster = false; // Not treated as master object while editing
            obj.masterId = masterId;
            obj.masterObjectId = obj.masterObjectId || `master-obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            obj.overridable = obj.overridable !== false;
            
            // Add to canvas
            canvas.add(obj);
          });
          
          canvas.requestRenderAll();
          canvas.renderAll();
        });
      }
      
      return true;
    } catch (err) {
      console.error(`MasterPageService: Error loading master page ${masterId}:`, err);
      
      // Create empty canvas as fallback
      canvas.clear();
      canvas.backgroundColor = 'white';
      canvas.renderAll();
      
      return false;
    }
  }

  /**
   * Save the current canvas state to a master page
   * @param {string} masterId - ID of the master page to save to
   * @returns {boolean} Success status
   */
  saveMasterPage(masterId) {
    const doc = get(currentDocument);
    const canvas = this.canvas;
    
    if (!doc || !canvas) {
      console.error('MasterPageService: Cannot save master page - Missing document or canvas');
      return false;
    }
    
    // Find the master page
    const masterIndex = doc.masterPages?.findIndex(m => m.id === masterId);
    
    if (masterIndex < 0) {
      console.error(`MasterPageService: Cannot save master page - Master page ${masterId} not found`);
      return false;
    }
    
    try {
      console.log(`MasterPageService: Saving master page ${masterId}`);
      
      // Get objects from canvas
      const objects = canvas.getObjects();
      
      // Ensure all objects have proper master page properties
      objects.forEach(obj => {
        if (!obj.id) {
          obj.id = `master-obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        if (!obj.masterObjectId) {
          obj.masterObjectId = `master-obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        obj.fromMaster = true;
        obj.masterId = masterId;
        obj.overridable = obj.overridable !== false;
      });
      
      // Serialize canvas
      const canvasData = canvas.toJSON([
        'id', 
        'masterObjectId', 
        'fromMaster', 
        'masterId', 
        'overridable'
      ]);
      
      // Stringify
      const canvasJSON = JSON.stringify(canvasData);
      
      // Update master page
      const masterPages = [...doc.masterPages];
      masterPages[masterIndex] = {
        ...masterPages[masterIndex],
        canvasJSON,
        lastModified: new Date()
      };
      
      // Update document
      updateDocument({
        ...doc,
        masterPages,
        lastModified: new Date()
      });
      
      // Force save
      documentService.forceSave();
      
      return true;
    } catch (err) {
      console.error(`MasterPageService: Error saving master page ${masterId}:`, err);
      return false;
    }
  }

  /**
   * Apply master page objects to the current canvas
   * @private
   * @param {string} masterId - ID of the master page
   * @param {Object} overrides - Object overrides
   * @returns {boolean} Success status
   */
  applyMasterPageToCanvas(masterId, overrides = {}) {
    const doc = get(currentDocument);
    const canvas = this.canvas;
    
    if (!doc || !canvas) {
      return false;
    }
    
    // Find the master page
    const masterPage = doc.masterPages?.find(m => m.id === masterId);
    
    if (!masterPage || !masterPage.canvasJSON) {
      return false;
    }
    
    try {
      // Parse master page data
      const jsonData = JSON.parse(masterPage.canvasJSON);
      
      // Process master page objects
      if (jsonData && jsonData.objects && Array.isArray(jsonData.objects)) {
        const objectsToEnliven = jsonData.objects.filter(
          objData => !(objData.masterObjectId && overrides[objData.masterObjectId])
        );
        
        if (objectsToEnliven.length > 0) {
          console.log(`MasterPageService: Applying ${objectsToEnliven.length} master objects to canvas`);
          
          // Load master objects
          fabric.util.enlivenObjects(objectsToEnliven, (objects) => {
            objects.forEach(obj => {
              // Mark as from master page
              obj.fromMaster = true;
              obj.masterId = masterId;
              obj.masterObjectId = obj.masterObjectId || `master-obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              obj.overridable = obj.overridable !== false;
              
              // Special settings for master objects
              obj.selectable = false;
              obj.evented = true;
              obj.hoverCursor = 'not-allowed';
              obj.visible = true;
              
              // Add to canvas
              canvas.add(obj);
              
              // Move master objects to back
              obj.moveTo(0);
            });
            
            canvas.requestRenderAll();
            canvas.renderAll();
          });
        }
      }
      
      return true;
    } catch (err) {
      console.error(`MasterPageService: Error applying master page ${masterId}:`, err);
      return false;
    }
  }

  /**
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('MasterPageService: Cleaning up resources');
    this.canvas = null;
  }
}

// Create singleton instance
const masterPageService = new MasterPageService();

export default masterPageService;