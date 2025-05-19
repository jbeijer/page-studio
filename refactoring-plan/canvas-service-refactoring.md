# Canvas Service Refactoring

This document outlines the refactoring performed to centralize document and canvas management in PageStudio.

## Overview

The previous implementation had multiple overlapping functions and references across different components, leading to:
- Confusion about which functions were being called
- Complex initialization sequences
- Duplicate code for saving and loading
- Multiple recovery mechanisms
- Global state variables scattered throughout the codebase

The refactoring introduces a service-based architecture with clear separation of concerns.

## New Services

### DocumentService

A centralized service for document and page management that handles:
- Document creation, loading, and saving
- Page management (adding, switching, saving)
- Canvas state synchronization
- Auto-saving functionality

Key improvements:
- Single source of truth for document operations
- Consistent saving and loading logic
- Simplified error handling
- Better state management

### CanvasService

A service dedicated to canvas operations that handles:
- Canvas initialization and cleanup
- Object creation and manipulation
- Layer management
- Working with Fabric.js canvas

Key improvements:
- Clear separation from document management
- Simplified object manipulation
- Consistent interface for canvas operations

### MasterPageService

A specialized service for master page functionality that handles:
- Creating, updating, and deleting master pages
- Applying master pages to document pages
- Overriding master page objects

Key improvements:
- Master page-specific logic isolated
- Clearer interfaces for master page operations
- Reduced code duplication

## Implementation Details

### Service Organization

The services are implemented as singletons with clear public APIs:

```
src/lib/services/
├── index.js                # Export all services
├── DocumentService.js      # Document and page management
├── CanvasService.js        # Canvas operations
└── MasterPageService.js    # Master page functionality
```

### Component Changes

The Canvas component has been refactored to use these services instead of directly implementing all functionality.
This reduces the component's complexity and responsibility.

### Key Benefits

1. **Reduced Duplication**: Common operations are now defined once in a central location
2. **Clearer Responsibilities**: Each service has a specific focus
3. **Better Maintainability**: Future changes can be made in one place
4. **Improved Error Handling**: More consistent error recovery
5. **Simplified Components**: Components can focus on UI concerns 
6. **Better Testing**: Services can be tested independently

## Using the Services

Services can be imported from the services index:

```javascript
import { documentService, canvasService, masterPageService } from '$lib/services';
```

Or individually:

```javascript
import documentService from '$lib/services/DocumentService';
```

## Migration Path

1. The new services have been created
2. A refactored Canvas component is available at Canvas.refactored.svelte.new
3. Next steps:
   - Test the refactored component and services
   - Update references in other components
   - Remove deprecated functions and modules

## Code Size

Each service has been kept under 500 lines of code for maintainability:
- DocumentService: ~500 lines
- CanvasService: ~450 lines
- MasterPageService: ~450 lines

This is a significant improvement over the original Canvas.svelte which was approaching 2000 lines.