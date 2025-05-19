<script>
  import { onMount, onDestroy } from 'svelte';
  import { activeTool } from '$lib/stores/toolbar';
  import Canvas from './Canvas.svelte';
  
  // Import services
  import toolService from '$lib/services/ToolService';
  import layerService from '$lib/services/LayerService';
  import objectService from '$lib/services/ObjectService';
  import historyService from '$lib/services/HistoryService';
  import contextService from '$lib/services/ContextService';
  
  // Import toolbar modules
  import { 
    createToolbarContext, 
    DrawingTools, 
    LayerTools, 
    EditTools, 
    ViewTools
  } from './toolbar/toolbar.index.js';
  
  // References to functions to be obtained from Canvas component instance
  let canvasComponent;
  let getCanvas;
  let bringForward;
  let sendBackward;
  let bringToFront;
  let sendToBack;
  let undo;
  let redo;
  let copySelectedObjects;
  let cutSelectedObjects;
  let pasteObjects;
  let zoomIn;
  let zoomOut;
  let resetZoom;
  let toggleGrid;
  
  // State variables
  let hasSelectedObject = false;
  let canUndo = false;
  let canRedo = false;
  
  // Create a shared context for toolbar components
  const toolbarContext = createToolbarContext({
    hasSelectedObject,
    canUndo,
    canRedo,
    lastSelectedTool: $activeTool
  });
  
  // Initialize using services
  function initializeServices(component) {
    if (!component) return;
    
    // We still need getCanvas for some operations
    getCanvas = component.getCanvas;
    
    // Use layerService for layer operations
    bringForward = layerService.bringForward;
    sendBackward = layerService.sendBackward;
    bringToFront = layerService.bringToFront;
    sendToBack = layerService.sendToBack;
    
    // Use historyService for undo/redo
    undo = historyService.undo;
    redo = historyService.redo;
    
    // Use objectService for object manipulation
    copySelectedObjects = objectService.copySelectedObjects;
    cutSelectedObjects = objectService.cutSelectedObjects;
    pasteObjects = objectService.pasteObjects;
    
    // Log available functions for debugging
    console.log("Toolbar initialized with services:", {
      layerService: layerService.initialized ? 'initialized' : 'not initialized',
      objectService: objectService.initialized ? 'initialized' : 'not initialized',
      historyService: historyService.initialized ? 'initialized' : 'not initialized',
      toolService: toolService.initialized ? 'initialized' : 'not initialized'
    });
  }
  
  // Update selection state
  function updateSelectionState() {
    const canvas = getCanvas && getCanvas();
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    hasSelectedObject = !!activeObject;
    
    // Update shared context
    toolbarContext.hasSelectedObject = hasSelectedObject;
    
    console.log(`Selection state updated, hasSelectedObject: ${hasSelectedObject}`);
  }
  
  // Update history state
  // This can be called both as an event handler or directly from historyService
  function updateHistoryState(stateOrEvent) {
    // Handle both event format (from DOM events) and direct format (from historyService)
    let newCanUndo, newCanRedo;
    
    if (stateOrEvent && stateOrEvent.detail) {
      // It's a DOM event
      newCanUndo = stateOrEvent.detail.canUndo;
      newCanRedo = stateOrEvent.detail.canRedo;
    } else if (stateOrEvent && typeof stateOrEvent === 'object') {
      // It's a direct state object from historyService
      newCanUndo = stateOrEvent.canUndo;
      newCanRedo = stateOrEvent.canRedo;
    } else {
      // If no state provided, get it from historyService
      newCanUndo = historyService.canUndo();
      newCanRedo = historyService.canRedo();
    }
    
    // Update local state
    canUndo = newCanUndo;
    canRedo = newCanRedo;
    
    // Update shared context
    toolbarContext.canUndo = canUndo;
    toolbarContext.canRedo = canRedo;
    
    console.log(`History state updated, canUndo: ${canUndo}, canRedo: ${canRedo}`);
  }
  
  // Try to initialize canvas component
  let initTimer;
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 10;
  
  function tryInitializeCanvas() {
    if (!canvasComponent) {
      // Try again after a short delay
      if (initAttempts < MAX_INIT_ATTEMPTS) {
        initAttempts++;
        initTimer = setTimeout(tryInitializeCanvas, 100);
      } else {
        console.error('Failed to initialize canvas component after multiple attempts');
      }
      return;
    }
    
    // Check if the canvas component has the getCanvas function at minimum
    if (canvasComponent.getCanvas && typeof canvasComponent.getCanvas === 'function') {
      const fabricCanvas = canvasComponent.getCanvas();
      
      if (fabricCanvas) {
        // Check if services need initialization
        if (!layerService.initialized || !objectService.initialized || 
            !historyService.initialized || !toolService.initialized) {
          
          console.log("Initializing services that aren't already initialized");
          
          // Initialize any services that aren't already initialized
          if (!layerService.initialized) {
            layerService.initialize({ canvas: fabricCanvas });
          }
          
          if (!objectService.initialized) {
            objectService.initialize({ 
              canvas: fabricCanvas,
              generateId: () => 'obj-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
            });
          }
          
          if (!historyService.initialized) {
            historyService.initialize({ 
              canvas: fabricCanvas,
              onChange: updateHistoryState
            });
          }
          
          if (!toolService.initialized) {
            toolService.initialize({ canvas: fabricCanvas });
          }
        }
        
        // Now initialize the toolbar with services
        initializeServices(canvasComponent);
        
        // Set up canvas event listeners for selection state
        // Remove any existing listeners to prevent duplicates
        fabricCanvas.off('selection:created', updateSelectionState);
        fabricCanvas.off('selection:updated', updateSelectionState);
        fabricCanvas.off('selection:cleared', updateSelectionState);
        
        // Add listeners
        fabricCanvas.on('selection:created', updateSelectionState);
        fabricCanvas.on('selection:updated', updateSelectionState);
        fabricCanvas.on('selection:cleared', updateSelectionState);
      }
    } else {
      console.warn('Canvas component does not have the required getCanvas method');
    }
  }
  
  onMount(() => {
    // Start attempting to initialize the canvas
    tryInitializeCanvas();
    
    // Add history state change listener
    document.addEventListener('historyChange', updateHistoryState);
    
    return () => {
      // Clean up
      clearTimeout(initTimer);
      document.removeEventListener('historyChange', updateHistoryState);
      
      const canvas = getCanvas && getCanvas();
      if (canvas) {
        canvas.off('selection:created', updateSelectionState);
        canvas.off('selection:updated', updateSelectionState);
        canvas.off('selection:cleared', updateSelectionState);
      }
      
      // No need to clean up services here as they are singleton instances
      // that are cleaned up by the parent components, but we log for debugging
      console.log("Toolbar component unmounting");
    };
  });
  
  // Reactive statement to handle canvas component changes
  $: if (canvasComponent) {
    console.log("Canvas component updated:", canvasComponent);
    tryInitializeCanvas();
    
    // Update history state immediately if historyService is already initialized
    if (historyService.initialized) {
      updateHistoryState({
        canUndo: historyService.canUndo(),
        canRedo: historyService.canRedo()
      });
    }
  }
</script>

<div class="tools-panel">
  <!-- Drawing Tools -->
  <DrawingTools context={toolbarContext} />
  
  <!-- Layer Tools -->
  <LayerTools 
    context={toolbarContext}
    {hasSelectedObject}
    {bringForward}
    {sendBackward}
    {bringToFront}
    {sendToBack}
  />
  
  <!-- Edit Tools -->
  <EditTools 
    context={toolbarContext}
    {hasSelectedObject}
    {canUndo}
    {canRedo}
    {undo}
    {redo}
    {copySelectedObjects}
    {cutSelectedObjects}
    {pasteObjects}
  />
  
  <!-- View Tools -->
  <ViewTools 
    context={toolbarContext}
    {zoomIn}
    {zoomOut}
    {resetZoom}
    {toggleGrid}
  />
  
  <!-- Spacer to push canvas component to bottom -->
  <div class="flex-1"></div>
  
  <!-- Canvas Component -->
  <Canvas bind:this={canvasComponent} />
</div>

<style>
  .tools-panel {
    width: 11rem;
    background-color: theme('colors.gray.100');
    border-right: 1px solid theme('colors.gray.200');
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
</style>