<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Canvas from '$lib/components/Editor/Canvas.svelte';
  import Toolbar from '$lib/components/Editor/Toolbar.svelte';
  import TextEditingPanel from '$lib/components/Editor/TextEditingPanel.svelte';
  import MasterPageController from '$lib/components/Editor/MasterPageController.svelte';
  import { createDocument, setCurrentDocument, currentDocument, currentPage, addPage, updateDocument } from '$lib/stores/document';
  import { activeTool, ToolType, updateToolOptions } from '$lib/stores/toolbar';
  import { saveDocument, loadDocument } from '$lib/utils/storage';
  import { goto } from '$app/navigation';
  
  let canvasComponent;
  let selectedObject = null;
  let selectedObjectType = null;
  let isSaving = false;
  let saveError = null;
  let documentTitle = '';
  let masterPagePanelVisible = false;
  let masterPageController;
  let canUndo = false;
  let canRedo = false;
  
  let title = "PageStudio Editor";
  
  // Auto-save timer
  let autoSaveInterval;
  const AUTO_SAVE_DELAY_MS = 30000; // Auto-save every 30 seconds
  
  function setupAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(async () => {
      if ($currentDocument) {
        try {
          if (canvasComponent && canvasComponent.saveCurrentPage) {
            canvasComponent.saveCurrentPage();
          }
          await saveDocument($currentDocument);
          console.log("Auto-saved document:", $currentDocument.id);
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      }
    }, AUTO_SAVE_DELAY_MS);
  }
  
  // Force a save before user leaves the page
  let beforeUnloadHandler;
  
  // Improved auto-save function that we'll call frequently
  async function forceSave() {
    if (!$currentDocument) return;
    
    console.log("Force saving document and canvas state");
    
    // Get current objects on canvas for logging
    let objectsCount = 0;
    if (canvasComponent && canvasComponent.getCanvas) {
      const canvas = canvasComponent.getCanvas();
      if (canvas) {
        const objects = canvas.getObjects();
        objectsCount = objects.length;
        console.log(`Force Save: Canvas has ${objectsCount} objects before save`);
        if (objectsCount > 0) {
          console.log(`Force Save: Object types: ${objects.map(obj => obj.type).join(', ')}`);
        }
      }
    }
    
    // Always save current page first
    if (canvasComponent && canvasComponent.saveCurrentPage) {
      console.log("Force Save: Saving current page to document");
      canvasComponent.saveCurrentPage();
    }
    
    // Save document to IndexedDB with verification
    try {
      const savedId = await saveDocument($currentDocument);
      console.log(`Force Save: Document ${savedId} saved to IndexedDB`);
      
      // Verify by loading it back
      const verifyDoc = await loadDocument(savedId);
      console.log(`Force Save: Verification loaded document with ${verifyDoc.pages.length} pages`);
      
      // Check pages data
      if (verifyDoc.pages && verifyDoc.pages.length > 0) {
        const currentPageIndex = verifyDoc.pages.findIndex(p => p.id === $currentPage);
        if (currentPageIndex >= 0) {
          const pageData = verifyDoc.pages[currentPageIndex];
          if (pageData.canvasJSON) {
            try {
              const jsonData = JSON.parse(pageData.canvasJSON);
              const jsonObjectCount = jsonData.objects ? jsonData.objects.length : 0;
              console.log(`Force Save: Current page has ${jsonObjectCount} objects in saved data (Canvas has ${objectsCount})`);
              
              if (jsonObjectCount !== objectsCount) {
                console.warn(`Force Save: Object count mismatch - canvas has ${objectsCount} but saved JSON has ${jsonObjectCount}`);
              }
            } catch (err) {
              console.error("Force Save: Error parsing saved JSON:", err);
            }
          } else {
            console.warn("Force Save: Current page has no canvasJSON in saved document");
          }
        }
      }
      
      return true;
    } catch (err) {
      console.error("Force Save: Error saving document:", err);
      return false;
    }
  }

  onMount(async () => {
    // Setup beforeunload event to save before leaving
    beforeUnloadHandler = (event) => {
      console.log("User is leaving page, forcing document save");
      
      if (canvasComponent && canvasComponent.saveCurrentPage) {
        canvasComponent.saveCurrentPage();
      }
      
      // We don't await this to avoid blocking the page close,
      // but the browser will typically wait for this operation to complete
      try {
        saveDocument($currentDocument);
      } catch (err) {
        console.error("Error saving document on page unload:", err);
      }
      
      // Chrome requires returnValue to be set to show the dialog
      event.preventDefault();
      event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return event.returnValue;
    };
    
    window.addEventListener('beforeunload', beforeUnloadHandler);
    
    // Force save at specific intervals (to ensure we don't lose data)
    setInterval(forceSave, 15000); // Save every 15 seconds
    
    const docId = $page.url.searchParams.get('id');
    
    if (docId) {
      // Try to load an existing document
      try {
        console.log(`Attempting to load document with ID: ${docId}`);
        const loadedDocument = await loadDocument(docId);
        
        console.log(`Document loaded successfully. Title: "${loadedDocument.title}", ${loadedDocument.pages.length} pages`);
        
        // Log information about each page's canvas data
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
            }
          } else {
            console.warn(`Page ${index} (${page.id}) has no canvasJSON in loaded document`);
          }
        });
        
        // Set the document in the store
        setCurrentDocument(loadedDocument);
        documentTitle = loadedDocument.title;
        
        // Wait for components to initialize before checking canvas
        setTimeout(() => {
          if (canvasComponent && canvasComponent.getCanvas) {
            const canvas = canvasComponent.getCanvas();
            if (canvas) {
              const objects = canvas.getObjects();
              console.log(`Currently ${objects.length} objects visible on canvas after loading`);
              
              if (objects.length > 0) {
                console.log(`Visible object types:`, objects.map(obj => obj.type));
              }
            } else {
              console.warn("Canvas instance not available after loading document");
            }
          } else {
            console.warn("Canvas component not fully initialized after loading document");
          }
        }, 1000);
      } catch (err) {
        console.error('Error loading document:', err);
        // Create a new document if loading fails
        createNewDocument();
      }
    } else {
      // Create a new document if no ID is provided
      createNewDocument();
    }
    
    // Setup auto-save
    setupAutoSave();
    
    return () => {
      // Do a final save when the component unmounts
      if (canvasComponent && canvasComponent.saveCurrentPage) {
        console.log("Component unmounting, saving current page");
        canvasComponent.saveCurrentPage();
      }
      
      // Force a final document save
      console.log("Component unmounting, saving entire document");
      saveDocument($currentDocument).catch(err => {
        console.error("Error saving document on unmount:", err);
      });
      
      // Clean up auto-save timer and event listeners
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
      
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  });
  
  function createNewDocument() {
    const newDoc = createDocument({
      title: 'Untitled Document',
      format: 'A4',
      pageCount: 1
    });
    
    setCurrentDocument(newDoc);
    documentTitle = newDoc.title;
  }
  
  function handleAddPage(masterPageId = null) {
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
                await saveDocument($currentDocument);
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
  
  async function handleSave() {
    if (!$currentDocument) {
      console.error("Cannot save: No current document");
      return;
    }
    
    try {
      isSaving = true;
      saveError = null;
      
      // Check document structure before save
      console.log("Current document before save:", {
        id: $currentDocument.id,
        pageCount: $currentDocument.pages.length,
        currentPageId: $currentPage
      });
      
      // Log information about each page's canvas data
      $currentDocument.pages.forEach((page, index) => {
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
            const currentPageId = $currentPage;
            const pageIndex = $currentDocument.pages.findIndex(p => p.id === currentPageId);
            
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
              
              // Save to the document
              $currentDocument.pages[pageIndex].canvasJSON = canvasJSON;
              
              // Verify the update
              console.log(`Verified: Page now has canvas data of length: ${$currentDocument.pages[pageIndex].canvasJSON.length}`);
            }
          }
        }
      }
      
      // Check document structure after save
      console.log("Current document after page save:", {
        id: $currentDocument.id,
        pageCount: $currentDocument.pages.length,
        pages: $currentDocument.pages.map(page => ({
          id: page.id,
          hasData: !!page.canvasJSON,
          dataLength: page.canvasJSON ? page.canvasJSON.length : 0
        }))
      });
      
      // Update document title if changed
      if (documentTitle !== $currentDocument.title) {
        console.log(`Updating document title from "${$currentDocument.title}" to "${documentTitle}"`);
        $currentDocument.title = documentTitle;
      }
      
      // Update the document in store
      console.log("Updating document in store");
      updateDocument($currentDocument);
      
      // Save to IndexedDB with extra verification
      console.log("Saving document to IndexedDB:", $currentDocument.id);
      
      try {
        // Deep clone the document to check its structure
        const documentToSave = JSON.parse(JSON.stringify($currentDocument));
        
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
      
      isSaving = false;
    } catch (err) {
      console.error('Error saving document:', err);
      saveError = err.message || "An unknown error occurred";
      isSaving = false;
    }
  }
  
  function handleExport() {
    // This is a placeholder for the export functionality
    // It will be implemented with jsPDF in a future step
    alert('Export functionality will be implemented in a future step');
  }
  
  function handleObjectSelected(event) {
    selectedObject = event.detail.object;
    selectedObjectType = event.detail.objectType;
  }
  
  function handleHistoryChange(event) {
    canUndo = event.detail.canUndo;
    canRedo = event.detail.canRedo;
  }
  
  function handleUndo() {
    if (canvasComponent) {
      canvasComponent.undo();
    }
  }
  
  function handleRedo() {
    if (canvasComponent) {
      canvasComponent.redo();
    }
  }
  
  function handleDeleteObject() {
    if (canvasComponent) {
      canvasComponent.deleteSelectedObjects();
    }
  }
  
  function handleBackToHome() {
    goto('/');
  }
  
  function toggleMasterPagePanel() {
    if (masterPageController) {
      masterPageController.togglePanel();
    }
  }
  
  function handleEditMasterPage(event) {
    const { masterPageId } = event.detail;
    // TODO: Implement master page editing
  }
  
  function handleMasterPageApplied(event) {
    // Refresh the canvas to show the applied master page
    if (canvasComponent) {
      canvasComponent.loadPage($currentPage);
    }
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="h-screen flex flex-col">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 h-12 flex items-center px-4 justify-between">
    <div class="flex items-center gap-2">
      <button class="p-1 hover:bg-gray-100 rounded-full" on:click={handleBackToHome}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <img src="/favicon.png" alt="PageStudio Logo" class="h-8 w-8" />
      <h1 class="font-semibold text-xl">PageStudio</h1>
      {#if $currentDocument}
        <div class="ml-4 flex items-center">
          <input 
            type="text" 
            bind:value={documentTitle} 
            class="border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none px-2 py-1 text-gray-800 bg-transparent" 
            placeholder="Document Title"
          />
        </div>
      {/if}
    </div>
    
    <div class="flex gap-2 items-center">
      <div class="flex items-center h-8">
        {#if isSaving}
          <span class="text-blue-500 text-sm flex items-center gap-1">
            <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        {:else if saveError}
          <span class="text-red-500 text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {saveError}
          </span>
        {/if}
      </div>
      
      <button class="btn btn-secondary" on:click={toggleMasterPagePanel} title="Master Pages">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
        Master Pages
      </button>
      
      <button 
        class="btn {isSaving ? 'btn-disabled' : 'btn-secondary'} flex items-center gap-1" 
        on:click={handleSave} 
        disabled={isSaving}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Save
      </button>
      
      <button class="btn btn-primary flex items-center gap-1" on:click={handleExport}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export PDF
      </button>
    </div>
  </header>
  
  <!-- Main editor area -->
  <div class="flex-1 flex relative">
    <!-- Tools panel (left) -->
    <Toolbar bind:canvasComponent={canvasComponent} />
    
    <!-- Canvas (center) -->
    <div class="flex-1 overflow-hidden">
      <Canvas 
        bind:this={canvasComponent} 
        on:objectselected={handleObjectSelected}
        on:historyChange={handleHistoryChange}
      />
      
      <!-- Master Page Controller -->
      <MasterPageController 
        bind:this={masterPageController}
        canvasComponent={canvasComponent}
        on:editMasterPage={handleEditMasterPage}
        on:masterPageApplied={handleMasterPageApplied}
      />
    </div>
    
    <!-- Properties panel (right) -->
    <div class="properties-panel">
      <h2 class="font-medium text-lg mb-4">Properties</h2>
      
      {#if selectedObjectType === 'textbox'}
        <!-- Text editing panel for selected textbox -->
        <TextEditingPanel 
          canvas={canvasComponent?.getCanvas()} 
          textObject={selectedObject} 
        />
      {:else}
        <!-- Default properties panels -->
        <div class="mb-4">
          <h3 class="font-medium mb-2">Document</h3>
          {#if $currentDocument}
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="text-gray-600">Format:</div>
              <div>{$currentDocument.format}</div>
              <div class="text-gray-600">Width:</div>
              <div>{$currentDocument.metadata.pageSize.width} mm</div>
              <div class="text-gray-600">Height:</div>
              <div>{$currentDocument.metadata.pageSize.height} mm</div>
              <div class="text-gray-600">Pages:</div>
              <div>{$currentDocument.pages.length}</div>
            </div>
          {/if}
        </div>
        
        <div class="mb-4">
          <h3 class="font-medium mb-2">Tool: {$activeTool}</h3>
          
          {#if $activeTool === 'select'}
            <p class="text-sm mb-2">Use select tool to manage objects</p>
            <div class="grid grid-cols-2 gap-2">
              <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))}>Delete</button>
              <button class="btn btn-sm btn-secondary" on:click={() => document.execCommand('copy')}>Copy</button>
            </div>
            
            <div class="mt-4">
              <h4 class="text-sm font-medium mb-2">Transform</h4>
              <div class="grid grid-cols-2 gap-2">
                <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true }))}>Move Up</button>
                <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true }))}>Move Down</button>
                <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))}>Rotate</button>
                <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))}>Flip</button>
              </div>
            </div>
            
            <!-- Edit History Controls -->
            <div class="mt-4">
              <h4 class="text-sm font-medium mb-2">Edit</h4>
              <div class="grid grid-cols-3 gap-2">
                <button 
                  class="btn btn-sm btn-secondary" 
                  on:click={handleUndo} 
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a4 4 0 0 1 0 8H9" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10l5-5-5-5" />
                  </svg>
                  Undo
                </button>
                <button 
                  class="btn btn-sm btn-secondary" 
                  on:click={handleRedo} 
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a4 4 0 0 0 0 8h4" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10l-5-5 5-5" />
                  </svg>
                  Redo
                </button>
                <button 
                  class="btn btn-sm btn-danger" 
                  on:click={handleDeleteObject}
                  title="Delete (Del)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          {/if}
          
          {#if $activeTool === 'text'}
            <div class="text-sm">
              <div class="mb-2">
                <label class="block text-gray-600">Font Family</label>
                <select class="w-full border rounded px-2 py-1" 
                  value="Arial"
                  on:change={(e) => updateToolOptions('text', { fontFamily: e.target.value })}>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Font Size</label>
                <input type="number" class="w-full border rounded px-2 py-1" 
                  min="8" max="72" step="1" value="16"
                  on:change={(e) => updateToolOptions('text', { fontSize: parseInt(e.target.value) })} />
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Text Align</label>
                <div class="flex gap-1">
                  <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'left' })}>Left</button>
                  <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'center' })}>Center</button>
                  <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'right' })}>Right</button>
                </div>
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Style</label>
                <div class="flex gap-1">
                  <button class="flex-1 btn btn-sm btn-secondary font-bold" on:click={() => updateToolOptions('text', { fontWeight: 'bold' })}>B</button>
                  <button class="flex-1 btn btn-sm btn-secondary italic" on:click={() => updateToolOptions('text', { fontStyle: 'italic' })}>I</button>
                  <button class="flex-1 btn btn-sm btn-secondary underline" on:click={() => updateToolOptions('text', { textDecoration: 'underline' })}>U</button>
                </div>
              </div>
            </div>
          {/if}
          
          {#if $activeTool === 'image'}
            <div class="text-sm">
              <p class="mb-2">Click on canvas to add an image</p>
              <div class="flex items-center mb-2">
                <input type="checkbox" id="preserveAspect" checked
                   on:change={(e) => updateToolOptions('image', { preserveAspectRatio: e.target.checked })} />
                <label for="preserveAspect" class="ml-2">Preserve aspect ratio</label>
              </div>
            </div>
          {/if}
          
          {#if $activeTool === 'rectangle' || $activeTool === 'ellipse' || $activeTool === 'line'}
            <div class="text-sm">
              <div class="mb-2">
                <label class="block text-gray-600">Fill Color</label>
                <input type="color" class="w-full border rounded px-2 py-1" 
                  value="#ffffff"
                  on:change={(e) => updateToolOptions($activeTool, { fill: e.target.value })} />
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Stroke Color</label>
                <input type="color" class="w-full border rounded px-2 py-1" 
                  value="#000000"
                  on:change={(e) => updateToolOptions($activeTool, { stroke: e.target.value })} />
              </div>
              
              <div class="mb-2">
                <label class="block text-gray-600">Stroke Width</label>
                <input type="number" class="w-full border rounded px-2 py-1" 
                  min="0" max="20" step="1" value="1"
                  on:change={(e) => updateToolOptions($activeTool, { strokeWidth: parseInt(e.target.value) })} />
              </div>
              
              {#if $activeTool === 'rectangle'}
                <div class="mb-2">
                  <label class="block text-gray-600">Corner Radius</label>
                  <input type="number" class="w-full border rounded px-2 py-1" 
                    min="0" max="50" step="1" value="0"
                    on:change={(e) => updateToolOptions('rectangle', { cornerRadius: parseInt(e.target.value) })} />
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Page navigator (bottom) -->
  <div class="page-navigator flex items-end gap-4 p-4 overflow-x-auto bg-white border-t border-gray-200 z-20 shadow-lg sticky bottom-0 left-0 w-full" style="height: 120px;">
    {#if $currentDocument && $currentDocument.pages}
      {#each $currentDocument.pages as page}
        <div 
          class="page-thumb min-w-[80px] aspect-[1/1.414] bg-white border-2 {$currentPage === page.id ? 'border-primary' : 'border-gray-300'} cursor-pointer shadow-md hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-sm relative"
          on:click={() => currentPage.set(page.id)}
        >
          <span class="absolute top-1 left-1 text-xs text-gray-500">
            {page.id.replace('page-', '')}
          </span>
          {#if page.masterPageId}
            <span class="absolute bottom-1 right-1 text-xs text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </span>
          {/if}
        </div>
      {/each}
    {/if}
    
    <div class="relative group">
      <button 
        class="min-w-[80px] aspect-[1/1.414] border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-shadow rounded-sm"
        on:click={() => handleAddPage()} 
        title="Add blank page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      
      <!-- Dropdown for master pages (appears on hover) -->
      {#if $currentDocument && $currentDocument.masterPages && $currentDocument.masterPages.length > 0}
        <div class="absolute left-0 top-0 transform -translate-y-full mb-2 hidden group-hover:block bg-white shadow-xl rounded-lg border border-blue-200 w-64 z-30">
          <div class="px-3 py-2 font-medium text-blue-700 border-b border-blue-200 bg-blue-50 rounded-t-lg">
            Add page from master:
          </div>
          <div class="max-h-64 overflow-y-auto py-1">
            {#each $currentDocument.masterPages as masterPage}
              <button 
                class="block w-full text-left px-3 py-2 hover:bg-blue-50 truncate flex items-center gap-2 transition-colors"
                on:click={() => handleAddPage(masterPage.id)}
                title={masterPage.description || ''}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                <span>{masterPage.name}</span>
              </button>
            {/each}
          </div>
          <div class="px-3 py-2 border-t border-blue-100 bg-blue-50 text-xs text-blue-600 italic rounded-b-lg">
            Tip: Pages with masters inherit their content
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>