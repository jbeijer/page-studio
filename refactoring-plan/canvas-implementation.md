# Canvas Refactoring Implementation Guide

This document provides detailed implementation guidance for refactoring the Canvas.svelte component into a more modular structure.

## Canvas.svelte Refactoring

### What to Keep in Canvas.svelte
The main Canvas.svelte file should be reduced to contain only:

1. **Component Properties & State**
   - Input properties (width, height)
   - Canvas element reference
   - Essential state variables
   - Exported function references

2. **Lifecycle Management**
   - onMount initialization
   - onDestroy cleanup
   - Reactive statements for store subscriptions

3. **Module Coordination**
   - Importing and initializing all the modules
   - Creating the shared context
   - Distributing references between modules

4. **UI Template**
   - Canvas container
   - Rulers
   - Context menus
   - Guides visualization
   - Core event bindings

5. **Public API**
   - Essential exported methods
   - Method forwarding to appropriate modules

### Example Implementation (core structure)

```svelte
<script>
  // Imports
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType } from '$lib/stores/toolbar';
  import * as fabric from 'fabric';
  
  // Import modules
  import { initializeEvents, registerEventHandlers } from './Canvas.events.js';
  import { initializeObjects, createObject } from './Canvas.objects.js';
  import { initializeHistory } from './Canvas.history.js';
  import { initializeLayers, bringForward, sendBackward, bringToFront, sendToBack } from './Canvas.layers.js';
  import { initializeClipboard, copyObjects, cutObjects, pasteObjects } from './Canvas.clipboard.js';
  import { loadPage, saveCurrentPage } from './Canvas.document.js';
  import { initializeMasters, applyMasterPage } from './Canvas.masters.js';
  import { initializeGrid, setupSnapping } from './Canvas.grid.js';
  import { setupToolBehaviors } from './Canvas.tools.js';
  import { initializeTextFlow } from './Canvas.textflow.js';
  
  // Component UI imports
  import HorizontalRuler from './HorizontalRuler.svelte';
  import VerticalRuler from './VerticalRuler.svelte';
  import MasterObjectContextMenu from './MasterObjectContextMenu.svelte';
  
  // Properties
  export let width = 1240;
  export let height = 1754;
  
  // Initialize references
  let canvasElement;
  let canvas;
  let isInitialized = false;
  let dispatch = createEventDispatcher();
  
  // Export API functions
  export { 
    // Re-export from layers module
    bringForward, sendBackward, bringToFront, sendToBack,
    // Re-export from clipboard module
    copyObjects as copySelectedObjects, 
    cutObjects as cutSelectedObjects, 
    pasteObjects,
    // Re-export from document module  
    loadPage, saveCurrentPage,
    // Re-export from masters module
    applyMasterPage
  };
  
  // Provide access to canvas
  export function getCanvas() {
    return canvas;
  }
  
  // Create canvas context (shared between modules)
  function createCanvasContext() {
    return {
      canvas,
      dispatch,
      saveCurrentPage,
      getDocument: () => $currentDocument,
      getCurrentPage: () => $currentPage
    };
  }
  
  onMount(() => {
    // Initialize canvas
    canvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      selection: true,
      backgroundColor: 'white'
    });
    
    // Create context
    const context = createCanvasContext();
    
    // Initialize all modules
    initializeEvents(context);
    initializeObjects(context);
    initializeHistory(context);
    initializeLayers(context);
    initializeClipboard(context);
    initializeMasters(context);
    initializeGrid(context);
    setupToolBehaviors(context);
    initializeTextFlow(context);
    
    // Register event handlers
    registerEventHandlers(context);
    
    // Initial setup based on current tool
    handleToolChange($activeTool);
    
    isInitialized = true;
    
    return () => {
      // Cleanup on component destruction
      if (canvas) {
        canvas.dispose();
      }
    };
  });
  
  // React to tool changes
  $: if (isInitialized && canvas) {
    handleToolChange($activeTool);
  }
  
  function handleToolChange(tool) {
    // Delegate to tools module
    setupToolForCanvas(canvas, tool);
  }
</script>

<div class="canvas-container">
  <!-- Rulers -->
  <HorizontalRuler />
  <VerticalRuler />
  
  <!-- Master Page Context Menu -->
  <MasterObjectContextMenu />
  
  <!-- Canvas Element -->
  <canvas bind:this={canvasElement}></canvas>
</div>

<style>
  /* Keep essential styling */
  .canvas-container {
    position: relative;
    overflow: auto;
    width: 100%;
    height: 100%;
    background-color: var(--canvas-bg, #e0e0e0);
  }
  
  canvas {
    position: absolute;
    top: 50px;
    left: 50px;
    background-color: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  }
</style>
```

## Module Implementation Examples

### Canvas.events.js

```javascript
/**
 * Canvas events management module
 */

// Event handler registry
let eventHandlers = [];
let context = null;

/**
 * Initialize the events module
 * @param {Object} canvasContext - The shared canvas context
 */
export function initializeEvents(canvasContext) {
  context = canvasContext;
  const { canvas } = context;
  
  // Store references for cleanup
  eventHandlers = [];
}

/**
 * Register all event handlers on the canvas
 */
export function registerEventHandlers(context) {
  const { canvas, dispatch } = context;

  // Mouse events
  addHandler(canvas, 'mouse:down', handleMouseDown);
  addHandler(canvas, 'mouse:move', handleMouseMove);
  addHandler(canvas, 'mouse:up', handleMouseUp);
  
  // Selection events
  addHandler(canvas, 'selection:created', handleSelectionCreated);
  addHandler(canvas, 'selection:updated', handleSelectionUpdated);
  addHandler(canvas, 'selection:cleared', handleSelectionCleared);
  
  // Other events...
}

// Event handler implementations
function handleMouseDown(opt) {
  // Implementation...
}

function handleMouseMove(opt) {
  // Implementation...
}

// More event handlers...

// Helper to track handlers for cleanup
function addHandler(canvas, eventName, handler) {
  const boundHandler = handler.bind(null, context);
  canvas.on(eventName, boundHandler);
  eventHandlers.push({ canvas, eventName, handler: boundHandler });
}

// Cleanup function
export function removeEventHandlers() {
  if (!eventHandlers.length) return;
  
  eventHandlers.forEach(({ canvas, eventName, handler }) => {
    canvas.off(eventName, handler);
  });
  
  eventHandlers = [];
}
```

### Canvas.layers.js

```javascript
/**
 * Canvas layer management module
 * Handles object stacking and z-index
 */

let context = null;

/**
 * Initialize the layers module
 * @param {Object} canvasContext - The shared canvas context
 */
export function initializeLayers(canvasContext) {
  context = canvasContext;
}

/**
 * Bring the selected object forward one layer
 */
export function bringForward() {
  const { canvas, saveCurrentPage } = context;
  if (!canvas) return;
  
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;
  
  console.log("Moving object forward:", activeObject);
  
  if (activeObject.type === 'activeSelection') {
    // Handle group selection - sort objects by their z-index first
    const objects = activeObject.getObjects();
    objects.sort((a, b) => canvas.getObjects().indexOf(b) - canvas.getObjects().indexOf(a));
    
    objects.forEach(obj => {
      canvas.bringForward(obj);
    });
  } else {
    canvas.bringForward(activeObject);
  }
  
  canvas.renderAll();
  saveCurrentPage();
}

/**
 * Send the selected object backward one layer
 */
export function sendBackward() {
  const { canvas, saveCurrentPage } = context;
  if (!canvas) return;
  
  const activeObject = canvas.getActiveObject();
  if (!activeObject) return;
  
  if (activeObject.type === 'activeSelection') {
    // Handle group selection - sort objects by their z-index first
    const objects = activeObject.getObjects();
    objects.sort((a, b) => canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b));
    
    objects.forEach(obj => {
      canvas.sendBackward(obj);
    });
  } else {
    canvas.sendBackward(activeObject);
  }
  
  canvas.renderAll();
  saveCurrentPage();
}

// Implement other layer management functions...
export function bringToFront() {
  // Implementation...
}

export function sendToBack() {
  // Implementation...
}
```

## Refactoring Approach

1. **Create Base Structure**:
   - Create all module files
   - Set up empty exported functions
   - Establish shared context pattern

2. **Progressive Migration**:
   - Identify logical groups of functions in Canvas.svelte
   - Move each group to the appropriate module
   - Update references in Canvas.svelte to use the module functions
   - Test after each migration

3. **Test and Validate**:
   - Ensure all functionality still works
   - Verify event handlers are properly cleaned up
   - Check for any missed dependencies

4. **Finalize**:
   - Clean up remaining Canvas.svelte code
   - Improve documentation
   - Add any missing tests