/**
 * Canvas.document.js
 * Manages document-related functionality for the Canvas component
 */
import * as fabricModule from 'fabric';

// Handle different module export patterns
const fabric = fabricModule.fabric || fabricModule.default || fabricModule;
import { getTextObjectFactory } from '$lib/utils/fabric-helpers';

/**
 * Create document management functions for the Canvas component
 * @param {Object} context - Canvas context with shared references and methods
 * @returns {Object} Document management functions
 */
export function createDocumentManagement(context) {
  const { 
    canvas, 
    currentDocument, 
    currentPage, 
    loadDocument,
    renderGrid
  } = context;

  /**
   * Save the current page state to the document store
   * @returns {boolean} Success status
   */
  function saveCurrentPage() {
    // Get current values from context to ensure we're using the latest data
    const canvas = context.canvas;
    let doc = context.get ? context.get('currentDocument') : context.currentDocument;
    let pageId = context.get ? context.get('currentPage') : context.currentPage;
    
    // Use null coalescing to handle possible Svelte store objects
    if (doc && typeof doc.subscribe === 'function' && doc.$state) {
      doc = doc.$state;
    }
    
    if (pageId && typeof pageId.subscribe === 'function' && pageId.$state) {
      pageId = pageId.$state;
    }
    
    if (!canvas) {
      console.warn("Cannot save page: Canvas is not initialized");
      return false;
    }
    
    if (!pageId) {
      // Try to get the page ID from any source we can
      if (canvas.pageId) {
        pageId = canvas.pageId;
        console.log("Using canvas.pageId value:", pageId);
      } else if (window.$page) {
        pageId = window.$page;
        console.log("Using window.$page value:", pageId);
      } else {
        console.warn("Cannot save page: No current page");
        return false;
      }
    }
    
    if (!doc) {
      // Try to get the document from any source we can
      if (window.$document) {
        doc = window.$document;
        console.log("Using window.$document value:", doc);
      } else {
        console.warn("Cannot save page: No current document");
        return false;
      }
    }
    
    // Declare pageIndexToSave variable at the top level
    let pageIndexToSave = -1;
    
    // Defensive check for missing pages array
    if (!doc.pages || !Array.isArray(doc.pages)) {
      console.warn(`Cannot save page: Document has invalid pages structure`, doc);
      
      // Try to initialize pages array if missing
      if (doc && !doc.pages) {
        doc.pages = [{
          id: pageId,
          canvasJSON: JSON.stringify({
            "version": "4.6.0",
            "objects": [],
            "background": "white"
          }),
          masterPageId: null,
          overrides: {}
        }];
        
        // Store reference for recovery
        window.$document = doc;
        
        console.log("Created empty pages array in document");
        pageIndexToSave = 0; // Set to first page
      } else {
        return false;
      }
    } else {
      // Get the index of the page to save
      pageIndexToSave = doc.pages.findIndex(p => p.id === pageId);
      if (pageIndexToSave < 0) {
        console.warn(`Cannot save page: Page ${pageId} not found in document`);
        
        // Try to create the page if it's missing
        try {
          const newPage = {
            id: pageId,
            canvasJSON: JSON.stringify({
              "version": "4.6.0",
              "objects": [],
              "background": "white"
            }),
            masterPageId: null,
            overrides: {}
          };
          
          doc.pages.push(newPage);
          pageIndexToSave = doc.pages.length - 1;
          console.log(`Created missing page ${pageId} at index ${pageIndexToSave}`);
          
          // Store updated reference
          window.$document = doc;
        } catch (err) {
          console.error("Error creating missing page:", err);
          return false;
        }
      }
    }
    
    try {
      console.log(`Saving page ${pageId} (index ${pageIndexToSave})`);
      
      // Double-check the page ID
      if (doc.pages[pageIndexToSave].id !== pageId) {
        console.error(`CRITICAL ERROR: Page ID mismatch! Expected ${pageId} but found ${doc.pages[pageIndexToSave].id}`);
        
        // Try to find the correct page again
        const doubleCheckIndex = doc.pages.findIndex(p => p.id === pageId);
        if (doubleCheckIndex >= 0) {
          console.log(`Corrected page index from ${pageIndexToSave} to ${doubleCheckIndex}`);
          pageIndexToSave = doubleCheckIndex;
        } else {
          console.error(`Cannot find page ${pageId} in document, aborting save!`);
          return false;
        }
      }
      
      // CRITICAL: Capture canvas objects BEFORE any other operations
      const initialCanvasObjects = [...canvas.getObjects()];
      const objectCount = initialCanvasObjects.length;
      
      console.log(`Found ${objectCount} objects to save on the canvas`);
      
      // Exit early if the canvas is already empty
      if (objectCount === 0) {
        console.log("Canvas is empty, saving minimal state");
        
        // Create a minimal canvas representation
        const emptyCanvasJSON = JSON.stringify({
          "version": "4.6.0",
          "objects": [],
          "background": "white"
        });
        
        // Update document with empty canvas
        const updatedPages = [...currentDocument.pages];
        updatedPages[pageIndexToSave] = {
          ...updatedPages[pageIndexToSave],
          canvasJSON: emptyCanvasJSON,
          masterPageId: updatedPages[pageIndexToSave].masterPageId,
          overrides: updatedPages[pageIndexToSave].overrides || {}
        };
        
        // Update the store
        context.currentDocument.update(doc => ({
          ...doc,
          pages: updatedPages,
          lastModified: new Date()
        }));
        
        console.log(`Empty page ${currentPage} saved successfully`);
        return true;
      }
      
      // Debug what objects we're saving
      console.log("Object types being saved:", initialCanvasObjects.map(obj => obj.type));
      
      // Special check for new objects without IDs
      initialCanvasObjects.forEach(obj => {
        if (!obj.id) {
          console.log("Adding missing ID to object:", obj.type);
          obj.id = context.generateId();
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
      
      // Verify objects in the JSON match what we expect
      const jsonObjectCount = canvasData.objects ? canvasData.objects.length : 0;
      console.log(`JSON has ${jsonObjectCount} objects (expected ${objectCount})`);
      
      if (jsonObjectCount !== objectCount) {
        console.warn("WARNING: Object count mismatch between canvas and JSON!");
      }
      
      // Stringify with indentation for debugging
      const canvasJSON = JSON.stringify(canvasData);
      console.log(`Serialized canvas JSON length: ${canvasJSON.length} characters`);
      
      // Check for empty/corrupt JSON
      if (canvasJSON.length < 50) {
        console.warn("WARNING: Canvas JSON is suspiciously small, might be empty:", canvasJSON);
      }
      
      // Create updated page object
      const updatedPages = [...doc.pages];
      const updatedPage = {
        ...updatedPages[pageIndexToSave],
        canvasJSON: canvasJSON,
        masterPageId: updatedPages[pageIndexToSave].masterPageId,
        overrides: updatedPages[pageIndexToSave].overrides || {}
      };
      
      // Final verification before saving
      if (!updatedPage.canvasJSON || updatedPage.canvasJSON.length < 50) {
        console.error("CRITICAL ERROR: About to save empty/invalid JSON. Forcing valid JSON.");
        
        // Create a direct JSON representation of the objects
        const directJSON = {
          "version": "4.6.0",
          "objects": initialCanvasObjects.map(obj => obj.toJSON([
            'id', 'linkedObjectIds', 'fromMaster', 'masterId', 'masterObjectId', 'overridable'
          ])),
          "background": "white"
        };
        
        // Use this as a fallback
        updatedPage.canvasJSON = JSON.stringify(directJSON);
      }
      
      // Log the final state
      console.log(`Updated page canvasJSON length: ${updatedPage.canvasJSON.length}`);
      console.log(`JSON objects: ${JSON.parse(updatedPage.canvasJSON).objects.length}`);
      
      // Update page in the array
      updatedPages[pageIndexToSave] = updatedPage;
      
      console.log(`Updating document with saved page ${pageId}`);
      
      // Try multiple update mechanisms in order of preference
      const updatedDoc = {
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      };
        
      // Attempt to update the document store using available methods
      if (context.currentDocument && typeof context.currentDocument.update === 'function') {
        // Standard Svelte store update method
        context.currentDocument.update(docToUpdate => {
          const result = {
            ...docToUpdate,
            pages: updatedPages,
            lastModified: new Date()
          };
          
          // Verify the update worked
          const verifyPageIndex = result.pages.findIndex(p => p.id === pageId);
          if (verifyPageIndex >= 0) {
            const verifyPage = result.pages[verifyPageIndex];
            console.log(`Verification: Page ${verifyPage.id} has canvasJSON of length ${verifyPage.canvasJSON ? verifyPage.canvasJSON.length : 0}`);
            
            try {
              const jsonData = JSON.parse(verifyPage.canvasJSON);
              console.log(`Verification: JSON contains ${jsonData.objects.length} objects`);
            } catch (err) {
              console.error("Verification: Failed to parse JSON:", err);
            }
          }
          
          return result;
        });
      } else if (window.$updateDocument && typeof window.$updateDocument === 'function') {
        // Fall back to stored update function
        window.$updateDocument(docToUpdate => ({
          ...docToUpdate,
          pages: updatedPages,
          lastModified: new Date()
        }));
        console.log("Document updated using window.$updateDocument fallback");
      } else {
        // Direct update of window reference as last resort
        window.$document = updatedDoc;
        console.log("Document updated directly via window.$document fallback");
        
        // Attempt to sync with the documents store from global context
        if (window.$globalContext && window.$globalContext.documents && 
            typeof window.$globalContext.documents.update === 'function') {
          window.$globalContext.documents.update(docs => {
            const updatedDocs = {...docs};
            updatedDocs[updatedDoc.id] = updatedDoc;
            return updatedDocs;
          });
          console.log("Document also updated in global documents store");
        }
        
        // Save to IndexedDB directly if possible
        try {
          if (window.saveDocument) {
            window.saveDocument(updatedDoc).then(() => {
              console.log("Document saved directly to IndexedDB as fallback");
            });
          }
        } catch (saveErr) {
          console.log("Could not save directly to IndexedDB:", saveErr);
        }
      }
      
      console.log(`Page ${pageId} saved successfully with ${objectCount} objects`);
      return true;
    } catch (err) {
      console.error(`Error saving page ${pageId}:`, err);
      return false;
    }
  }

  /**
   * Save a specific page's content without changing the current page
   * @param {string} pageId - ID of the page to save
   * @param {Array} objects - Canvas objects to save
   * @returns {boolean} Success status
   */
  function saveSpecificPage(pageId, objects) {
    if (!pageId) {
      console.warn("Cannot save specific page: No page ID provided");
      return false;
    }
    
    // Get the latest document value 
    let doc = context.get ? context.get('currentDocument') : context.currentDocument;
    
    // Handle Svelte store objects
    if (doc && typeof doc.subscribe === 'function' && doc.$state) {
      doc = doc.$state;
    } else if (!doc) {
      doc = currentDocument;
    }
    
    if (!doc) {
      // Try to get the document from any available source
      if (window.$document) {
        doc = window.$document;
        console.log("Using window.$document value:", doc);
      } else {
        console.warn(`Cannot save specific page ${pageId}: No current document`);
        return false;
      }
    }
    
    // Store this reference for window-level access later
    window.$document = doc;
    
    // Get the index of the page to save
    let pageIndexToSave = doc.pages.findIndex(p => p.id === pageId);
    if (pageIndexToSave < 0) {
      console.warn(`Cannot save specific page ${pageId}: Page not found in document`);
      return false;
    }
    
    // Store this page ID for window-level access later
    window.$page = pageId;
    
    try {
      console.log(`Saving specific page ${pageId} directly with ${objects.length} objects`);
      
      // If no objects, save minimal state
      if (objects.length === 0) {
        const emptyCanvasJSON = JSON.stringify({
          "version": "4.6.0",
          "objects": [],
          "background": "white"
        });
        
        // Update document with empty canvas
        const updatedPages = [...doc.pages];
        updatedPages[pageIndexToSave] = {
          ...updatedPages[pageIndexToSave],
          canvasJSON: emptyCanvasJSON,
          masterPageId: updatedPages[pageIndexToSave].masterPageId,
          overrides: updatedPages[pageIndexToSave].overrides || {}
        };
        
        // Update the store - gracefully handle if there's no update function
        if (context.currentDocument && typeof context.currentDocument.update === 'function') {
          context.currentDocument.update(docToUpdate => ({
            ...docToUpdate,
            pages: updatedPages,
            lastModified: new Date()
          }));
        } else if (window.$updateDocument) {
          // Use alternative update mechanism if available
          window.$updateDocument(doc => ({
            ...doc,
            pages: updatedPages,
            lastModified: new Date()
          }));
        }
        
        console.log(`Saved empty page ${pageId}`);
        return true;
      }
      
      // Create canvas-like object with toJSON method
      const tempCanvas = {
        _objects: objects,
        backgroundColor: 'white',
        toJSON: function(propertiesToInclude) {
          return {
            version: "4.6.0",
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
      
      // Verify objects in the JSON match what we expect
      const jsonObjectCount = canvasData.objects ? canvasData.objects.length : 0;
      console.log(`JSON has ${jsonObjectCount} objects (expected ${objects.length})`);
      
      // Stringify
      const canvasJSON = JSON.stringify(canvasData);
      console.log(`Serialized JSON for page ${pageId}: ${canvasJSON.length} characters`);
      
      // Create updated page object
      const updatedPages = [...doc.pages];
      updatedPages[pageIndexToSave] = {
        ...updatedPages[pageIndexToSave],
        canvasJSON: canvasJSON,
        masterPageId: updatedPages[pageIndexToSave].masterPageId,
        overrides: updatedPages[pageIndexToSave].overrides || {}
      };
      
      // Create updated document
      const updatedDoc = {
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      };
      
      // Try multiple update mechanisms in order of preference
      if (context.currentDocument && typeof context.currentDocument.update === 'function') {
        // Standard Svelte store update method
        context.currentDocument.update(docToUpdate => ({
          ...docToUpdate,
          pages: updatedPages,
          lastModified: new Date()
        }));
        console.log(`Updated document store for page ${pageId} with ${objects.length} objects`);
      } else if (window.$updateDocument && typeof window.$updateDocument === 'function') {
        // Fall back to stored update function
        window.$updateDocument(docToUpdate => ({
          ...docToUpdate,
          pages: updatedPages,
          lastModified: new Date()
        }));
        console.log("Document updated using window.$updateDocument fallback");
      } else {
        // Direct update of window reference as last resort
        window.$document = updatedDoc;
        console.log("Document updated directly via window.$document fallback");
        
        // Attempt to use storage module directly
        try {
          // Import storage module only if needed
          if (window.require) {
            const storage = window.require('$lib/utils/storage');
            if (storage && storage.saveDocument) {
              storage.saveDocument(updatedDoc).then(() => {
                console.log("Document saved directly to IndexedDB via storage module");
              });
            }
          } else if (window.saveDocument) {
            window.saveDocument(updatedDoc).then(() => {
              console.log("Document saved directly to IndexedDB as fallback");
            });
          }
        } catch (saveErr) {
          console.log("Could not save directly to IndexedDB:", saveErr);
        }
      }
      
      // Always update the window reference for recovery
      window.$document = updatedDoc;
      
      console.log(`Page ${pageId} saved successfully with ${objects.length} objects`);
      return true;
    } catch (err) {
      console.error(`Error saving specific page ${pageId}:`, err);
      return false;
    }
  }

  /**
   * Load a page by ID
   * @param {string} pageId - ID of the page to load
   * @param {boolean} shouldSaveFirst - Whether to save current page first
   * @returns {Promise<boolean>} Promise that resolves when page is loaded
   */
  function loadPage(pageId, shouldSaveFirst = true) {
    return new Promise(async (resolve, reject) => {
      try {
        // Access canvas and document from context to ensure we have the latest values
        const canvas = context.canvas;
        const doc = context.get ? context.get('currentDocument') : context.currentDocument;
        
        // During initialization, we might not have a document or canvas yet - this is normal
        // Handle this gracefully instead of throwing an error
        if (!canvas) {
          console.warn("LOAD WARNING: Canvas is not available, creating blank canvas");
          // Just resolve with a success status since we can't do much without a canvas
          return resolve(true);
        }
        
        if (!doc) {
          console.warn("LOAD WARNING: Document is not available, creating blank canvas");
          // Clear canvas and set background to white
          canvas.clear();
          canvas.backgroundColor = 'white';
          canvas.renderAll();
          return resolve(true);
        }
        
        // Special handling for temporary loading page
        if (pageId === 'loading-page') {
          console.log("LOAD PHASE: Loading temporary page during initialization");
          // If we don't have a document yet, we'll create a blank canvas
          if (!doc) {
            console.log("LOAD PHASE: No document available yet, proceeding with initialization");
            // Just clear the canvas and resolve
            canvas.clear();
            canvas.backgroundColor = 'white';
            canvas.renderAll();
            return resolve(true);
          }
        }
        
        console.log(`LOAD PHASE: loadPage called for page: ${pageId} (shouldSaveFirst: ${shouldSaveFirst})`);
        
        // Save current page first (only if requested and we have a current page)
        const currentPageId = context.get ? context.get('currentPage') : context.currentPage;
        if (shouldSaveFirst && currentPageId) {
          console.log(`LOAD PHASE: Saving current page ${currentPageId} before loading ${pageId}`);
          
          // Use standard saveCurrentPage function to save the current page
          saveCurrentPage();
        }
        
        // Force canvas to clear and reset
        console.log("LOAD PHASE: Clearing canvas");
        canvas.clear();
        canvas.backgroundColor = 'white';
        canvas.renderAll();
        
        // We already have the latest document data from context
        if (!doc) {
          console.error("LOAD ERROR: Current document is null");
          return reject(new Error("Current document is null"));
        }
        
        // Find the page to load in the document using our helper function
        const pageToLoad = getPageById(pageId);
        
        console.log(`LOAD PHASE: Page to load:`, pageId, pageToLoad ? 'found' : 'not found');
        
        if (!pageToLoad) {
          // Special handling for initialization with the loading-page
          if (pageId === 'loading-page') {
            console.log(`LOAD PHASE: loading-page not found, but this is expected during initialization`);
            // Create an empty page just to resolve the promise
            canvas.clear();
            canvas.backgroundColor = 'white';
            canvas.renderAll();
            return resolve(true);
          }
          
          console.error(`LOAD ERROR: Page ${pageId} not found in document`);
          return reject(new Error(`Page ${pageId} not found in document`));
        }
        
        console.log(`+----------------------------------+`);
        console.log(`| LOAD PHASE: LOADING PAGE ${pageId} |`);
        console.log(`+----------------------------------+`);
        
        // Clear canvas and prepare
        console.log("LOAD PHASE: Clearing canvas and preparing");
        canvas.clear();
        canvas.backgroundColor = 'white';
        
        // Force a render to ensure canvas is totally clean
        canvas.requestRenderAll();
        canvas.renderAll();
        
        // Log detailed info about the page we're about to load
        console.log("LOAD PHASE: Page data details:", {
          pageId: pageToLoad.id,
          hasCanvasData: !!pageToLoad.canvasJSON,
          dataType: pageToLoad.canvasJSON ? typeof pageToLoad.canvasJSON : 'null',
          dataLength: pageToLoad.canvasJSON ? 
            (typeof pageToLoad.canvasJSON === 'string' ? 
              pageToLoad.canvasJSON.length : 
              JSON.stringify(pageToLoad.canvasJSON).length) : 0,
          hasMasterPage: !!pageToLoad.masterPageId,
          masterId: pageToLoad.masterPageId
        });

        // SUPER CRITICAL FIX: Force load latest data from IndexedDB
        // This ensures we're working with the absolute latest data
        const loadedDoc = await context.loadDocumentFromIndexedDB(doc.id);
        
        console.log("FORCED DB LOAD:", {
          hasDocument: !!loadedDoc,
          pageCount: loadedDoc ? loadedDoc.pages.length : 0
        });
        
        // Use data directly from IndexedDB for maximum reliability
        const dbPage = loadedDoc ? loadedDoc.pages.find(p => p.id === pageId) : null;
        console.log("DB PAGE CHECK:", {
          originalLength: pageToLoad.canvasJSON ? pageToLoad.canvasJSON.length : 0,
          dbLength: dbPage && dbPage.canvasJSON ? dbPage.canvasJSON.length : 0,
          originalHasData: !!pageToLoad.canvasJSON,
          dbHasData: !!(dbPage && dbPage.canvasJSON)
        });
        
        // Always use the DB data if available
        const pageData = dbPage || pageToLoad;
        
        // RADICAL NEW APPROACH: Use our custom manual object creation
        if (pageData.canvasJSON) {
          try {
            console.log("RADICAL APPROACH: Loading latest canvas content for page:", pageId);
            
            // First clear the canvas completely
            canvas.clear();
            canvas.backgroundColor = 'white';
            
            // Parse JSON if it's a string (from IndexedDB storage)
            const jsonData = typeof pageData.canvasJSON === 'string'
              ? JSON.parse(pageData.canvasJSON)
              : pageData.canvasJSON;
            
            const objectCount = jsonData.objects ? jsonData.objects.length : 0;
            console.log(`JSON data parsed, contains ${objectCount} objects`);
            
            // Set the canvas background
            canvas.backgroundColor = jsonData.background || 'white';
            
            // Handle empty canvas case
            if (objectCount === 0) {
              console.log("Canvas is empty, only setting background");
              canvas.requestRenderAll();
              canvas.renderAll();
            } else {
              console.log(`RADICAL APPROACH: Creating ${objectCount} objects manually...`);
              console.log("Object types:", jsonData.objects.map(obj => obj.type).join(', '));
              
              // Use our custom function to create objects manually
              const createdObjects = context.createObjectsManually(jsonData.objects);
              
              console.log(`Created ${createdObjects.length}/${objectCount} objects`);
              
              // Add all created objects to the canvas
              createdObjects.forEach(obj => {
                // Set essential properties
                obj.visible = true;
                obj.evented = true;
                obj.selectable = context.activeTool === 'select';
                
                // Different handling for master page objects
                if (obj.fromMaster) {
                  obj.selectable = false;
                  obj.hoverCursor = 'not-allowed';
                }
                
                // Add to canvas
                canvas.add(obj);
              });
              
              // Log what we've loaded
              const finalObjects = canvas.getObjects();
              console.log(`Canvas now has ${finalObjects.length} objects after load`);
              
              // Force visibility check and render
              finalObjects.forEach(obj => {
                if (!obj.visible) {
                  console.log(`Object of type ${obj.type} was not visible, forcing visibility`);
                  obj.visible = true;
                }
                
                if (obj.opacity === 0) {
                  console.log(`Object of type ${obj.type} had 0 opacity, setting to 1`);
                  obj.opacity = 1;
                }
              });
            }
            
            // Force multiple renders with delays to ensure all objects become visible
            canvas.requestRenderAll();
            canvas.renderAll();
            
            // Delayed render for better assurance
            console.log("Scheduling delayed render...");
            setTimeout(() => {
              console.log("Executing first delayed render");
              canvas.requestRenderAll();
              canvas.renderAll();
              
              // Second delayed render
              setTimeout(() => {
                console.log("Executing second delayed render");
                canvas.getObjects().forEach(obj => {
                  obj.visible = true;
                  obj.opacity = obj.opacity < 0.1 ? 1 : obj.opacity;
                });
                canvas.requestRenderAll();
                canvas.renderAll();
              }, 100);
            }, 100);
          } catch (err) {
            console.error('ERROR: Error with RADICAL approach:', err);
            
            // CRITICAL: Continue with a blank canvas if something fails
            // This is a fallback mechanism for data errors
            canvas.clear();
            canvas.backgroundColor = 'white';
            canvas.renderAll();
          }
        } else {
          console.log("No canvas data to load, starting with empty canvas");
        }
        
        // Apply master page if specified (after a short delay)
        setTimeout(() => {
          if (pageToLoad.masterPageId) {
            console.log("LOAD PHASE: Applying master page:", pageToLoad.masterPageId);
            context.applyMasterPage(pageToLoad.masterPageId, pageToLoad.overrides || {});
          }
          
          // Force final render
          setTimeout(() => {
            // Final verification of object visibility
            const objects = canvas.getObjects();
            console.log(`LOAD PHASE: Final check: ${objects.length} objects on canvas`);
            
            objects.forEach(obj => {
              obj.visible = true;
              obj.evented = true;
              // Get the current active tool from context
              const activeTool = context.get ? context.get('activeTool') : context.activeTool;
              obj.selectable = activeTool === 'select';
            });
            
            canvas.requestRenderAll();
            canvas.renderAll();
            
            // Refresh guides for new page
            context.refreshGuides();
            
            // Re-render grid if enabled
            if (currentDocument?.metadata?.grid?.enabled) {
              renderGrid({
                canvas,
                canvasElement: context.canvasElement,
                isMounted: context.isMounted,
                width: context.width,
                height: context.height,
                currentDocument,
                convertToPixels: context.convertToPixels
              });
            }
            
            // Resolve the promise to indicate that loading is complete
            console.log(`LOAD PHASE: Page ${pageId} loading complete with ${objects.length} objects`);
            resolve(true);
          }, 100);
        }, 100);
        
      } catch (err) {
        console.error(`LOAD ERROR: Failed to load page ${pageId}:`, err);
        reject(err);
      }
    }); // End of promise
  }

  /**
   * Direct function to load document from IndexedDB
   * Bypasses the store to ensure we have the latest data
   * @param {string} documentId - Document ID to load
   * @returns {Promise<Object>} The document from IndexedDB
   */
  async function loadDocumentFromIndexedDB(documentId) {
    console.log(`Direct DB load for document: ${documentId}`);
    try {
      // Use the storage utility to load the document directly from IndexedDB
      const document = await loadDocument(documentId);
      console.log(`Successfully loaded document directly from IndexedDB: ${documentId}`);
      return document;
    } catch (err) {
      console.error(`Failed to load document directly from IndexedDB: ${documentId}`, err);
      return null;
    }
  }

  /**
   * Create objects manually from JSON data
   * @param {Array} objectsData - Array of object data from JSON
   * @returns {Array} Array of created Fabric.js objects
   */
  function createObjectsManually(objectsData) {
    if (!objectsData || !Array.isArray(objectsData)) {
      console.error("Invalid objects data:", objectsData);
      return [];
    }
    
    // Log fabric library availability for debugging
    console.log("Fabric object types available:", {
      Textbox: !!fabric.Textbox,
      IText: !!fabric.IText,
      Text: !!fabric.Text,
      Rect: !!fabric.Rect,
      Path: !!fabric.Path
    });
    
    console.log(`Creating ${objectsData.length} objects manually`);
    const createdObjects = [];
    
    // Process each object in the JSON data
    objectsData.forEach((objData, index) => {
      try {
        // Create different types of objects based on their 'type' property
        const objType = (objData.type || "").toLowerCase();
        let fabricObj = null;
        
        console.log(`Creating object #${index} of type: ${objType}`);
        
        switch (objType) {
          case 'textbox':
            // Get the appropriate text object factory based on fabric version
            const createTextObject = getTextObjectFactory();
            
            if (!createTextObject) {
              console.error("ERROR: Could not obtain text object factory");
              break;
            }
            
            // Create text object with our factory function
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
              id: objData.id || context.generateId(),
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
              id: objData.id || context.generateId()
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
              id: objData.id || context.generateId()
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
              id: objData.id || context.generateId()
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
              id: objData.id || context.generateId()
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
                id: objData.id || context.generateId()
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
                id: objData.id || context.generateId()
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
                id: objData.id || context.generateId()
              });
            }
            break;
            
          case 'image':
            // For images, we need a special approach with fabric.Image.fromURL
            // Store this for special handling after creating other objects
            console.log("Image object detected, will handle separately");
            break;
            
          case 'group':
            // For groups, we need to create the objects inside first
            if (objData.objects && Array.isArray(objData.objects)) {
              const groupObjects = createObjectsManually(objData.objects);
              if (groupObjects.length > 0) {
                fabricObj = new fabric.Group(groupObjects, {
                  left: objData.left || 0,
                  top: objData.top || 0,
                  angle: objData.angle || 0,
                  scaleX: objData.scaleX || 1,
                  scaleY: objData.scaleY || 1,
                  id: objData.id || context.generateId()
                });
              }
            }
            break;
            
          default:
            console.log(`Unrecognized object type: ${objType}`);
            break;
        }
        
        // If we successfully created an object, set additional properties from the data
        if (fabricObj) {
          // Ensure critical properties are set
          fabricObj.visible = true;
          fabricObj.evented = true;
          fabricObj.selectable = context.activeTool === 'select';
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
          if (objType === 'textbox' && context.textFlow) {
            fabricObj.on('modified', () => context.updateTextFlow(fabricObj));
            fabricObj.on('changed', () => context.updateTextFlow(fabricObj));
          }
          
          createdObjects.push(fabricObj);
          console.log(`Successfully created ${objType} object`);
        }
      } catch (err) {
        console.error(`ERROR: Error creating object #${index}:`, err);
      }
    });
    
    console.log(`Created ${createdObjects.length}/${objectsData.length} objects manually`);
    return createdObjects;
  }

  /**
   * Apply a master page to the current canvas
   * @param {string} masterPageId - ID of the master page to apply
   * @param {Object} overrides - Map of overridden master objects
   */
  function applyMasterPage(masterPageId, overrides = {}) {
    if (!canvas || !currentDocument) return;
    
    // Find the master page
    const masterPage = currentDocument.masterPages.find(mp => mp.id === masterPageId);
    if (!masterPage || !masterPage.canvasJSON) return;
    
    try {
      // Parse JSON if it's a string
      const jsonData = typeof masterPage.canvasJSON === 'string'
        ? JSON.parse(masterPage.canvasJSON)
        : masterPage.canvasJSON;
        
      // Keep track of current objects
      const currentObjects = canvas.getObjects();
      const currentObjectsMap = {};
      
      // Map current objects by their IDs for later reference
      currentObjects.forEach(obj => {
        if (obj.id) {
          currentObjectsMap[obj.id] = obj;
        }
      });
      
      // Process master page objects
      if (jsonData && jsonData.objects && Array.isArray(jsonData.objects)) {
        // For better reliability, gather all objects to enliven at once
        const objectsToEnliven = [];
        
        jsonData.objects.forEach(objData => {
          // Skip objects that are overridden
          if (objData.masterObjectId && overrides[objData.masterObjectId]) {
            return;
          }
          objectsToEnliven.push(objData);
        });
        
        if (objectsToEnliven.length > 0) {
          console.log(`Enlivening ${objectsToEnliven.length} master page objects`);
          // Batch enliven all objects at once for better performance
          try {
            fabric.util.enlivenObjects(objectsToEnliven, (objects) => {
              console.log(`Successfully enlivened ${objects.length} master objects`);
              
              objects.forEach((fabricObj, index) => {
                if (!fabricObj) {
                  console.error("Failed to enliven object at index", index);
                  return;
                }
                
                // Get original data to check masterObjectId
                const origData = objectsToEnliven[index];
                
                // Mark as from master page
                fabricObj.fromMaster = true;
                fabricObj.masterId = masterPageId;
                fabricObj.masterObjectId = origData.masterObjectId || 
                  `master-obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                fabricObj.overridable = origData.overridable !== false; // Default to true
                
                // Special settings for master objects
                fabricObj.selectable = false;
                fabricObj.evented = true; // Allow events for context menu
                fabricObj.hoverCursor = 'not-allowed';
                fabricObj.visible = true; // Ensure visibility
                
                // Add a subtle visual difference to master objects
                fabricObj.opacity = fabricObj.opacity || 1;
                
                // Add to canvas
                canvas.add(fabricObj);
                
                // Make sure master objects are rendered behind regular objects
                fabricObj.moveTo(0);
              });
              
              // Force a render after all objects are added
              canvas.requestRenderAll();
              canvas.renderAll();
            });
          } catch (error) {
            console.error("Error enlivening master page objects:", error);
            
            // Fallback to manual object creation if enlivenObjects fails
            objectsToEnliven.forEach(objData => {
              try {
                // Create objects manually based on type
                let fabricObj = null;
                
                switch(objData.type) {
                  case 'textbox':
                    fabricObj = new fabric.Textbox(objData.text || 'Text', {
                      left: objData.left || 0,
                      top: objData.top || 0,
                      width: objData.width || 200,
                      fontFamily: objData.fontFamily || 'Arial',
                      fontSize: objData.fontSize || 16,
                      fill: objData.fill || '#000',
                      angle: objData.angle || 0,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1
                    });
                    break;
                    
                  case 'rect':
                    fabricObj = new fabric.Rect({
                      left: objData.left || 0,
                      top: objData.top || 0,
                      width: objData.width || 50,
                      height: objData.height || 50,
                      fill: objData.fill || '#ccc',
                      stroke: objData.stroke,
                      strokeWidth: objData.strokeWidth,
                      angle: objData.angle || 0,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1
                    });
                    break;
                    
                  case 'ellipse':
                    fabricObj = new fabric.Ellipse({
                      left: objData.left || 0,
                      top: objData.top || 0,
                      rx: objData.rx || 25,
                      ry: objData.ry || 25,
                      fill: objData.fill || '#ccc',
                      stroke: objData.stroke,
                      strokeWidth: objData.strokeWidth,
                      angle: objData.angle || 0,
                      scaleX: objData.scaleX || 1,
                      scaleY: objData.scaleY || 1
                    });
                    break;
                    
                  case 'line':
                    fabricObj = new fabric.Line(
                      [objData.x1 || 0, objData.y1 || 0, objData.x2 || 50, objData.y2 || 50],
                      {
                        left: objData.left || 0,
                        top: objData.top || 0,
                        stroke: objData.stroke || '#000',
                        strokeWidth: objData.strokeWidth || 1,
                        angle: objData.angle || 0,
                        scaleX: objData.scaleX || 1,
                        scaleY: objData.scaleY || 1
                      }
                    );
                    break;
                }
                
                if (fabricObj) {
                  // Add master page properties
                  fabricObj.fromMaster = true;
                  fabricObj.masterId = masterPageId;
                  fabricObj.masterObjectId = objData.masterObjectId || 
                    `master-obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  fabricObj.overridable = objData.overridable !== false;
                  fabricObj.selectable = false;
                  fabricObj.evented = true;
                  fabricObj.hoverCursor = 'not-allowed';
                  fabricObj.visible = true;
                  fabricObj.opacity = objData.opacity || 1;
                  
                  // Add to canvas
                  canvas.add(fabricObj);
                  fabricObj.moveTo(0);
                }
              } catch (objError) {
                console.error("Error creating fallback object:", objError);
              }
            });
            
            canvas.requestRenderAll();
            canvas.renderAll();
          }
        }
      }
      
      canvas.renderAll();
    } catch (err) {
      console.error('Error applying master page:', err);
    }
  }

  /**
   * Override a master page object
   * @param {Object} masterObject - The master object to override
   * @returns {Object|null} The overridden object or null if failed
   */
  function overrideMasterObject(masterObject) {
    if (!canvas || !masterObject || !masterObject.fromMaster || !masterObject.masterObjectId) return null;
    
    try {
      console.log(`Overriding master object: ${masterObject.type}, ID: ${masterObject.masterObjectId}`);
      
      // Clone the master object without master-specific properties
      // Use our own cloning method to ensure compatibility with latest Fabric.js
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
            console.error("Error cloning master object:", cloneErr);
            
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
      clone.selectable = context.activeTool === 'select';
      clone.evented = true;
      clone.hoverCursor = 'move';
      clone.visible = true;
      
      // Restore full opacity
      clone.opacity = 1;
      
      // For text objects, ensure they have proper event handlers
      if (clone.type === 'textbox') {
        if (!clone.linkedObjectIds) clone.linkedObjectIds = [];
        clone.on('modified', () => context.updateTextFlow(clone));
        clone.on('changed', () => context.updateTextFlow(clone));
      }
      
      console.log("Adding cloned object to canvas");
      
      // Add to canvas
      canvas.add(clone);
      
      // Remove the master object
      canvas.remove(masterObject);
      
      // Mark as overridden in the current page
      if (context.currentPage && currentDocument) {
        const pageIndex = currentDocument.pages.findIndex(p => p.id === context.currentPage);
        if (pageIndex >= 0) {
          const updatedPages = [...currentDocument.pages];
          if (!updatedPages[pageIndex].overrides) {
            updatedPages[pageIndex].overrides = {};
          }
          
          updatedPages[pageIndex].overrides[masterObject.masterObjectId] = true;
          
          context.currentDocument.update(doc => ({
            ...doc,
            pages: updatedPages,
            lastModified: new Date()
          }));
        }
      }
      
      // Ensure visibility
      canvas.setActiveObject(clone);
      canvas.requestRenderAll();
      canvas.renderAll();
      
      return clone;
    } catch (err) {
      console.error("ERROR: Error overriding master object:", err);
      return null;
    }
  }

  /**
   * Get a page by id from the current document
   * @param {string} pageId - The ID of the page to get
   * @returns {Object|null} The page object or null if not found
   */
  function getPageById(pageId) {
    // Always try to get the freshest document data
    const doc = context.get ? context.get('currentDocument') : context.currentDocument;
    
    if (!doc || !pageId) {
      console.warn(`getPageById: Can't find page ${pageId}, document is ${doc ? 'available' : 'not available'}`);
      return null;
    }
    
    // Check if pages exists - defensive coding
    if (!doc.pages || !Array.isArray(doc.pages)) {
      console.warn(`getPageById: Document has invalid pages structure:`, doc);
      return null;
    }
    
    const page = doc.pages.find(page => page.id === pageId);
    
    if (!page) {
      console.warn(`getPageById: Page ${pageId} not found in document. Available pages:`, 
        doc.pages.map(p => p.id));
    }
    
    return page;
  }

  // Return the document management functions
  return {
    saveCurrentPage,
    saveSpecificPage,
    loadPage,
    loadDocumentFromIndexedDB,
    createObjectsManually,
    applyMasterPage,
    overrideMasterObject,
    getPageById
  };
}