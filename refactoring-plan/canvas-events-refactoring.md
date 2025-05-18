# Refactoring Plan for Canvas.events.js

## Current Structure

The `Canvas.events.js` file currently contains 668 lines of code with a single main function `createEventHandlers` that returns multiple event handling functions. This file is responsible for:

1. Processing mouse events (down, move, up, double-click)
2. Handling different drawing tools (text, rectangle, ellipse, line, image)
3. Managing selection events
4. Processing keyboard shortcuts
5. Handling image uploads
6. Managing right-click context menus

## Proposed Modular Structure

We'll split this file into seven smaller modules:

### 1. Canvas.events.core.js (~100 lines)

This module will contain the core event registration and management:

```javascript
/**
 * Core event handling functionality
 */
export function createCoreEventHandlers(context) {
  function registerEventHandlers() {
    // Current implementation
  }
  
  function removeEventHandlers() {
    // Current implementation
  }
  
  // Return core event functions
  return {
    registerEventHandlers,
    removeEventHandlers
  };
}
```

### 2. Canvas.events.text.js (~100 lines)

This module will handle text tool functionality:

```javascript
import { getTextObjectFactory } from '$lib/utils/fabric-helpers';

/**
 * Text tool event handlers
 */
export function createTextToolHandlers(context) {
  function handleTextToolMouseDown(options, pointer) {
    // Current implementation
  }
  
  function handleTextDoubleClick(options) {
    // Handle double-clicking text objects
  }
  
  // Return text-specific handlers
  return {
    handleTextToolMouseDown,
    handleTextDoubleClick
  };
}
```

### 3. Canvas.events.shapes.js (~150 lines)

This module will handle drawing shapes (rectangle, ellipse, line):

```javascript
/**
 * Shape tools event handlers (rectangle, ellipse, line)
 */
export function createShapeToolHandlers(context) {
  let drawingObject = null;
  let isDrawing = false;
  
  // Rectangle handlers
  function handleRectangleToolMouseDown(options, pointer) {
    // Current implementation
  }
  
  function handleRectangleToolMouseMove(pointer) {
    // Current implementation
  }
  
  // Ellipse handlers
  function handleEllipseToolMouseDown(options, pointer) {
    // Current implementation
  }
  
  function handleEllipseToolMouseMove(pointer) {
    // Current implementation
  }
  
  // Line handlers
  function handleLineToolMouseDown(options, pointer) {
    // Current implementation
  }
  
  function handleLineToolMouseMove(pointer) {
    // Current implementation
  }
  
  function handleMouseUp() {
    // Common mouse up handler for all shape tools
  }
  
  // Return shape-specific handlers
  return {
    handleRectangleToolMouseDown,
    handleRectangleToolMouseMove,
    handleEllipseToolMouseDown,
    handleEllipseToolMouseMove,
    handleLineToolMouseDown,
    handleLineToolMouseMove,
    handleMouseUp,
    getDrawingObject: () => drawingObject,
    isDrawing: () => isDrawing
  };
}
```

### 4. Canvas.events.image.js (~100 lines)

This module will handle image tool functionality:

```javascript
/**
 * Image tool event handlers
 */
export function createImageToolHandlers(context) {
  function handleImageToolMouseDown(options) {
    // Current implementation
  }
  
  function handleImageUpload(event) {
    // Current implementation
  }
  
  // Return image-specific handlers
  return {
    handleImageToolMouseDown,
    handleImageUpload
  };
}
```

### 5. Canvas.events.selection.js (~80 lines)

This module will handle selection-related events:

```javascript
/**
 * Selection event handlers
 */
export function createSelectionHandlers(context) {
  function handleObjectSelected(options) {
    // Current implementation
  }
  
  function handleSelectionCleared() {
    // Current implementation
  }
  
  function handleRightClick(options) {
    // Current implementation
  }
  
  // Return selection handlers
  return {
    handleObjectSelected,
    handleSelectionCleared,
    handleRightClick
  };
}
```

### 6. Canvas.events.keyboard.js (~80 lines)

This module will handle keyboard shortcuts:

```javascript
/**
 * Keyboard shortcut handlers
 */
export function createKeyboardHandlers(context) {
  function handleKeyboard(e) {
    // Current implementation
  }
  
  // Return keyboard handlers
  return {
    handleKeyboard
  };
}
```

### 7. Canvas.events.index.js (~80 lines)

This module will combine all the above modules:

```javascript
import { createCoreEventHandlers } from './Canvas.events.core.js';
import { createTextToolHandlers } from './Canvas.events.text.js';
import { createShapeToolHandlers } from './Canvas.events.shapes.js';
import { createImageToolHandlers } from './Canvas.events.image.js';
import { createSelectionHandlers } from './Canvas.events.selection.js';
import { createKeyboardHandlers } from './Canvas.events.keyboard.js';
import { ToolType } from '$lib/stores/toolbar';

/**
 * Main event handler module that combines all sub-modules
 */
export function createEventHandlers(context) {
  // Initialize all sub-modules
  const coreHandlers = createCoreEventHandlers(context);
  const textHandlers = createTextToolHandlers(context);
  const shapeHandlers = createShapeToolHandlers(context);
  const imageHandlers = createImageToolHandlers(context);
  const selectionHandlers = createSelectionHandlers(context);
  const keyboardHandlers = createKeyboardHandlers(context);
  
  /**
   * Main mouse down handler that dispatches to tool-specific handlers
   */
  function handleMouseDown(options) {
    if (!context.canvas) return;
    
    const pointer = context.canvas.getPointer(options.e);
    
    // Call appropriate handler based on current tool
    switch (context.activeTool) {
      case ToolType.SELECT:
        // Selection is handled by Fabric.js automatically
        break;
        
      case ToolType.TEXT:
        textHandlers.handleTextToolMouseDown(options, pointer);
        break;
        
      case ToolType.IMAGE:
        imageHandlers.handleImageToolMouseDown(options);
        break;
        
      case ToolType.RECTANGLE:
        shapeHandlers.handleRectangleToolMouseDown(options, pointer);
        break;
        
      case ToolType.ELLIPSE:
        shapeHandlers.handleEllipseToolMouseDown(options, pointer);
        break;
        
      case ToolType.LINE:
        shapeHandlers.handleLineToolMouseDown(options, pointer);
        break;
    }
  }
  
  /**
   * Main mouse move handler that dispatches to tool-specific handlers
   */
  function handleMouseMove(options) {
    if (!shapeHandlers.isDrawing() || !shapeHandlers.getDrawingObject()) return;
    
    const pointer = context.canvas.getPointer(options.e);
    
    switch (context.activeTool) {
      case ToolType.RECTANGLE:
        shapeHandlers.handleRectangleToolMouseMove(pointer);
        break;
        
      case ToolType.ELLIPSE:
        shapeHandlers.handleEllipseToolMouseMove(pointer);
        break;
        
      case ToolType.LINE:
        shapeHandlers.handleLineToolMouseMove(pointer);
        break;
    }
    
    context.canvas.renderAll();
  }
  
  /**
   * Handle scroll events
   */
  function handleScroll() {
    if (context.canvasContainer) {
      context.canvasScrollX = context.canvasContainer.scrollLeft;
      context.canvasScrollY = context.canvasContainer.scrollTop;
    }
  }
  
  /**
   * Handle double click events
   */
  function handleDoubleClick(options) {
    if (!context.canvas) return;
    
    const target = options.target;
    
    // Handle double-clicking on text objects
    if (target && (target.type === 'textbox' || target.type === 'text' || target.type === 'i-text')) {
      textHandlers.handleTextDoubleClick(options);
    }
  }
  
  // Return a unified API
  return {
    // Main event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp: shapeHandlers.handleMouseUp,
    handleDoubleClick,
    
    // Selection handlers
    handleObjectSelected: selectionHandlers.handleObjectSelected,
    handleSelectionCleared: selectionHandlers.handleSelectionCleared,
    handleRightClick: selectionHandlers.handleRightClick,
    
    // Other handlers
    handleScroll,
    handleImageUpload: imageHandlers.handleImageUpload,
    handleKeyboard: keyboardHandlers.handleKeyboard,
    
    // Core event registration
    registerEventHandlers: coreHandlers.registerEventHandlers,
    removeEventHandlers: coreHandlers.removeEventHandlers,
    
    // State getters
    getDrawingObject: shapeHandlers.getDrawingObject,
    isDrawing: shapeHandlers.isDrawing
  };
}
```

## Implementation Steps

1. Create the new file structure in `src/lib/components/Editor/modules/events/`
2. Extract each group of functions to their respective files
3. Create the index file to maintain the same external API
4. Update any imports in other files
5. Test each module individually
6. Test the integrated solution

## Benefits

1. Each module has a clear, focused responsibility
2. Adding new tools becomes easier with a dedicated module per tool
3. Easier to maintain and understand
4. Enables parallel development
5. Makes testing more manageable
6. Reduces cognitive load when working on a specific feature