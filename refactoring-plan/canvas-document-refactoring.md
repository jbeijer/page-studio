# Refactoring Plan for Canvas.document.js

## Current Structure

The `Canvas.document.js` file currently contains 1294 lines of code with a single main function `createDocumentManagement` that returns multiple document-related functions. This file is responsible for:

1. Saving/loading document pages 
2. Serializing/deserializing canvas objects
3. Creating objects manually from JSON
4. Master page application and overriding
5. Page navigation logic

## Proposed Modular Structure

We'll split this file into five smaller modules:

### 1. Canvas.document.save.js (~250 lines)

This module will handle saving the current canvas state to the document model:

```javascript
/**
 * Functions for saving canvas content to document storage
 */
export function createDocumentSaveModule(context) {
  function saveCurrentPage() {
    // Current implementation
  }
  
  function saveSpecificPage(pageId, objects) {
    // Current implementation
  }
  
  // Return functions related to saving
  return {
    saveCurrentPage,
    saveSpecificPage
  };
}
```

### 2. Canvas.document.load.js (~300 lines)

This module will focus on loading canvas content from storage:

```javascript
/**
 * Functions for loading document content into the canvas
 */
export function createDocumentLoadModule(context) {
  function loadPage(pageId, shouldSaveFirst = true) {
    // Current implementation
  }
  
  function loadDocumentFromIndexedDB(documentId) {
    // Current implementation
  }
  
  // Return functions related to loading
  return {
    loadPage,
    loadDocumentFromIndexedDB
  };
}
```

### 3. Canvas.document.objects.js (~300 lines)

This module will handle object creation from JSON:

```javascript
/**
 * Functions for creating and managing canvas objects
 */
export function createObjectsModule(context) {
  function createObjectsManually(objectsData) {
    // Current implementation
  }
  
  // Helper functions for object creation
  function createTextObject(objData) {
    // Extract from current implementation
  }
  
  function createShapeObject(objData) {
    // Extract from current implementation
  }
  
  // Return object-related functions
  return {
    createObjectsManually
  };
}
```

### 4. Canvas.document.masterpage.js (~250 lines)

This module will focus on master page functionality:

```javascript
/**
 * Functions for managing master pages
 */
export function createMasterPageModule(context) {
  function applyMasterPage(masterPageId, overrides = {}) {
    // Current implementation
  }
  
  function overrideMasterObject(masterObject) {
    // Current implementation
  }
  
  // Return master page functions
  return {
    applyMasterPage,
    overrideMasterObject
  };
}
```

### 5. Canvas.document.utils.js (~100 lines)

This module will contain utility functions:

```javascript
/**
 * Utility functions for document management
 */
export function createDocumentUtilsModule(context) {
  function getPageById(pageId) {
    // Current implementation
  }
  
  // Other utility functions extracted from the main file
  
  // Return utility functions
  return {
    getPageById
    // Other utilities
  };
}
```

### 6. Canvas.document.index.js (~100 lines)

This module will combine all the above modules:

```javascript
import { createDocumentSaveModule } from './Canvas.document.save.js';
import { createDocumentLoadModule } from './Canvas.document.load.js';
import { createObjectsModule } from './Canvas.document.objects.js';
import { createMasterPageModule } from './Canvas.document.masterpage.js';
import { createDocumentUtilsModule } from './Canvas.document.utils.js';

/**
 * Main document management module that combines all sub-modules
 */
export function createDocumentManagement(context) {
  // Initialize all sub-modules
  const saveModule = createDocumentSaveModule(context);
  const loadModule = createDocumentLoadModule(context);
  const objectsModule = createObjectsModule(context);
  const masterPageModule = createMasterPageModule(context);
  const utilsModule = createDocumentUtilsModule(context);
  
  // Return a unified API
  return {
    // From saveModule
    saveCurrentPage: saveModule.saveCurrentPage,
    saveSpecificPage: saveModule.saveSpecificPage,
    
    // From loadModule
    loadPage: loadModule.loadPage,
    loadDocumentFromIndexedDB: loadModule.loadDocumentFromIndexedDB,
    
    // From objectsModule
    createObjectsManually: objectsModule.createObjectsManually,
    
    // From masterPageModule
    applyMasterPage: masterPageModule.applyMasterPage,
    overrideMasterObject: masterPageModule.overrideMasterObject,
    
    // From utilsModule
    getPageById: utilsModule.getPageById
  };
}
```

## Implementation Steps

1. Create the new file structure in `src/lib/components/Editor/modules/document/`
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
6. Provides clearer separation of concerns