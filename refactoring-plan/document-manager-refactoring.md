# Refactoring Plan for DocumentManager.js

## Current Structure

The `DocumentManager.js` file currently contains 566 lines of code with a single main function `createDocumentManager` that returns multiple document management functions. This file is responsible for:

1. Creating new documents
2. Loading documents from IndexedDB
3. Saving documents
4. Managing pages (adding, removing, reordering)
5. Managing auto-save functionality
6. Handling document export
7. Error recovery and data validation

## Proposed Modular Structure

We'll split this file into five smaller modules:

### 1. DocumentCreation.js (~100 lines)

This module will handle creating and initializing new documents:

```javascript
/**
 * Document creation functionality
 */
export function createDocumentCreationModule(context) {
  function createNewDocument(options = { title: 'Untitled Document', format: 'A4', pageCount: 1 }) {
    // Current implementation
  }
  
  function initializeNewDocument(doc) {
    // Initialize a new document with default settings
  }
  
  function createDefaultPage(pageNumber, masterPageId = null) {
    // Create a default page for a new document
  }
  
  // Return document creation functions
  return {
    createNewDocument,
    initializeNewDocument,
    createDefaultPage
  };
}
```

### 2. DocumentLoading.js (~150 lines)

This module will handle loading documents from storage:

```javascript
import { loadDocument } from '$lib/utils/storage.js';

/**
 * Document loading functionality
 */
export function createDocumentLoadingModule(context) {
  async function loadDocumentById(docId) {
    // Current implementation
  }
  
  function checkAndFixCanvasObjects(loadedDocument) {
    // Current implementation
  }
  
  function validateDocument(document) {
    // Validate document structure and fix issues
  }
  
  // Return document loading functions
  return {
    loadDocumentById,
    checkAndFixCanvasObjects,
    validateDocument
  };
}
```

### 3. DocumentSaving.js (~120 lines)

This module will handle saving documents:

```javascript
import { saveDocument } from '$lib/utils/storage.js';

/**
 * Document saving functionality
 */
export function createDocumentSavingModule(context) {
  async function handleSave() {
    // Current implementation
  }
  
  async function forceSave() {
    // Current implementation
  }
  
  function scheduleAutoSave() {
    // Schedule auto-save functionality
  }
  
  function cancelAutoSave() {
    // Cancel auto-save timer
  }
  
  // Return document saving functions
  return {
    handleSave,
    forceSave,
    scheduleAutoSave,
    cancelAutoSave
  };
}
```

### 4. PageManagement.js (~120 lines)

This module will handle page operations:

```javascript
/**
 * Page management functionality
 */
export function createPageManagementModule(context) {
  function handleAddPage(masterPageId = null) {
    // Current implementation
  }
  
  function handleDeletePage(pageId) {
    // Delete a page from the document
  }
  
  function handleDuplicatePage(pageId) {
    // Duplicate an existing page
  }
  
  function handleMovePageUp(pageId) {
    // Move a page up in the document
  }
  
  function handleMovePageDown(pageId) {
    // Move a page down in the document
  }
  
  // Return page management functions
  return {
    handleAddPage,
    handleDeletePage,
    handleDuplicatePage,
    handleMovePageUp,
    handleMovePageDown
  };
}
```

### 5. DocumentExport.js (~80 lines)

This module will handle document export:

```javascript
/**
 * Document export functionality
 */
export function createDocumentExportModule(context) {
  async function handleExport(format = 'pdf') {
    // Current implementation
  }
  
  function generatePdf() {
    // Generate PDF from document
  }
  
  function exportToImage(pageId) {
    // Export a specific page as an image
  }
  
  // Return export functions
  return {
    handleExport,
    generatePdf,
    exportToImage
  };
}
```

### 6. DocumentManager.js (~80 lines)

This module will combine all the above modules:

```javascript
import { createDocumentCreationModule } from './DocumentCreation.js';
import { createDocumentLoadingModule } from './DocumentLoading.js';
import { createDocumentSavingModule } from './DocumentSaving.js';
import { createPageManagementModule } from './PageManagement.js';
import { createDocumentExportModule } from './DocumentExport.js';

/**
 * Main document manager that combines all sub-modules
 */
export function createDocumentManager(context) {
  let canvasComponent = null;
  
  // Helper function to get the canvas component
  function getCanvasComponent() {
    return canvasComponent;
  }
  
  // Set canvas component reference
  function setCanvasComponent(component) {
    canvasComponent = component;
    return canvasComponent;
  }
  
  // Create shared context for all modules
  const sharedContext = {
    ...context,
    getCanvasComponent,
    setCanvasComponent
  };
  
  // Initialize all sub-modules
  const documentCreation = createDocumentCreationModule(sharedContext);
  const documentLoading = createDocumentLoadingModule(sharedContext);
  const documentSaving = createDocumentSavingModule(sharedContext);
  const pageManagement = createPageManagementModule(sharedContext);
  const documentExport = createDocumentExportModule(sharedContext);
  
  // Return a unified API
  return {
    // Canvas reference
    getCanvasComponent,
    setCanvasComponent,
    
    // From documentCreation
    createNewDocument: documentCreation.createNewDocument,
    
    // From documentLoading
    loadDocumentById: documentLoading.loadDocumentById,
    
    // From documentSaving
    handleSave: documentSaving.handleSave,
    forceSave: documentSaving.forceSave,
    scheduleAutoSave: documentSaving.scheduleAutoSave,
    cancelAutoSave: documentSaving.cancelAutoSave,
    
    // From pageManagement
    handleAddPage: pageManagement.handleAddPage,
    handleDeletePage: pageManagement.handleDeletePage,
    handleDuplicatePage: pageManagement.handleDuplicatePage,
    handleMovePageUp: pageManagement.handleMovePageUp,
    handleMovePageDown: pageManagement.handleMovePageDown,
    
    // From documentExport
    handleExport: documentExport.handleExport,
    generatePdf: documentExport.generatePdf,
    exportToImage: documentExport.exportToImage
  };
}
```

## Implementation Steps

1. Create the new file structure in `src/lib/components/Editor/editor/document/`
2. Extract each group of functions to their respective files
3. Create the index file to maintain the same external API
4. Update any imports in other files
5. Test each module individually
6. Test the integrated solution

## Benefits

1. Each module has a clear, focused responsibility
2. Easier to maintain and understand
3. Enables parallel development
4. Makes testing more manageable
5. Reduces cognitive load when working on a specific feature
6. Better separation of concerns between document creation, loading, saving, and exporting