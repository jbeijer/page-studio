/**
 * DocumentModuleService.js
 * Specialized document service that handles canvas-document interactions
 * 
 * This service focuses on document operations that are specific to the Canvas component:
 * - Creating and managing objects from JSON
 * - Loading and saving page content to/from canvas
 * - Handling master pages and overrides
 * - Importing/exporting document content
 */
import { get } from 'svelte/store';
import { fabric } from 'fabric';
import { currentDocument, currentPage, updateDocument } from '$lib/stores/document';
import { loadDocument, saveDocument } from '$lib/utils/storage';
import { createTextObject } from '$lib/utils/fabric-helpers';
import documentService from './DocumentService';

class DocumentModuleService {
  constructor() {
    // Core properties
    this.canvas = null;
    this.initialized = false;
    this.activeTool = 'select';
    this.textFlow = null;
    this.generateId = null;
    this.context = null;
    
    // Bind methods to ensure consistent 'this' context
    this.initialize = this.initialize.bind(this);
    this.saveCurrentPage = this.saveCurrentPage.bind(this);
    this.saveSpecificPage = this.saveSpecificPage.bind(this);
    this.loadPage = this.loadPage.bind(this);
    this.loadDocumentFromIndexedDB = this.loadDocumentFromIndexedDB.bind(this);
    this.createObjectsManually = this.createObjectsManually.bind(this);
    this.applyMasterPage = this.applyMasterPage.bind(this);
    this.overrideMasterObject = this.overrideMasterObject.bind(this);
    this.getPageById = this.getPageById.bind(this);
    this.updateTextFlow = this.updateTextFlow.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize the document module service
   * @param {Object} options - Initialization options
   * @returns {DocumentModuleService} This service instance for chaining
   */
  initialize(options = {}) {
    console.log('DocumentModuleService: Initializing');
    
    this.canvas = options.canvas || null;
    this.activeTool = options.activeTool || 'select';
    this.textFlow = options.textFlow || null;
    this.generateId = options.generateId || (
      () => `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    );
    this.context = options.context || null;
    
    // Store global reference for emergency access
    if (typeof window !== 'undefined') {
      window.$documentModuleService = this;
    }
    
    this.initialized = true;
    return this;
  }
  
  /**
   * Update context with new values
   * @param {Object} updatedContext - Updated context values
   */
  updateContext(updatedContext) {
    this.context = { ...this.context, ...updatedContext };
    
    // Update canvas reference if provided
    if (updatedContext.canvas) {
      this.canvas = updatedContext.canvas;
    }
    
    // Update active tool if provided
    if (updatedContext.activeTool) {
      this.activeTool = updatedContext.activeTool;
    }
    
    // Update textFlow if provided
    if (updatedContext.textFlow) {
      this.textFlow = updatedContext.textFlow;
    }
  }

  /**
   * Save the current page state to the document store
   * @returns {boolean} Success status
   */
  saveCurrentPage() {
    if (!this.canvas) {
      console.error("DocumentModuleService: Cannot save page - Canvas not initialized");
      return false;
    }
    
    const pageId = get(currentPage);
    if (!pageId) {
      console.error("DocumentModuleService: Cannot save page - No current page");
      return false;
    }
    
    console.log(`DocumentModuleService: Saving current page ${pageId}`);
    
    try {
      // Get objects from canvas
      const objects = this.canvas.getObjects();
      console.log(`DocumentModuleService: Found ${objects.length} objects to save`);
      
      // Check for objects without IDs and add them
      objects.forEach(obj => {
        if (!obj.id) {
          console.log("DocumentModuleService: Adding missing ID to object:", obj.type);
          obj.id = this.generateId();
        }
      });
      
      // Serialize canvas with custom properties
      const canvasData = this.canvas.toJSON([
        'id', 
        'linkedObjectIds', 
        'fromMaster', 
        'masterId', 
        'masterObjectId', 
        'overridable'
      ]);
      
      // Verify objects in JSON
      const jsonObjectCount = canvasData.objects ? canvasData.objects.length : 0;
      console.log(`DocumentModuleService: JSON has ${jsonObjectCount} objects (expected ${objects.length})`);
      
      // Save the page using the documentService
      return documentService.saveSpecificPage(pageId, canvasData);
    } catch (err) {
      console.error(`DocumentModuleService: Error saving page ${pageId}:`, err);
      return false;
    }
  }

  /**
   * Save a specific page's content without changing the current page
   * @param {string} pageId - ID of the page to save
   * @param {Array} objects - Canvas objects to save
   * @returns {boolean} Success status
   */
  saveSpecificPage(pageId, objects) {
    if (!this.canvas) {
      console.error("DocumentModuleService: Cannot save page - Canvas not initialized");
      return false;
    }
    
    if (!pageId) {
      console.error("DocumentModuleService: Cannot save page - No page ID provided");
      return false;
    }
    
    console.log(`DocumentModuleService: Saving specific page ${pageId}`);
    
    try {
      // Create tempCanvas object for proper serialization
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
      
      // Verify objects in JSON
      const jsonObjectCount = canvasData.objects ? canvasData.objects.length : 0;
      console.log(`DocumentModuleService: JSON has ${jsonObjectCount} objects`);
      
      // Save using documentService
      return documentService.saveSpecificPage(pageId, canvasData);
    } catch (err) {
      console.error(`DocumentModuleService: Error saving page ${pageId}:`, err);
      return false;
    }
  }

  /**
   * Load a page by ID
   * @param {string} pageId - ID of the page to load
   * @param {boolean} shouldSaveFirst - Whether to save current page first
   * @returns {Promise<boolean>} Promise that resolves when page is loaded
   */
  loadPage(pageId, shouldSaveFirst = true) {
    return new Promise(async (resolve, reject) => {
      if (!this.canvas) {
        console.error("DocumentModuleService: Cannot load page - Canvas not initialized");
        return reject(new Error("Canvas not initialized"));
      }
      
      if (!pageId) {
        console.error("DocumentModuleService: Cannot load page - No page ID provided");
        return reject(new Error("No page ID provided"));
      }
      
      console.log(`DocumentModuleService: Loading page ${pageId}`);
      
      try {
        // Save current page first if requested
        if (shouldSaveFirst) {
          const currentPageId = get(currentPage);
          if (currentPageId) {
            console.log(`DocumentModuleService: Saving current page ${currentPageId} before loading ${pageId}`);
            this.saveCurrentPage();
          }
        }
        
        // Clear canvas
        this.canvas.clear();
        this.canvas.backgroundColor = 'white';
        this.canvas.renderAll();
        
        // Get page data
        const pageToLoad = this.getPageById(pageId);
        if (!pageToLoad) {
          console.error(`DocumentModuleService: Page ${pageId} not found in document`);
          return reject(new Error(`Page ${pageId} not found in document`));
        }
        
        console.log(`DocumentModuleService: Found page ${pageId} to load`);
        
        // Load page data
        if (pageToLoad.canvasJSON) {
          try {
            // Parse JSON
            const jsonData = typeof pageToLoad.canvasJSON === 'string'
              ? JSON.parse(pageToLoad.canvasJSON)
              : pageToLoad.canvasJSON;
            
            const objectCount = jsonData.objects ? jsonData.objects.length : 0;
            console.log(`DocumentModuleService: JSON data parsed, contains ${objectCount} objects`);
            
            // Set canvas background
            this.canvas.backgroundColor = jsonData.background || 'white';
            
            // If there are objects, create them
            if (objectCount > 0) {
              // Create objects manually
              const createdObjects = this.createObjectsManually(jsonData.objects);
              console.log(`DocumentModuleService: Created ${createdObjects.length}/${objectCount} objects`);
              
              // Add objects to canvas
              createdObjects.forEach(obj => {
                if (!obj) return;
                
                // Ensure object properties
                obj.visible = true;
                obj.evented = true;
                obj.selectable = this.activeTool === 'select';
                
                // Master object handling
                if (obj.fromMaster) {
                  obj.selectable = false;
                  obj.hoverCursor = 'not-allowed';
                }
                
                // Add to canvas
                this.canvas.add(obj);
              });
            }
            
            // Apply master page if specified
            if (pageToLoad.masterPageId) {
              setTimeout(() => {
                console.log(`DocumentModuleService: Applying master page ${pageToLoad.masterPageId}`);
                this.applyMasterPage(pageToLoad.masterPageId, pageToLoad.overrides || {});
              }, 100);
            }
            
            // Store page ID on canvas
            this.canvas.pageId = pageId;
            
            // Final render
            this.canvas.requestRenderAll();
            this.canvas.renderAll();
            
            // Delayed render for better visibility
            setTimeout(() => {
              // Make sure all objects are visible
              this.canvas.getObjects().forEach(obj => {
                obj.visible = true;
                obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
              });
              
              this.canvas.requestRenderAll();
              this.canvas.renderAll();
              
              console.log(`DocumentModuleService: Page ${pageId} loaded successfully with ${this.canvas.getObjects().length} objects`);
              resolve(true);
            }, 100);
          } catch (err) {
            console.error(`DocumentModuleService: Error loading page ${pageId}:`, err);
            
            // Clean canvas in case of error
            this.canvas.clear();
            this.canvas.backgroundColor = 'white';
            this.canvas.renderAll();
            
            reject(err);
          }
        } else {
          // Empty page
          console.log(`DocumentModuleService: Page ${pageId} has no canvas data, loading empty page`);
          this.canvas.clear();
          this.canvas.backgroundColor = 'white';
          this.canvas.renderAll();
          resolve(true);
        }
      } catch (err) {
        console.error(`DocumentModuleService: Error loading page ${pageId}:`, err);
        reject(err);
      }
    });
  }

  /**
   * Load document from IndexedDB directly
   * @param {string} documentId - Document ID to load
   * @returns {Promise<Object>} The document from IndexedDB
   */
  async loadDocumentFromIndexedDB(documentId) {
    if (!documentId) {
      console.error("DocumentModuleService: Cannot load document - No document ID provided");
      return null;
    }
    
    console.log(`DocumentModuleService: Loading document ${documentId} from IndexedDB`);
    
    try {
      const document = await loadDocument(documentId);
      console.log(`DocumentModuleService: Successfully loaded document ${documentId} from IndexedDB`);
      
      // Store reference for emergency recovery
      if (document && typeof window !== 'undefined') {
        window.$document = document;
      }
      
      return document;
    } catch (err) {
      console.error(`DocumentModuleService: Error loading document ${documentId} from IndexedDB:`, err);
      return null;
    }
  }

  /**
   * Create objects manually from JSON data
   * @param {Array} objectsData - Array of object data from JSON
   * @returns {Array} Array of created Fabric.js objects
   */
  createObjectsManually(objectsData) {
    if (!objectsData || !Array.isArray(objectsData)) {
      console.error("DocumentModuleService: Invalid objects data:", objectsData);
      return [];
    }
    
    console.log(`DocumentModuleService: Creating ${objectsData.length} objects manually`);
    const createdObjects = [];
    
    // Process each object in the JSON data
    objectsData.forEach((objData, index) => {
      try {
        // Create different types of objects based on their 'type' property
        const objType = (objData.type || "").toLowerCase();
        let fabricObj = null;
        
        switch (objType) {
          case 'textbox':
            // Use the imported createTextObject function
            fabricObj = createTextObject(objData.text || 'Text', {
              left: objData.left || 100,
              top: objData.top || 100,
              width: objData.width || 200,
              fontFamily: objData.fontFamily || 'Arial',
              fontSize: objData.fontSize || 16,
              fontStyle: objData.fontStyle || 'normal',
              fontWeight: objData.fontWeight || 'normal',
              textAlign: objData.textAlign || 'left',
              fill: objData.fill || '#000000',
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || this.generateId(),
              linkedObjectIds: objData.linkedObjectIds || []
            });
            break;
            
          case 'rect':
            fabricObj = new fabric.Rect({
              left: objData.left || 100,
              top: objData.top || 100,
              width: objData.width || 100,
              height: objData.height || 100,
              fill: objData.fill || '#cccccc',
              stroke: objData.stroke || '#000000',
              strokeWidth: objData.strokeWidth || 1,
              rx: objData.rx || 0,
              ry: objData.ry || 0,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || this.generateId()
            });
            break;
            
          case 'circle':
            fabricObj = new fabric.Circle({
              left: objData.left || 100,
              top: objData.top || 100,
              radius: objData.radius || 50,
              fill: objData.fill || '#cccccc',
              stroke: objData.stroke || '#000000',
              strokeWidth: objData.strokeWidth || 1,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || this.generateId()
            });
            break;
            
          case 'ellipse':
            fabricObj = new fabric.Ellipse({
              left: objData.left || 100,
              top: objData.top || 100,
              rx: objData.rx || 50,
              ry: objData.ry || 50,
              fill: objData.fill || '#cccccc',
              stroke: objData.stroke || '#000000',
              strokeWidth: objData.strokeWidth || 1,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || this.generateId()
            });
            break;
            
          case 'line':
            fabricObj = new fabric.Line([
              objData.x1 || 0, 
              objData.y1 || 0, 
              objData.x2 || 100, 
              objData.y2 || 100
            ], {
              left: objData.left || 0,
              top: objData.top || 0,
              stroke: objData.stroke || '#000000',
              strokeWidth: objData.strokeWidth || 1,
              angle: objData.angle || 0,
              scaleX: objData.scaleX || 1,
              scaleY: objData.scaleY || 1,
              id: objData.id || this.generateId()
            });
            break;
            
          case 'polygon':
            if (objData.points && Array.isArray(objData.points)) {
              fabricObj = new fabric.Polygon(objData.points, {
                left: objData.left || 0,
                top: objData.top || 0,
                fill: objData.fill || '#cccccc',
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                id: objData.id || this.generateId()
              });
            }
            break;
            
          case 'polyline':
            if (objData.points && Array.isArray(objData.points)) {
              fabricObj = new fabric.Polyline(objData.points, {
                left: objData.left || 0,
                top: objData.top || 0,
                fill: objData.fill || 'transparent',
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                id: objData.id || this.generateId()
              });
            }
            break;
            
          case 'path':
            if (objData.path) {
              fabricObj = new fabric.Path(objData.path, {
                left: objData.left || 0,
                top: objData.top || 0,
                fill: objData.fill || 'transparent',
                stroke: objData.stroke || '#000000',
                strokeWidth: objData.strokeWidth || 1,
                angle: objData.angle || 0,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                id: objData.id || this.generateId()
              });
            }
            break;
            
          case 'group':
            // For groups, we need to create the objects inside first
            if (objData.objects && Array.isArray(objData.objects)) {
              const groupObjects = this.createObjectsManually(objData.objects);
              if (groupObjects.length > 0) {
                fabricObj = new fabric.Group(groupObjects, {
                  left: objData.left || 0,
                  top: objData.top || 0,
                  angle: objData.angle || 0,
                  scaleX: objData.scaleX || 1,
                  scaleY: objData.scaleY || 1,
                  id: objData.id || this.generateId()
                });
              }
            }
            break;
            
          default:
            console.log(`DocumentModuleService: Unrecognized object type: ${objType}`);
            break;
        }
        
        // If we successfully created an object, set additional properties from the data
        if (fabricObj) {
          // Ensure critical properties are set
          fabricObj.visible = true;
          fabricObj.evented = true;
          fabricObj.selectable = this.activeTool === 'select';
          fabricObj.opacity = objData.opacity !== undefined ? objData.opacity : 1;
          
          // Copy master page properties if present
          if (objData.fromMaster) {
            fabricObj.fromMaster = true;
            fabricObj.masterId = objData.masterId;
            fabricObj.masterObjectId = objData.masterObjectId;
            fabricObj.overridable = objData.overridable !== false; // Default to true
            fabricObj.selectable = false;
            fabricObj.hoverCursor = 'not-allowed';
          }
          
          // Copy other custom properties
          const standardProps = [
            'type', 'left', 'top', 'width', 'height', 'radius', 'rx', 'ry',
            'fill', 'stroke', 'strokeWidth', 'angle', 'scaleX', 'scaleY',
            'opacity', 'text', 'fontFamily', 'fontSize', 'fontWeight',
            'fontStyle', 'textAlign', 'x1', 'y1', 'x2', 'y2', 'points', 'path'
          ];
          
          // Copy any remaining properties
          Object.keys(objData).forEach(key => {
            if (!standardProps.includes(key) && key !== 'objects') {
              fabricObj[key] = objData[key];
            }
          });
          
          // Add text flow event handlers for textbox objects
          if (objType === 'textbox' && this.textFlow) {
            fabricObj.on('modified', () => this.updateTextFlow(fabricObj));
            fabricObj.on('changed', () => this.updateTextFlow(fabricObj));
          }
          
          createdObjects.push(fabricObj);
        }
      } catch (err) {
        console.error(`DocumentModuleService: Error creating object #${index}:`, err);
      }
    });
    
    console.log(`DocumentModuleService: Created ${createdObjects.length}/${objectsData.length} objects manually`);
    return createdObjects;
  }

  /**
   * Apply a master page to the current canvas
   * @param {string} masterPageId - ID of the master page to apply
   * @param {Object} overrides - Map of overridden master objects
   * @returns {boolean} Success status
   */
  applyMasterPage(masterPageId, overrides = {}) {
    if (!this.canvas) {
      console.error("DocumentModuleService: Cannot apply master page - Canvas not initialized");
      return false;
    }
    
    if (!masterPageId) {
      console.error("DocumentModuleService: Cannot apply master page - No master page ID provided");
      return false;
    }
    
    const doc = get(currentDocument);
    if (!doc || !doc.masterPages) {
      console.error("DocumentModuleService: Cannot apply master page - No master pages in document");
      return false;
    }
    
    console.log(`DocumentModuleService: Applying master page ${masterPageId}`);
    
    // Find the master page
    const masterPage = doc.masterPages.find(mp => mp.id === masterPageId);
    if (!masterPage || !masterPage.canvasJSON) {
      console.error(`DocumentModuleService: Master page ${masterPageId} not found or has no data`);
      return false;
    }
    
    try {
      // Parse JSON if it's a string
      const jsonData = typeof masterPage.canvasJSON === 'string'
        ? JSON.parse(masterPage.canvasJSON)
        : masterPage.canvasJSON;
        
      // Process master page objects
      if (jsonData && jsonData.objects && Array.isArray(jsonData.objects)) {
        // Filter out overridden objects
        const objectsToCreate = jsonData.objects.filter(objData => 
          !(objData.masterObjectId && overrides[objData.masterObjectId]));
        
        console.log(`DocumentModuleService: Creating ${objectsToCreate.length} master page objects`);
        
        // Create objects manually
        const createdObjects = this.createObjectsManually(objectsToCreate);
        
        // Add special master page properties to created objects
        createdObjects.forEach(obj => {
          obj.fromMaster = true;
          obj.masterId = masterPageId;
          obj.selectable = false;
          obj.evented = true;
          obj.hoverCursor = 'not-allowed';
          
          // Add to canvas at the bottom layer
          this.canvas.add(obj);
          obj.moveTo(0);
        });
        
        this.canvas.requestRenderAll();
        this.canvas.renderAll();
        
        console.log(`DocumentModuleService: Applied master page ${masterPageId} with ${createdObjects.length} objects`);
        return true;
      } else {
        console.log(`DocumentModuleService: Master page ${masterPageId} has no objects`);
        return true;
      }
    } catch (err) {
      console.error(`DocumentModuleService: Error applying master page ${masterPageId}:`, err);
      return false;
    }
  }

  /**
   * Override a master page object
   * @param {Object} masterObject - The master object to override
   * @returns {Object|null} The overridden object or null if failed
   */
  overrideMasterObject(masterObject) {
    if (!this.canvas || !masterObject || !masterObject.fromMaster || !masterObject.masterObjectId) {
      console.error("DocumentModuleService: Cannot override master object - Invalid parameters");
      return null;
    }
    
    console.log(`DocumentModuleService: Overriding master object ${masterObject.masterObjectId}`);
    
    try {
      // Clone the master object without master-specific properties
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
          
        case 'ellipse':
          clone = new fabric.Ellipse({
            left: masterObject.left,
            top: masterObject.top,
            rx: masterObject.rx,
            ry: masterObject.ry,
            fill: masterObject.fill,
            stroke: masterObject.stroke,
            strokeWidth: masterObject.strokeWidth,
            angle: masterObject.angle,
            scaleX: masterObject.scaleX,
            scaleY: masterObject.scaleY
          });
          break;
          
        case 'line':
          clone = new fabric.Line(
            [masterObject.x1, masterObject.y1, masterObject.x2, masterObject.y2],
            {
              left: masterObject.left,
              top: masterObject.top,
              stroke: masterObject.stroke,
              strokeWidth: masterObject.strokeWidth,
              angle: masterObject.angle,
              scaleX: masterObject.scaleX,
              scaleY: masterObject.scaleY
            }
          );
          break;
          
        default:
          // For other object types, try standard cloning
          try {
            clone = fabric.util.object.clone(masterObject);
          } catch (cloneErr) {
            console.error("DocumentModuleService: Error cloning master object:", cloneErr);
            
            // Fallback to creating a rectangle placeholder
            clone = new fabric.Rect({
              left: masterObject.left || 100,
              top: masterObject.top || 100,
              width: masterObject.width || 100,
              height: masterObject.height || 50,
              fill: '#f0f0f0',
              stroke: '#ff0000',
              strokeDashArray: [5, 5],
              rx: 5,
              ry: 5
            });
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
      clone.selectable = this.activeTool === 'select';
      clone.evented = true;
      clone.hoverCursor = 'move';
      clone.visible = true;
      
      // Restore full opacity
      clone.opacity = 1;
      
      // For text objects, ensure they have proper event handlers
      if (clone.type === 'textbox') {
        if (!clone.linkedObjectIds) clone.linkedObjectIds = [];
        if (this.textFlow) {
          clone.on('modified', () => this.updateTextFlow(clone));
          clone.on('changed', () => this.updateTextFlow(clone));
        }
      }
      
      // Add to canvas
      this.canvas.add(clone);
      
      // Remove the master object
      this.canvas.remove(masterObject);
      
      // Mark as overridden in the current page
      const pageId = get(currentPage);
      if (pageId) {
        const doc = get(currentDocument);
        if (doc) {
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
          }
        }
      }
      
      // Render canvas
      this.canvas.setActiveObject(clone);
      this.canvas.requestRenderAll();
      this.canvas.renderAll();
      
      console.log(`DocumentModuleService: Successfully overrode master object ${masterObject.masterObjectId}`);
      return clone;
    } catch (err) {
      console.error(`DocumentModuleService: Error overriding master object:`, err);
      return null;
    }
  }

  /**
   * Get a page by id from the current document
   * @param {string} pageId - The ID of the page to get
   * @returns {Object|null} The page object or null if not found
   */
  getPageById(pageId) {
    if (!pageId) {
      console.error("DocumentModuleService: Cannot get page - No page ID provided");
      return null;
    }
    
    const doc = get(currentDocument);
    if (!doc || !doc.pages || !Array.isArray(doc.pages)) {
      console.error("DocumentModuleService: Cannot get page - Invalid document structure");
      return null;
    }
    
    const page = doc.pages.find(page => page.id === pageId);
    if (!page) {
      console.error(`DocumentModuleService: Page ${pageId} not found in document`);
      console.log("DocumentModuleService: Available pages:", doc.pages.map(p => p.id));
      return null;
    }
    
    return page;
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
      this.canvas?.renderAll();
    }
  }

  /**
   * Clean up resources when component unmounts
   */
  cleanup() {
    console.log('DocumentModuleService: Cleaning up resources');
    
    // Clear references
    this.canvas = null;
    this.textFlow = null;
    this.context = null;
    this.initialized = false;
  }
}

// Create singleton instance
const documentModuleService = new DocumentModuleService();

export default documentModuleService;