/**
 * DocumentService.js
 * Centralized service for document and page management in PageStudio
 * 
 * This service handles all document operations including:
 * - Document creation, loading, and saving
 * - Page management (adding, switching, saving)
 * - Canvas state synchronization
 * - Auto-saving functionality
 */
import { get } from 'svelte/store';
import { currentDocument, currentPage, setCurrentDocument, updateDocument } from '$lib/stores/document';
import { canvasReady } from '$lib/stores/canvasReady';
import { saveDocument, loadDocument } from '$lib/utils/storage';
import { fabric } from 'fabric';

class DocumentService {
  constructor() {
    this.canvasRef = null;
    this.autoSaveInterval = null;
    this.forceSaveInterval = null;
    this.beforeUnloadHandler = null;
    this.initialized = false;
    
    // Constants
    this.AUTO_SAVE_DELAY_MS = 30000; // 30 seconds
    this.FORCE_SAVE_INTERVAL_MS = 15000; // 15 seconds
    
    // Bind methods to ensure consistent 'this' context
    this.initialize = this.initialize.bind(this);
    this.createNewDocument = this.createNewDocument.bind(this);
    this.loadDocumentById = this.loadDocumentById.bind(this);
    this.saveCurrentPage = this.saveCurrentPage.bind(this);
    this.saveSpecificPage = this.saveSpecificPage.bind(this);
    this.addPage = this.addPage.bind(this);
    this.switchToPage = this.switchToPage.bind(this);
    this.setupAutoSave = this.setupAutoSave.bind(this);
    this.forceSave = this.forceSave.bind(this);
    this.updateDocumentTitle = this.updateDocumentTitle.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the document service with a canvas reference
   * @param {Object} canvas - Fabric.js canvas instance
   */
  initialize(canvas) {
    console.log('DocumentService: Initializing with canvas reference');
    this.canvasRef = canvas;
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$documentService = this;
    }
    
    // Setup auto-save functionality
    this.setupAutoSave();
    this.setupForceSave();
    this.setupBeforeUnloadHandler();
    
    this.initialized = true;
    return this;
  }

  /**
   * Creates a new empty document
   * @param {Object} options - Document creation options
   * @returns {Promise<Object>} - The newly created document
   */
  async createNewDocument(options = { title: 'Untitled Document', format: 'A4', pageCount: 1 }) {
    console.log('DocumentService: Creating new document with options:', options);
    
    // Reset canvas completely before creating a new document
    if (this.canvasRef) {
      this._resetCanvas();
    }
    
    // Clear global variables
    this._clearGlobalVariables();
    
    // Create the document structure
    const newDoc = {
      id: 'doc-' + Date.now(),
      title: options.title,
      format: options.format,
      created: new Date(),
      lastModified: new Date(),
      pages: [],
      masterPages: [],
      metadata: {
        pageSize: { 
          width: options.format === 'A4' ? 210 : 148, 
          height: options.format === 'A4' ? 297 : 210 
        },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        grid: {
          enabled: false,
          size: 10,
          color: '#CCCCCC',
          opacity: 0.5,
          snap: false
        },
        rulers: {
          enabled: true,
          horizontalVisible: true,
          verticalVisible: true,
          units: 'mm'
        }
      }
    };
    
    // Create pages based on pageCount
    for (let i = 0; i < options.pageCount; i++) {
      newDoc.pages.push({
        id: `page-${i + 1}`,
        canvasJSON: JSON.stringify({
          version: "5.3.0",
          objects: [],
          background: "white"
        }),
        masterPageId: null,
        overrides: {},
        guides: {
          horizontal: [],
          vertical: []
        }
      });
    }
    
    // Set the document in the store
    setCurrentDocument(newDoc);
    
    // Set the first page as active
    currentPage.set(newDoc.pages[0].id);
    
    // Update global references
    if (typeof window !== 'undefined') {
      window.$document = newDoc;
      window.$page = newDoc.pages[0].id;
    }
    
    // Save the document to storage
    try {
      await saveDocument(newDoc);
      console.log('DocumentService: New document saved to storage with ID:', newDoc.id);
    } catch (err) {
      console.error('DocumentService: Error saving new document:', err);
    }
    
    return newDoc;
  }

  /**
   * Loads a document by ID from storage
   * @param {string} docId - Document ID to load
   * @returns {Promise<Object|null>} - The loaded document or null if failed
   */
  async loadDocumentById(docId) {
    if (!docId) {
      console.error('DocumentService: Cannot load document - No document ID provided');
      return null;
    }
    
    try {
      console.log(`DocumentService: Loading document with ID: ${docId}`);
      
      // Reset canvas before loading a document
      if (this.canvasRef) {
        this._resetCanvas();
      }
      
      // Load the document from storage
      const loadedDocument = await loadDocument(docId);
      
      if (!loadedDocument) {
        console.error(`DocumentService: No document found with ID: ${docId}`);
        return null;
      }
      
      console.log(`DocumentService: Document loaded successfully:`, {
        title: loadedDocument.title,
        pageCount: loadedDocument.pages.length
      });
      
      // Ensure document has valid structure
      this._ensureValidDocumentStructure(loadedDocument);
      
      // Set the document in the store
      setCurrentDocument(loadedDocument);
      
      // Set first page as active if no current page
      if (!get(currentPage) && loadedDocument.pages.length > 0) {
        currentPage.set(loadedDocument.pages[0].id);
      }
      
      // Update global references
      if (typeof window !== 'undefined') {
        window.$document = loadedDocument;
        window.$page = get(currentPage);
      }
      
      return loadedDocument;
    } catch (err) {
      console.error('DocumentService: Error loading document:', err);
      return null;
    }
  }

  /**
   * Saves the current page to the document
   * @returns {boolean} Success status
   */
  saveCurrentPage() {
    const canvas = this.canvasRef;
    let doc = get(currentDocument);
    let pageId = get(currentPage);
    
    console.log(`DocumentService: Saving current page: ${pageId}`);
    
    if (!canvas) {
      console.warn('DocumentService: Cannot save page - Canvas is not initialized');
      return false;
    }
    
    if (!doc || !doc.pages) {
      console.error('DocumentService: Cannot save page - Document or document.pages is null');
      
      // Try to get document from global window object as backup
      if (window.$document && window.$document.pages) {
        doc = window.$document;
      } else {
        return false;
      }
    }
    
    if (!pageId) {
      console.warn('DocumentService: Cannot save page - No current page');
      
      // Try to get the page ID from canvas or global reference
      if (canvas.pageId) {
        pageId = canvas.pageId;
      } else if (window.$page) {
        pageId = window.$page;
      } else {
        return false;
      }
    }
    
    // Get the index of the page to save
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    
    if (pageIndex < 0) {
      console.warn(`DocumentService: Cannot save page - Page ${pageId} not found in document`);
      return false;
    }
    
    try {
      // Get the current objects from the canvas
      const objects = canvas.getObjects();
      console.log(`DocumentService: Found ${objects.length} objects to save on the canvas`);
      
      // Early exit if canvas is empty
      if (objects.length === 0) {
        const emptyCanvasJSON = JSON.stringify({
          version: "5.3.0",
          objects: [],
          background: "white"
        });
        
        // Update the document with empty canvas
        const updatedPages = [...doc.pages];
        updatedPages[pageIndex].canvasJSON = emptyCanvasJSON;
        
        // Update store
        updateDocument({
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        });
        
        console.log(`DocumentService: Empty page ${pageId} saved successfully`);
        return true;
      }
      
      // Ensure all objects have IDs
      objects.forEach(obj => {
        if (!obj.id) {
          obj.id = this._generateId();
        }
      });
      
      // Serialize canvas with custom properties
      const canvasData = canvas.toJSON([
        'id', 
        'linkedObjectIds', 
        'fromMaster', 
        'masterId', 
        'masterObjectId', 
        'overridable'
      ]);
      
      // Stringify canvas data
      const canvasJSON = JSON.stringify(canvasData);
      
      // Update the document
      const updatedPages = [...doc.pages];
      updatedPages[pageIndex] = {
        ...updatedPages[pageIndex],
        canvasJSON
      };
      
      // Update store
      updateDocument({
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      });
      
      console.log(`DocumentService: Page ${pageId} saved successfully with ${objects.length} objects`);
      return true;
    } catch (err) {
      console.error(`DocumentService: Error saving page ${pageId}:`, err);
      return false;
    }
  }

  /**
   * Saves a specific page's content without changing the current page
   * @param {string} pageId - ID of the page to save
   * @param {Array} objects - Canvas objects to save
   * @returns {boolean} Success status
   */
  saveSpecificPage(pageId, objects) {
    if (!pageId) {
      console.warn('DocumentService: Cannot save specific page - No page ID provided');
      return false;
    }
    
    let doc = get(currentDocument);
    
    if (!doc) {
      // Try to get the document from global reference
      if (window.$document) {
        doc = window.$document;
      } else {
        console.warn('DocumentService: Cannot save specific page - No current document');
        return false;
      }
    }
    
    // Get the index of the page to save
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    
    if (pageIndex < 0) {
      console.warn(`DocumentService: Cannot save specific page - Page ${pageId} not found in document`);
      return false;
    }
    
    try {
      console.log(`DocumentService: Saving specific page ${pageId} with ${objects.length} objects`);
      
      // If no objects, save minimal state
      if (!objects || objects.length === 0) {
        const emptyCanvasJSON = JSON.stringify({
          version: "5.3.0",
          objects: [],
          background: "white"
        });
        
        // Update document with empty canvas
        const updatedPages = [...doc.pages];
        updatedPages[pageIndex].canvasJSON = emptyCanvasJSON;
        
        // Update store
        updateDocument({
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        });
        
        console.log(`DocumentService: Empty page ${pageId} saved successfully`);
        return true;
      }
      
      // Create canvas-like object for serialization
      const tempCanvas = {
        _objects: objects,
        backgroundColor: 'white',
        toJSON: function(propertiesToInclude) {
          return {
            version: "5.3.0",
            objects: this._objects.map(obj => obj.toJSON(propertiesToInclude)),
            background: this.backgroundColor
          };
        }
      };
      
      // Serialize with custom properties
      const canvasData = tempCanvas.toJSON([
        'id', 
        'linkedObjectIds', 
        'fromMaster', 
        'masterId', 
        'masterObjectId', 
        'overridable'
      ]);
      
      // Stringify
      const canvasJSON = JSON.stringify(canvasData);
      
      // Update the document
      const updatedPages = [...doc.pages];
      updatedPages[pageIndex].canvasJSON = canvasJSON;
      
      // Update store
      updateDocument({
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      });
      
      console.log(`DocumentService: Page ${pageId} saved successfully with ${objects.length} objects`);
      return true;
    } catch (err) {
      console.error(`DocumentService: Error saving specific page ${pageId}:`, err);
      return false;
    }
  }

  /**
   * Adds a new page to the current document
   * @param {string} masterPageId - Optional master page ID
   * @returns {string} ID of the new page
   */
  addPage(masterPageId = null) {
    const doc = get(currentDocument);
    
    if (!doc) {
      console.error('DocumentService: Cannot add page - No current document');
      return null;
    }
    
    // Save current page first
    this.saveCurrentPage();
    
    // Create new page ID
    const pageId = `page-${doc.pages.length + 1}`;
    
    // Create new page
    const newPage = {
      id: pageId,
      canvasJSON: JSON.stringify({
        version: "5.3.0",
        objects: [],
        background: "white"
      }),
      masterPageId,
      overrides: {},
      guides: {
        horizontal: [],
        vertical: []
      }
    };
    
    // Add page to document
    const updatedDoc = {
      ...doc,
      pages: [...doc.pages, newPage],
      lastModified: new Date()
    };
    
    // Update document in store
    updateDocument(updatedDoc);
    
    // Switch to the new page
    currentPage.set(pageId);
    
    console.log(`DocumentService: Added new page with ID: ${pageId}`);
    
    // Clear canvas for new page
    if (this.canvasRef) {
      this.canvasRef.clear();
      this.canvasRef.backgroundColor = 'white';
      this.canvasRef.renderAll();
      
      // Save this initial empty state
      setTimeout(() => {
        this.saveCurrentPage();
      }, 100);
    }
    
    return pageId;
  }

  /**
   * Switch to a different page
   * @param {string} pageId - ID of the page to switch to
   * @returns {Promise<boolean>} Success status
   */
  async switchToPage(pageId) {
    const doc = get(currentDocument);
    
    if (!doc) {
      console.error('DocumentService: Cannot switch page - No current document');
      return false;
    }
    
    // Validate page exists
    const pageIndex = doc.pages.findIndex(p => p.id === pageId);
    if (pageIndex < 0) {
      console.error(`DocumentService: Cannot switch to page ${pageId} - Page not found in document`);
      return false;
    }
    
    // Save current page first
    const currentPageId = get(currentPage);
    if (currentPageId && currentPageId !== pageId) {
      this.saveCurrentPage();
    }
    
    // Set new page as current
    currentPage.set(pageId);
    
    // Clear canvas
    if (this.canvasRef) {
      this.canvasRef.clear();
      this.canvasRef.backgroundColor = 'white';
      this.canvasRef.renderAll();
      
      // Update global reference
      if (typeof window !== 'undefined') {
        window.$page = pageId;
      }
      
      try {
        // Load page content
        await this._loadPageContent(pageId);
        return true;
      } catch (err) {
        console.error(`DocumentService: Error loading page ${pageId}:`, err);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Force saves the current document (used for auto-save)
   * @returns {Promise<boolean>} Success status
   */
  async forceSave() {
    const doc = get(currentDocument);
    
    if (!doc) {
      return false;
    }
    
    console.log('DocumentService: Force saving document');
    
    // Save current page first if canvas is ready
    if (get(canvasReady) && this.canvasRef) {
      this.saveCurrentPage();
    }
    
    // Save document to storage
    try {
      await saveDocument(doc);
      console.log(`DocumentService: Document ${doc.id} force-saved successfully`);
      return true;
    } catch (err) {
      console.error('DocumentService: Error during force save:', err);
      return false;
    }
  }

  /**
   * Updates the document title
   * @param {string} title - New document title
   */
  updateDocumentTitle(title) {
    const doc = get(currentDocument);
    
    if (!doc) {
      return;
    }
    
    if (title !== doc.title) {
      console.log(`DocumentService: Updating document title from "${doc.title}" to "${title}"`);
      
      // Update document in store
      updateDocument({
        ...doc,
        title,
        lastModified: new Date()
      });
      
      // Save changes to storage
      this.forceSave();
    }
  }
  
  /**
   * Updates document metadata
   * @param {Object} metadata - Metadata properties to update
   * @returns {boolean} Success status
   */
  updateDocumentMetadata(metadata) {
    const doc = get(currentDocument);
    
    if (!doc) {
      console.warn('DocumentService: Cannot update metadata - No current document');
      return false;
    }
    
    console.log('DocumentService: Updating document metadata', metadata);
    
    // Clone the current document to update it
    const updatedDoc = {...doc};
    
    // Ensure metadata structure exists
    if (!updatedDoc.metadata) {
      updatedDoc.metadata = {};
    }
    
    // Update metadata properties
    updatedDoc.metadata = {
      ...updatedDoc.metadata,
      ...metadata
    };
    
    // Update document in store
    updateDocument({
      ...updatedDoc,
      lastModified: new Date()
    });
    
    // Save changes to storage
    this.forceSave();
    
    return true;
  }

  /**
   * Sets up auto-save functionality
   */
  setupAutoSave() {
    this.clearAutoSave();
    
    this.autoSaveInterval = setInterval(async () => {
      if (get(currentDocument)) {
        try {
          await this.forceSave();
        } catch (err) {
          console.error('DocumentService: Auto-save failed:', err);
        }
      }
    }, this.AUTO_SAVE_DELAY_MS);
    
    console.log(`DocumentService: Auto-save setup (interval: ${this.AUTO_SAVE_DELAY_MS}ms)`);
  }

  /**
   * Sets up forced periodic saves
   */
  setupForceSave() {
    this.clearForceSave();
    
    this.forceSaveInterval = setInterval(async () => {
      if (get(currentDocument)) {
        try {
          await this.forceSave();
        } catch (err) {
          console.error('DocumentService: Force save failed:', err);
        }
      }
    }, this.FORCE_SAVE_INTERVAL_MS);
    
    console.log(`DocumentService: Force save setup (interval: ${this.FORCE_SAVE_INTERVAL_MS}ms)`);
  }

  /**
   * Sets up page unload handler to save before user leaves
   */
  setupBeforeUnloadHandler() {
    this.clearBeforeUnloadHandler();
    
    this.beforeUnloadHandler = (event) => {
      console.log('DocumentService: User is leaving page, forcing document save');
      
      if (get(canvasReady) && this.canvasRef) {
        this.saveCurrentPage();
      }
      
      // Force save the document
      this.forceSave();
      
      // Show dialog to confirm leaving
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return event.returnValue;
    };
    
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    console.log('DocumentService: Before unload handler setup');
  }

  /**
   * Clears auto-save interval
   */
  clearAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Clears force-save interval
   */
  clearForceSave() {
    if (this.forceSaveInterval) {
      clearInterval(this.forceSaveInterval);
      this.forceSaveInterval = null;
    }
  }

  /**
   * Clears before unload handler
   */
  clearBeforeUnloadHandler() {
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }

  /**
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('DocumentService: Cleaning up resources');
    
    // Final save when unmounting
    if (get(canvasReady) && this.canvasRef) {
      console.log('DocumentService: Component unmounting, saving current page');
      this.saveCurrentPage();
    }
    
    // Final document save
    console.log('DocumentService: Component unmounting, saving document');
    this.forceSave();
    
    // Clear intervals and event listeners
    this.clearAutoSave();
    this.clearForceSave();
    this.clearBeforeUnloadHandler();
  }

  /**
   * Load a page's content into the canvas
   * @private
   * @param {string} pageId - ID of the page to load
   * @returns {Promise<boolean>} Success status
   */
  async _loadPageContent(pageId) {
    const doc = get(currentDocument);
    const canvas = this.canvasRef;
    
    if (!doc || !canvas) {
      return false;
    }
    
    // Find the page data
    const page = doc.pages.find(p => p.id === pageId);
    
    if (!page) {
      console.error(`DocumentService: Page ${pageId} not found in document`);
      return false;
    }
    
    console.log(`DocumentService: Loading page ${pageId}`);
    
    // Store page ID on canvas for reference
    canvas.pageId = pageId;
    
    // Clear canvas first
    canvas.clear();
    canvas.backgroundColor = 'white';
    
    // Exit early if page has no content
    if (!page.canvasJSON) {
      canvas.renderAll();
      console.log(`DocumentService: Page ${pageId} has no content, using empty canvas`);
      return true;
    }
    
    try {
      // Parse JSON data
      const jsonData = JSON.parse(page.canvasJSON);
      
      // Set canvas background
      canvas.backgroundColor = jsonData.background || 'white';
      
      // If page has objects, load them
      if (jsonData.objects && jsonData.objects.length > 0) {
        console.log(`DocumentService: Creating ${jsonData.objects.length} objects for page ${pageId}`);
        
        // Load objects into canvas
        fabric.util.enlivenObjects(jsonData.objects, (objects) => {
          // Add all objects to canvas
          objects.forEach(obj => {
            // Ensure visibility
            obj.visible = true;
            obj.evented = true;
            
            // Add to canvas
            canvas.add(obj);
          });
          
          // Force multiple renders with delays
          canvas.requestRenderAll();
          canvas.renderAll();
          
          setTimeout(() => {
            canvas.requestRenderAll();
            canvas.renderAll();
          }, 100);
        });
      }
      
      // Apply master page if specified
      if (page.masterPageId) {
        console.log(`DocumentService: Applying master page ${page.masterPageId}`);
        this._applyMasterPage(page.masterPageId, page.overrides || {});
      }
      
      return true;
    } catch (err) {
      console.error(`DocumentService: Error loading page ${pageId}:`, err);
      
      // Create empty canvas as fallback
      canvas.clear();
      canvas.backgroundColor = 'white';
      canvas.renderAll();
      
      return false;
    }
  }

  /**
   * Apply a master page to the canvas
   * @private
   * @param {string} masterPageId - ID of the master page
   * @param {Object} overrides - Overrides for master objects
   */
  _applyMasterPage(masterPageId, overrides = {}) {
    const doc = get(currentDocument);
    const canvas = this.canvasRef;
    
    if (!doc || !canvas) {
      return;
    }
    
    // Find the master page
    const masterPage = doc.masterPages?.find(mp => mp.id === masterPageId);
    
    if (!masterPage || !masterPage.canvasJSON) {
      return;
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
          // Load master objects
          fabric.util.enlivenObjects(objectsToEnliven, (objects) => {
            objects.forEach(obj => {
              // Mark as from master page
              obj.fromMaster = true;
              obj.masterId = masterPageId;
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
    } catch (err) {
      console.error(`DocumentService: Error applying master page ${masterPageId}:`, err);
    }
  }

  /**
   * Resets the canvas completely
   * @private
   */
  _resetCanvas() {
    const canvas = this.canvasRef;
    
    if (!canvas) {
      return;
    }
    
    try {
      console.log('DocumentService: Resetting canvas');
      
      // Remove all event handlers temporarily
      canvas.off();
      
      // Clear all canvas contents
      canvas.clear();
      canvas.backgroundColor = 'white';
      
      // Reset internal state completely
      canvas._objects = [];
      if (canvas._objectsToRender) canvas._objectsToRender = [];
      canvas.discardActiveObject();
      canvas.__eventListeners = {};
      
      // Reset additional internal state
      if (canvas._activeObject) canvas._activeObject = null;
      if (canvas._hoveredTarget) canvas._hoveredTarget = null;
      if (canvas._currentTransform) canvas._currentTransform = null;
      
      // Reset state properties
      if (typeof canvas.selection !== 'undefined') canvas.selection = false;
      if (typeof canvas.isDrawingMode !== 'undefined') canvas.isDrawingMode = false;
      
      // Force multiple renders
      canvas.requestRenderAll();
      canvas.renderAll();
      
      setTimeout(() => {
        canvas.requestRenderAll();
        canvas.renderAll();
      }, 50);
    } catch (err) {
      console.error('DocumentService: Error during canvas reset:', err);
    }
  }

  /**
   * Clears global variables that might contain document-specific data
   * @private
   */
  _clearGlobalVariables() {
    if (typeof window !== 'undefined') {
      window._previousPageBackup = null;
      window.$emergencyBackup = null;
      window._canvasObjects = null;
      
      // Save previous document ID for transition handling
      if (window.$document && window.$document.id) {
        window._previousDocumentId = window.$document.id;
      }
    }
  }

  /**
   * Ensures a document has valid structure
   * @private
   * @param {Object} doc - Document to validate
   */
  _ensureValidDocumentStructure(doc) {
    if (!doc) return;
    
    console.log('DocumentService: Validating document structure');
    
    // Ensure the document has a pages array
    if (!doc.pages) {
      console.warn('DocumentService: Document missing pages array, creating empty array');
      doc.pages = [];
    }
    
    // Ensure pages array is actually an array
    if (!Array.isArray(doc.pages)) {
      console.warn('DocumentService: Document pages is not an array, converting to array');
      doc.pages = Object.values(doc.pages) || [];
    }
    
    // Add a page if pages array is empty
    if (doc.pages.length === 0) {
      console.warn('DocumentService: Document has no pages, adding a default page');
      doc.pages.push({
        id: 'page-1',
        canvasJSON: JSON.stringify({
          version: "5.3.0",
          objects: [],
          background: "white"
        }),
        masterPageId: null,
        overrides: {},
        guides: {
          horizontal: [],
          vertical: []
        }
      });
    }
    
    // Ensure each page has required properties
    doc.pages.forEach((page, index) => {
      if (!page.id) {
        console.warn(`DocumentService: Page at index ${index} missing ID, generating new ID`);
        page.id = `page-${index + 1}`;
      }
      
      if (!page.canvasJSON) {
        console.warn(`DocumentService: Page ${page.id} missing canvasJSON, setting empty canvas`);
        page.canvasJSON = JSON.stringify({
          version: "5.3.0",
          objects: [],
          background: "white"
        });
      }
      
      if (!page.overrides) {
        console.warn(`DocumentService: Page ${page.id} missing overrides, initializing empty object`);
        page.overrides = {};
      }
      
      if (!page.guides) {
        console.warn(`DocumentService: Page ${page.id} missing guides, initializing empty arrays`);
        page.guides = { horizontal: [], vertical: [] };
      }
    });
    
    // Ensure masterPages exists
    if (!doc.masterPages) {
      console.warn('DocumentService: Document missing masterPages array, creating empty array');
      doc.masterPages = [];
    }
    
    // Ensure metadata exists
    if (!doc.metadata) {
      console.warn('DocumentService: Document missing metadata, creating default metadata');
      doc.metadata = {
        pageSize: { width: 210, height: 297 },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        grid: {
          enabled: false,
          size: 10,
          color: '#CCCCCC',
          opacity: 0.5,
          snap: false
        },
        rulers: {
          enabled: true,
          horizontalVisible: true,
          verticalVisible: true,
          units: 'mm'
        }
      };
    }
    
    // Add created and lastModified dates if missing
    if (!doc.created) {
      console.warn('DocumentService: Document missing created date, setting to current date');
      doc.created = new Date();
    }
    
    if (!doc.lastModified) {
      console.warn('DocumentService: Document missing lastModified date, setting to current date');
      doc.lastModified = new Date();
    }
  }

  /**
   * Generate a unique ID for objects
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  }
}

// Create singleton instance
const documentService = new DocumentService();

export default documentService;