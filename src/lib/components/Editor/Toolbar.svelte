<script>
  import { onMount, onDestroy } from 'svelte';
  import { activeTool } from '$lib/stores/toolbar';
  import Canvas from './Canvas.svelte';
  
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
  
  // Initialize from canvas component
  function initializeFromCanvas(component) {
    if (!component) return;
    
    // Get access to canvas functions
    getCanvas = component.getCanvas;
    bringForward = component.bringForward;
    sendBackward = component.sendBackward;
    bringToFront = component.bringToFront;
    sendToBack = component.sendToBack;
    undo = component.undo;
    redo = component.redo;
    copySelectedObjects = component.copySelectedObjects;
    cutSelectedObjects = component.cutSelectedObjects;
    pasteObjects = component.pasteObjects;
    
    // Log available functions for debugging
    console.log("Toolbar initialized with canvas functions:", {
      getCanvas: typeof getCanvas,
      bringForward: typeof bringForward,
      sendBackward: typeof sendBackward,
      bringToFront: typeof bringToFront,
      sendToBack: typeof sendToBack,
      undo: typeof undo,
      redo: typeof redo,
      copySelectedObjects: typeof copySelectedObjects,
      cutSelectedObjects: typeof cutSelectedObjects,
      pasteObjects: typeof pasteObjects
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
  function updateHistoryState(event) {
    const { canUndo: newCanUndo, canRedo: newCanRedo } = event.detail;
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
    
    // Check if the component has the necessary functions
    if (canvasComponent.undo && typeof canvasComponent.undo === 'function' && 
        canvasComponent.getCanvas && typeof canvasComponent.getCanvas === 'function' &&
        canvasComponent.saveCurrentPage && typeof canvasComponent.saveCurrentPage === 'function') {
      
      initializeFromCanvas(canvasComponent);
      
      // Set up canvas event listeners
      const fabricCanvas = canvasComponent.getCanvas();
      if (fabricCanvas) {
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
      console.warn('Canvas component does not have all the required methods');
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
    };
  });
  
  // Reactive statement to handle canvas component changes
  $: if (canvasComponent) {
    console.log("Canvas component updated:", canvasComponent);
    tryInitializeCanvas();
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