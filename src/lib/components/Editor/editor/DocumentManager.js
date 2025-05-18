import { createDocument, setCurrentDocument, currentDocument, currentPage, addPage, updateDocument } from '$lib/stores/document';
import { saveDocument, loadDocument } from '$lib/utils/storage';
import { get } from 'svelte/store';

/**
 * Creates a document management system
 * 
 * @param {Object} context - The context object containing reference to canvas component
 * @returns {Object} - Document management functions
 */
export function createDocumentManager(context) {
  // Get a canvas component reference from context
  function getCanvasComponent() {
    return context.canvasComponent;
  }
  
  /**
   * Creates a new empty document
   * 
   * @param {Object} options - Document options (title, format, pageCount)
   * @returns {Object} - The newly created document
   */
  function createNewDocument(options = { title: 'Untitled Document', format: 'A4', pageCount: 1 }) {
    const newDoc = createDocument(options);
    
    setCurrentDocument(newDoc);
    return newDoc;
  }
  
  /**
   * Loads a document by ID
   * 
   * @param {string} docId - The document ID to load
   * @returns {Promise<Object|null>} - The loaded document or null if failed
   */
  async function loadDocumentById(docId) {
    if (!docId) {
      console.error("Cannot load document: No document ID provided");
      return null;
    }
    
    try {
      console.log(`Attempting to load document with ID: ${docId}`);
      const loadedDocument = await loadDocument(docId);
      
      if (!loadedDocument) {
        console.error(`No document found with ID: ${docId}`);
        return null;
      }
      
      console.log(`Document loaded successfully. Title: "${loadedDocument.title}", ${loadedDocument.pages.length} pages`);
      
      // Check and ensure document has valid page structure
      ensureValidDocumentStructure(loadedDocument);
      
      // Log information about each page's canvas data
      if (loadedDocument.pages) {
        loadedDocument.pages.forEach((page, index) => {
          if (page.canvasJSON) {
            try {
              const canvasData = JSON.parse(page.canvasJSON);
              const objectCount = canvasData.objects ? canvasData.objects.length : 0;
              console.log(`Page ${index} (${page.id}) has ${objectCount} objects in loaded document`);
              
              if (objectCount > 0) {
                console.log(`Object types:`, canvasData.objects.map(obj => obj.type));
              }
            } catch (err) {
              console.error(`Error parsing canvasJSON for page ${page.id}:`, err);
              
              // Auto-repair invalid JSON
              page.canvasJSON = JSON.stringify({
                version: "4.6.0",
                objects: [],
                background: "white"
              });
              console.log(`Auto-repaired invalid JSON for page ${page.id}`);
            }
          } else {
            console.warn(`Page ${index} (${page.id}) has no canvasJSON in loaded document`);
            
            // Initialize with empty canvas data
            page.canvasJSON = JSON.stringify({
              version: "4.6.0",
              objects: [],
              background: "white"
            });
          }
        });
      }
      
      // Store the loaded document in window for recovery
      window.$loadedDocument = JSON.parse(JSON.stringify(loadedDocument));
      
      // IMPORTANT: Delay document loading to ensure the canvas is fully initialized
      console.log("Delaying document loading to ensure canvas is fully initialized");
      
      // First set a temporary document to initialize components
      // Explicitly create a deep copy of pages to ensure they're independent
      const tempPages = loadedDocument.pages.map(page => ({
        ...page,
        canvasJSON: page.canvasJSON,
        masterPageId: page.masterPageId,
        overrides: page.overrides || {},
        guides: page.guides || { horizontal: [], vertical: [] }
      }));
      
      // Set temporary document with complete page structure
      setCurrentDocument({
        id: 'temp-doc',
        title: 'Loading...',
        pages: tempPages,
        masterPages: loadedDocument.masterPages || [],
        created: new Date(),
        lastModified: new Date(),
        format: loadedDocument.format || 'A4',
        metadata: loadedDocument.metadata || {
          pageSize: { width: 210, height: 297 }
        }
      });
      
      // Also make sure we always set a current page
      if (loadedDocument.pages && loadedDocument.pages.length > 0) {
        const previousPage = get(currentPage);
        const isNewPage = !previousPage || previousPage === 'loading-page';
        
        // Only set if we don't have a valid page already
        if (isNewPage) {
          // Set first page as active
          console.log(`Setting initial page to ${loadedDocument.pages[0].id}`);
          currentPage.set(loadedDocument.pages[0].id);
        } else {
          // We already have a page selected - check if it exists in the loaded document
          const pageExists = loadedDocument.pages.some(page => page.id === previousPage);
          if (!pageExists) {
            console.log(`Selected page ${previousPage} not found in loaded document, setting to first page`);
            currentPage.set(loadedDocument.pages[0].id);
          } else {
            console.log(`Keeping current page selection: ${previousPage}`);
          }
        }
      }
      
      // Store global references for backup and recovery
      window.$document = loadedDocument;
      window.$page = get(currentPage);
      
      // Return a promise that resolves when the document is fully loaded
      return new Promise(resolve => {
        // Then set the actual document after a delay
        setTimeout(() => {
          console.log("Now setting the actual document after canvas initialization");
          
          // Ensure the document structure is still valid
          ensureValidDocumentStructure(loadedDocument);
          
          // Set the document in the store
          setCurrentDocument(loadedDocument);
          
          // Force canvas refresh after another small delay
          setTimeout(() => {
            checkAndFixCanvasObjects(loadedDocument);
            
            // Make sure we have a current page selected
            if (loadedDocument.pages && loadedDocument.pages.length > 0) {
              // If no page is selected, use the first page
              const currentPageValue = get(currentPage);
              if (!currentPageValue || currentPageValue === 'loading-page') {
                console.log(`Setting default page to ${loadedDocument.pages[0].id}`);
                currentPage.set(loadedDocument.pages[0].id);
              }
              
              // Update window.$page with current page
              window.$page = get(currentPage);
            }
            
            // Update the document one last time to ensure everything is saved
            updateDocument({
              ...loadedDocument,
              lastModified: new Date()
            });
            
            // Update window reference after ensuring everything is loaded
            window.$document = get(currentDocument);
            
            resolve(loadedDocument);
          }, 200);
        }, 500);
      });
    } catch (err) {
      console.error('Error loading document:', err);
      createNewDocument();
      return null;
    }
  }
  
  /**
   * Ensures a document has a valid structure
   * Repairs any missing or incorrect properties
   * 
   * @param {Object} doc - The document to validate/repair
   */
  function ensureValidDocumentStructure(doc) {
    if (!doc) return;
    
    console.log("Validating document structure");
    
    // Ensure the document has a pages array
    if (!doc.pages) {
      console.warn("Document missing pages array, creating empty array");
      doc.pages = [];
    }
    
    // Ensure pages array is actually an array
    if (!Array.isArray(doc.pages)) {
      console.warn("Document pages is not an array, converting to array");
      doc.pages = Object.values(doc.pages) || [];
    }
    
    // Add a page if pages array is empty
    if (doc.pages.length === 0) {
      console.warn("Document has no pages, adding a default page");
      doc.pages.push({
        id: 'page-1',
        canvasJSON: JSON.stringify({
          version: "4.6.0",
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
        console.warn(`Page at index ${index} missing ID, generating new ID`);
        page.id = `page-${index + 1}`;
      }
      
      if (!page.canvasJSON) {
        console.warn(`Page ${page.id} missing canvasJSON, setting empty canvas`);
        page.canvasJSON = JSON.stringify({
          version: "4.6.0",
          objects: [],
          background: "white"
        });
      }
      
      if (!page.overrides) {
        console.warn(`Page ${page.id} missing overrides, initializing empty object`);
        page.overrides = {};
      }
      
      if (!page.guides) {
        console.warn(`Page ${page.id} missing guides, initializing empty arrays`);
        page.guides = { horizontal: [], vertical: [] };
      }
    });
    
    // Ensure masterPages exists
    if (!doc.masterPages) {
      console.warn("Document missing masterPages array, creating empty array");
      doc.masterPages = [];
    }
    
    // Ensure metadata exists
    if (!doc.metadata) {
      console.warn("Document missing metadata, creating default metadata");
      doc.metadata = {
        pageSize: { width: 210, height: 297 },
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        columns: 1,
        columnGap: 10,
        grid: {
          enabled: false,
          size: 10,
          color: '#CCCCCC',
          opacity: 0.5,
          snap: false,
          snapThreshold: 5,
          subdivisions: 2
        },
        rulers: {
          enabled: true,
          horizontalVisible: true,
          verticalVisible: true,
          units: 'mm',
          color: '#666666',
          showNumbers: true
        }
      };
    }
    
    // Add created and lastModified dates if missing
    if (!doc.created || !isValidDate(doc.created)) {
      console.warn("Document has invalid created date, setting to current date");
      doc.created = new Date();
    }
    
    if (!doc.lastModified || !isValidDate(doc.lastModified)) {
      console.warn("Document has invalid lastModified date, setting to current date");
      doc.lastModified = new Date();
    }
    
    console.log("Document structure validation complete");
  }
  
  /**
   * Check if a date is valid
   * @param {Date|string} date - Date to check
   * @returns {boolean} Whether the date is valid
   */
  function isValidDate(date) {
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }
    
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }
    
    return false;
  }
  
  /**
   * Checks and fixes canvas objects if they're missing
   * 
   * @param {Object} loadedDocument - The loaded document
   */
  function checkAndFixCanvasObjects(loadedDocument) {
    const canvasComponent = getCanvasComponent();
    
    if (canvasComponent && canvasComponent.getCanvas) {
      const canvas = canvasComponent.getCanvas();
      if (canvas) {
        const objects = canvas.getObjects();
        console.log(`Currently ${objects.length} objects visible on canvas after loading`);
        
        // Even if no objects are visible, we'll try to create them from saved data
        if (loadedDocument && loadedDocument.pages && loadedDocument.pages.length > 0) {
          const curPageId = get(currentPage);
          
          // Find current page data
          const curPageData = loadedDocument.pages.find(p => p.id === curPageId);
          if (curPageData && curPageData.canvasJSON) {
            try {
              // Parse JSON data
              const jsonData = JSON.parse(curPageData.canvasJSON);
              const jsonObjectCount = jsonData.objects ? jsonData.objects.length : 0;
              
              console.log(`Current page JSON has ${jsonObjectCount} objects that should be visible`);
              
              // If canvas is empty but we should have objects, force recreate them
              if (objects.length === 0 && jsonObjectCount > 0) {
                console.log("CRITICAL: Objects missing from canvas. Forcing recreation from JSON.");
                
                // Use the recovery function from the Canvas component
                if (canvasComponent && canvasComponent.recoverObjectsFromJson) {
                  const recoveredCount = canvasComponent.recoverObjectsFromJson(curPageData.canvasJSON);
                  console.log(`Recovered ${recoveredCount} objects using Canvas recovery function`);
                  
                  // Update saved page to reflect fixes
                  if (recoveredCount > 0 && canvasComponent.saveCurrentPage) {
                    setTimeout(() => {
                      console.log("Saving recovered objects");
                      canvasComponent.saveCurrentPage();
                    }, 300);
                  }
                } else {
                  console.error("Canvas recovery function not available");
                }
              }
            } catch (err) {
              console.error("Error parsing page JSON:", err);
            }
          }
        }
        
        // Make sure all objects are correctly configured for visibility
        canvas.getObjects().forEach(obj => {
          // Ensure all objects have critical visibility properties set
          obj.visible = true;
          obj.evented = true;
          obj.opacity = obj.opacity === 0 ? 1 : obj.opacity;
        });
        
        // Render multiple times with delays to ensure visibility
        canvas.requestRenderAll();
        canvas.renderAll();
        
        // Additional render cycles
        setTimeout(() => {
          console.log("First delayed render cycle");
          canvas.requestRenderAll();
          canvas.renderAll();
          
          setTimeout(() => {
            console.log("Second delayed render cycle");
            canvas.requestRenderAll();
            canvas.renderAll();
            
            // Final verification
            const finalObjects = canvas.getObjects();
            console.log(`After delayed render cycles: ${finalObjects.length} objects on canvas`);
          }, 500);
        }, 500);
      }
    }
  }
  
  /**
   * Adds a new page to the document
   * 
   * @param {string|null} masterPageId - Optional master page ID to apply 
   */
  function handleAddPage(masterPageId = null) {
    const canvasComponent = getCanvasComponent();
    
    // Save current page before adding a new one to ensure we don't lose changes
    if (canvasComponent && canvasComponent.saveCurrentPage) {
      console.log("Saving current page before adding a new one");
      canvasComponent.saveCurrentPage();
    }
    
    // Add a new page
    console.log("Adding new page" + (masterPageId ? ` with master page ${masterPageId}` : ""));
    addPage(masterPageId);
    
    // Explicitly clear canvas when switching to a new page
    if (canvasComponent && canvasComponent.getCanvas) {
      const canvas = canvasComponent.getCanvas();
      if (canvas) {
        // setTimeout to make sure the page switch has happened
        setTimeout(() => {
          // Clear all objects
          console.log("Clearing canvas for new page");
          canvas.clear();
          canvas.backgroundColor = 'white';
          canvas.renderAll();
          
          // Immediately save this empty state to ensure it's persisted
          setTimeout(() => {
            console.log("Saving initial empty state for new page");
            if (canvasComponent.saveCurrentPage) {
              canvasComponent.saveCurrentPage();
            }
            
            // Final verification - force a document save
            setTimeout(async () => {
              try {
                console.log("Performing full document save to ensure changes are persisted");
                await saveDocument(get(currentDocument));
                console.log("New page saved successfully");
              } catch (err) {
                console.error("Error saving document after new page creation:", err);
              }
            }, 100);
          }, 100);
        }, 100);
      }
    }
  }
  
  /**
   * Saves the current document
   * 
   * @returns {Promise<{success: boolean, error: string|null}>} - Result object
   */
  async function handleSave() {
    const doc = get(currentDocument);
    const canvasComponent = getCanvasComponent();
    
    if (!doc) {
      console.error("Cannot save: No current document");
      return { success: false, error: "No current document" };
    }
    
    try {
      // Check document structure before save
      console.log("Current document before save:", {
        id: doc.id,
        pageCount: doc.pages.length,
        currentPageId: get(currentPage)
      });
      
      // Log information about each page's canvas data
      doc.pages.forEach((page, index) => {
        console.log(`Page ${index} (${page.id}) canvas data:`, {
          hasData: !!page.canvasJSON,
          dataType: page.canvasJSON ? typeof page.canvasJSON : 'null',
          dataLength: page.canvasJSON ? page.canvasJSON.length : 0
        });
      });
      
      // First ensure the current page is saved
      if (canvasComponent) {
        // Get active objects to verify what's on canvas
        const canvas = canvasComponent.getCanvas();
        if (canvas) {
          const objectsOnCanvas = canvas.getObjects();
          console.log(`Canvas currently has ${objectsOnCanvas.length} objects before save`);
          if (objectsOnCanvas.length > 0) {
            console.log("Object types on canvas:", objectsOnCanvas.map(obj => obj.type));
          }
        }
        
        // Save current canvas state
        if (canvasComponent.saveCurrentPage) {
          console.log("Saving current page before document save");
          canvasComponent.saveCurrentPage();
        } else {
          console.warn("saveCurrentPage not available on canvasComponent");
          
          // Fallback: manually save current page canvas
          if (canvas) {
            const currentPageId = get(currentPage);
            const pageIndex = doc.pages.findIndex(p => p.id === currentPageId);
            
            if (pageIndex !== -1) {
              console.log(`Manually saving canvas state for page ${currentPageId}`);
              
              // Serialize the canvas data with special properties
              const canvasData = canvas.toJSON([
                'id', 
                'linkedObjectIds', 
                'fromMaster', 
                'masterId', 
                'masterObjectId', 
                'overridable'
              ]);
              
              console.log(`Canvas data has ${canvasData.objects ? canvasData.objects.length : 0} objects`);
              
              // Convert to string
              const canvasJSON = JSON.stringify(canvasData);
              
              // Check if it's not an empty canvas
              if (canvasJSON.length < 50) {
                console.warn("Warning: Canvas JSON is suspiciously small:", canvasJSON);
              } else {
                console.log(`Generated canvas JSON with length ${canvasJSON.length}`);
              }
              
              // Update the document page data
              doc.pages[pageIndex].canvasJSON = canvasJSON;
              
              // Verify the update
              console.log(`Verified: Page now has canvas data of length: ${doc.pages[pageIndex].canvasJSON.length}`);
            }
          }
        }
      }
      
      // Update the document in store to ensure latest changes
      updateDocument(doc);
      
      // Save to IndexedDB with extra verification
      console.log("Saving document to IndexedDB:", doc.id);
      
      try {
        // Deep clone the document to check its structure
        const documentToSave = JSON.parse(JSON.stringify(doc));
        
        // Verify each page has canvasJSON data before saving
        let totalObjects = 0;
        let pagesWithObjects = 0;
        
        documentToSave.pages.forEach((page, i) => {
          if (typeof page.canvasJSON === 'string' && page.canvasJSON.length > 50) {
            try {
              const canvasData = JSON.parse(page.canvasJSON);
              const objectCount = canvasData.objects ? canvasData.objects.length : 0;
              console.log(`Page ${i} (${page.id}) has ${objectCount} objects before saving`);
              
              if (objectCount > 0) {
                totalObjects += objectCount;
                pagesWithObjects++;
              }
            } catch (err) {
              console.error(`Error parsing page ${i} canvasJSON:`, err);
            }
          } else {
            console.warn(`Page ${i} has invalid canvasJSON (${typeof page.canvasJSON}, length: ${page.canvasJSON ? page.canvasJSON.length : 0})`);
          }
        });
        
        console.log(`Document has ${documentToSave.pages.length} pages, ${pagesWithObjects} pages with objects, ${totalObjects} total objects`);
        
        // Call the actual save function
        const savedId = await saveDocument(documentToSave);
        console.log(`Document saved successfully with ID: ${savedId}`);
        
        // Verify the save by immediately loading it back
        try {
          const verifyDoc = await loadDocument(savedId);
          console.log(`Verification: Loaded document ${verifyDoc.id} with ${verifyDoc.pages.length} pages`);
          
          // Check if the loaded document has the canvas data
          let loadedObjects = 0;
          verifyDoc.pages.forEach((page, i) => {
            if (page.canvasJSON) {
              try {
                const canvasData = JSON.parse(page.canvasJSON);
                const objectCount = canvasData.objects ? canvasData.objects.length : 0;
                console.log(`Verification: Page ${i} (${page.id}) has ${objectCount} objects after loading`);
                loadedObjects += objectCount;
              } catch (err) {
                console.error(`Verification: Error parsing page ${i} canvasJSON:`, err);
              }
            } else {
              console.warn(`Verification: Page ${i} has no canvasJSON after loading`);
            }
          });
          
          console.log(`Verification: Document has ${loadedObjects} total objects after loading`);
          
          if (loadedObjects !== totalObjects) {
            console.error(`CRITICAL ERROR: Object count mismatch - saved ${totalObjects} objects but loaded ${loadedObjects} objects`);
          }
        } catch (err) {
          console.error("Verification failed - could not load saved document:", err);
        }
      } catch (err) {
        console.error("Error during saving process:", err);
        throw err;
      }
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error saving document:', err);
      return { success: false, error: err.message || "An unknown error occurred" };
    }
  }
  
  /**
   * Force saves the current document (typically used for auto-save)
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async function forceSave() {
    const doc = get(currentDocument);
    const canvasComponent = getCanvasComponent();
    
    if (!doc) return false;
    
    console.log("Force saving document and canvas state");
    
    // Check if Canvas is ready for operations
    const isCanvasReady = canvasComponent && canvasComponent.isCanvasReadyForAutoOps ?
      canvasComponent.isCanvasReadyForAutoOps() : true;
      
    if (!isCanvasReady) {
      console.warn("Force Save: Canvas is not ready for operations, proceeding with caution");
    }
    
    // Get current objects on canvas for logging
    let objectsCount = 0;
    let canvas = null;
    if (canvasComponent && canvasComponent.getCanvas) {
      canvas = canvasComponent.getCanvas();
      if (canvas) {
        const objects = canvas.getObjects();
        objectsCount = objects.length;
        console.log(`Force Save: Canvas has ${objectsCount} objects before save`);
        if (objectsCount > 0) {
          console.log(`Force Save: Object types: ${objects.map(obj => obj.type).join(', ')}`);
        }
      }
    }
    
    // Always save current page first if canvas is ready
    if (canvasComponent && canvasComponent.saveCurrentPage && isCanvasReady) {
      console.log("Force Save: Saving current page to document");
      canvasComponent.saveCurrentPage();
    }
    
    // ENHANCED PAGE SYNCHRONIZATION
    // Synchronize with all possible page references to ensure we don't lose any pages
    let syncChanges = false;
    const docPageIds = new Set(doc.pages.map(p => p.id));
    
    // First check window.$document for pages
    if (window.$document && window.$document.pages && Array.isArray(window.$document.pages)) {
      window.$document.pages.forEach(page => {
        if (!docPageIds.has(page.id)) {
          console.log(`Force Save: Adding missing page ${page.id} from window.$document`);
          doc.pages.push(JSON.parse(JSON.stringify(page))); // Deep clone
          syncChanges = true;
        }
      });
    }
    
    // Also check global context if available
    if (window.$globalContext && window.$globalContext.currentDocument && 
        window.$globalContext.currentDocument.pages && 
        Array.isArray(window.$globalContext.currentDocument.pages)) {
      
      window.$globalContext.currentDocument.pages.forEach(page => {
        if (!docPageIds.has(page.id)) {
          console.log(`Force Save: Adding missing page ${page.id} from global context`);
          doc.pages.push(JSON.parse(JSON.stringify(page))); // Deep clone
          syncChanges = true;
        }
      });
    }
    
    // If we have a canvasComponent reference, check its context too
    if (canvasComponent && canvasComponent.getContext) {
      const canvasContext = canvasComponent.getContext();
      if (canvasContext && canvasContext.currentDocument && 
          canvasContext.currentDocument.pages && 
          Array.isArray(canvasContext.currentDocument.pages)) {
        
        canvasContext.currentDocument.pages.forEach(page => {
          if (!docPageIds.has(page.id)) {
            console.log(`Force Save: Adding missing page ${page.id} from canvas context`);
            doc.pages.push(JSON.parse(JSON.stringify(page))); // Deep clone
            syncChanges = true;
          }
        });
      }
    }
    
    // Cross-check page content to ensure we have the most complete information
    doc.pages.forEach((page, pageIndex) => {
      // Check if there's data for this page in window.$document
      if (window.$document && window.$document.pages) {
        const windowPage = window.$document.pages.find(p => p.id === page.id);
        
        // If window version has page content but our version doesn't, use the window version
        if (windowPage && windowPage.canvasJSON && 
            (!page.canvasJSON || page.canvasJSON.length < windowPage.canvasJSON.length)) {
          console.log(`Force Save: Using richer canvasJSON from window.$document for page ${page.id}`);
          doc.pages[pageIndex].canvasJSON = windowPage.canvasJSON;
          syncChanges = true;
        }
      }
      
      // Initialize overrides if missing
      if (!page.overrides) {
        doc.pages[pageIndex].overrides = {};
        syncChanges = true;
      }
      
      // Initialize guides if missing
      if (!page.guides) {
        doc.pages[pageIndex].guides = {
          horizontal: [],
          vertical: []
        };
        syncChanges = true;
      }
    });
    
    // Sort pages by their ID's numeric part to ensure consistent order
    doc.pages.sort((a, b) => {
      const aNum = parseInt(a.id.replace('page-', ''));
      const bNum = parseInt(b.id.replace('page-', ''));
      return aNum - bNum;
    });
    
    // If we made changes to the document structure, update it in the store
    if (syncChanges) {
      console.log("Force Save: Synchronizing document in store with merged pages");
      updateDocument({
        ...doc,
        lastModified: new Date()
      });
    }
    
    // Important - save the current document state into a local variable to prevent
    // changes during the save operation
    const docToSave = JSON.parse(JSON.stringify(doc));
    
    // Save document to IndexedDB with verification
    try {
      const savedId = await saveDocument(docToSave);
      console.log(`Force Save: Document ${savedId} saved to IndexedDB`);
      
      // Verify by loading it back
      const verifyDoc = await loadDocument(savedId);
      console.log(`Force Save: Verification loaded document with ${verifyDoc.pages.length} pages`);
      
      // Scan all pages, not just current one
      let totalObjectsInDB = 0;
      let pagesWithObjects = 0;
      
      // Check pages data for all pages
      if (verifyDoc.pages && verifyDoc.pages.length > 0) {
        // First update the window.$document reference with the verified document
        window.$document = verifyDoc;
        
        verifyDoc.pages.forEach((page, pageIndex) => {
          if (page.canvasJSON) {
            try {
              const jsonData = JSON.parse(page.canvasJSON);
              const jsonObjectCount = jsonData.objects ? jsonData.objects.length : 0;
              console.log(`Force Save: Page ${page.id} has ${jsonObjectCount} objects in saved data`);
              
              if (jsonObjectCount > 0) {
                totalObjectsInDB += jsonObjectCount;
                pagesWithObjects++;
              }
              
              // Check current page specifically
              if (page.id === get(currentPage)) {
                console.log(`Force Save: Current page ${page.id} has ${jsonObjectCount} objects in saved data (Canvas has ${objectsCount})`);
                
                if (jsonObjectCount !== objectsCount) {
                  console.warn(`Force Save: Object count mismatch - canvas has ${objectsCount} but saved JSON has ${jsonObjectCount}`);
                  
                  // Handle the mismatch by forcing reload if canvas is empty but JSON has objects
                  if (objectsCount === 0 && jsonObjectCount > 0 && isCanvasReady) {
                    console.log("Force Save: Canvas is empty but JSON has objects, forcing reload");
                    
                    // Use the recovery function from the Canvas component
                    if (canvasComponent && canvasComponent.recoverObjectsFromJson) {
                      const recoveredCount = canvasComponent.recoverObjectsFromJson(page.canvasJSON);
                      console.log(`Force Save: Recovered ${recoveredCount} objects using Canvas recovery function`);
                      
                      // Update saved page to reflect fixes
                      if (recoveredCount > 0 && canvasComponent.saveCurrentPage) {
                        setTimeout(() => {
                          console.log("Force Save: Saving recovered objects");
                          canvasComponent.saveCurrentPage();
                        }, 300);
                      }
                    } else {
                      console.error("Force Save: Canvas recovery function not available");
                    }
                  }
                }
              }
            } catch (err) {
              console.error(`Force Save: Error parsing saved JSON for page ${page.id}:`, err);
            }
          } else {
            console.warn(`Force Save: Page ${page.id} has no canvasJSON in saved document`);
          }
        });
        
        console.log(`Force Save: Document has ${verifyDoc.pages.length} pages, ${pagesWithObjects} pages with objects, ${totalObjectsInDB} total objects`);
      }
      
      // Always ensure the global references are up to date
      window.$document = verifyDoc;
      window.$page = get(currentPage);
      if (canvasComponent) {
        window.$canvas = canvasComponent.getCanvas();
      }
      
      return true;
    } catch (err) {
      console.error("Force Save: Error saving document:", err);
      return false;
    }
  }
  
  /**
   * Updates the document title
   * 
   * @param {string} title - The new document title
   */
  function updateDocumentTitle(title) {
    if (!get(currentDocument)) return;
    
    const doc = get(currentDocument);
    if (title !== doc.title) {
      console.log(`Updating document title from "${doc.title}" to "${title}"`);
      doc.title = title;
      updateDocument(doc);
    }
  }
  
  return {
    createNewDocument,
    loadDocumentById,
    handleAddPage,
    handleSave,
    forceSave,
    updateDocumentTitle
  };
}

export default createDocumentManager;