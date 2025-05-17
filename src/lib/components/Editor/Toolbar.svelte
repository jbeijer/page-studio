<script>
  import { onMount, onDestroy } from 'svelte';
  import { activeTool, ToolType, setActiveTool } from '$lib/stores/toolbar';
  import Canvas from './Canvas.svelte';
  
  // References to functions to be obtained from Canvas component instance
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
  
  // Initialize canvas component reference
  let canvasComponent;
  
  // Map of tool types to their icons and tooltips
  const toolConfig = {
    [ToolType.SELECT]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>`,
      tooltip: 'Select Tool (V)'
    },
    [ToolType.TEXT]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>`,
      tooltip: 'Text Tool (T)'
    },
    [ToolType.IMAGE]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>`,
      tooltip: 'Image Tool (I)'
    },
    [ToolType.RECTANGLE]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            </svg>`,
      tooltip: 'Rectangle Tool (R)'
    },
    [ToolType.ELLIPSE]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2" />
            </svg>`,
      tooltip: 'Ellipse Tool (E)'
    },
    [ToolType.LINE]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19l14-14" />
            </svg>`,
      tooltip: 'Line Tool (L)'
    }
  };
  
  // Tool keyboard shortcuts
  const keyboardShortcuts = {
    'v': ToolType.SELECT,
    't': ToolType.TEXT,
    'i': ToolType.IMAGE,
    'r': ToolType.RECTANGLE,
    'e': ToolType.ELLIPSE,
    'l': ToolType.LINE
  };
  
  // State for object selection and history
  let hasSelectedObject = false;
  let canUndo = false;
  let canRedo = false;
  
  function handleToolClick(toolType) {
    setActiveTool(toolType);
  }
  
  // History management
  function handleUndo() {
    if (typeof undo === 'function') {
      undo();
    } else {
      console.error('undo function is not available');
    }
  }
  
  function handleRedo() {
    if (typeof redo === 'function') {
      redo();
    } else {
      console.error('redo function is not available');
    }
  }
  
  // Copy/paste management
  function handleCopy() {
    if (typeof copySelectedObjects === 'function') {
      copySelectedObjects();
    } else {
      console.error('copySelectedObjects function is not available');
    }
  }
  
  function handleCut() {
    if (typeof cutSelectedObjects === 'function') {
      cutSelectedObjects();
    } else {
      console.error('cutSelectedObjects function is not available');
    }
  }
  
  function handlePaste() {
    if (typeof pasteObjects === 'function') {
      pasteObjects();
    } else {
      console.error('pasteObjects function is not available');
    }
  }
  
  function handleBringForward() {
    if (typeof bringForward === 'function') {
      bringForward();
    } else {
      console.error('bringForward function is not available');
    }
  }
  
  function handleSendBackward() {
    if (typeof sendBackward === 'function') {
      sendBackward();
    } else {
      console.error('sendBackward function is not available');
    }
  }
  
  function handleBringToFront() {
    if (typeof bringToFront === 'function') {
      bringToFront();
    } else {
      console.error('bringToFront function is not available');
    }
  }
  
  function handleSendToBack() {
    if (typeof sendToBack === 'function') {
      sendToBack();
    } else {
      console.error('sendToBack function is not available');
    }
  }
  
  // Check if there is a selected object to enable/disable layer controls
  function updateSelectionState() {
    if (!getCanvas) return;
    
    const canvas = getCanvas();
    if (canvas) {
      hasSelectedObject = !!canvas.getActiveObject() && 
                         (!canvas.getActiveObject().fromMaster || 
                           canvas.getActiveObject().fromMaster === false);
    } else {
      hasSelectedObject = false;
    }
  }
  
  // Update undo/redo state from Canvas events
  function updateHistoryState(event) {
    if (event && event.detail) {
      canUndo = event.detail.canUndo;
      canRedo = event.detail.canRedo;
    }
  }
  
  // Set up keyboard event listener for tool shortcuts
  function handleKeyDown(event) {
    // Only process if not in a text input or similar
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.isContentEditable) {
      return;
    }
    
    const key = event.key.toLowerCase();
    if (keyboardShortcuts[key]) {
      setActiveTool(keyboardShortcuts[key]);
      event.preventDefault();
    }
    
    // Layer order keyboard shortcuts
    if (hasSelectedObject && event.ctrlKey) {
      if (event.key === ']') {
        // Ctrl+] = Bring Forward
        handleBringForward();
        event.preventDefault();
      } else if (event.key === '[') {
        // Ctrl+[ = Send Backward
        handleSendBackward();
        event.preventDefault();
      } else if (event.key === '}' || (event.shiftKey && event.key === ']')) {
        // Ctrl+Shift+] or Ctrl+} = Bring to Front
        handleBringToFront();
        event.preventDefault();
      } else if (event.key === '{' || (event.shiftKey && event.key === '[')) {
        // Ctrl+Shift+[ or Ctrl+{ = Send to Back
        handleSendToBack();
        event.preventDefault();
      }
    }
  }
  
  // This function will be called when the Canvas component is ready
  function initializeFromCanvas(canvas) {
    console.log('Initializing from canvas:', canvas);
    
    // Verify the component has all required functions
    if (!canvas) {
      console.error('Canvas component is null or undefined');
      return;
    }
    
    // Get function references from Canvas component
    getCanvas = typeof canvas.getCanvas === 'function' ? canvas.getCanvas : null;
    bringForward = typeof canvas.bringForward === 'function' ? canvas.bringForward : null;
    sendBackward = typeof canvas.sendBackward === 'function' ? canvas.sendBackward : null;
    bringToFront = typeof canvas.bringToFront === 'function' ? canvas.bringToFront : null;
    sendToBack = typeof canvas.sendToBack === 'function' ? canvas.sendToBack : null;
    undo = typeof canvas.undo === 'function' ? canvas.undo : null;
    redo = typeof canvas.redo === 'function' ? canvas.redo : null;
    copySelectedObjects = typeof canvas.copySelectedObjects === 'function' ? canvas.copySelectedObjects : null;
    cutSelectedObjects = typeof canvas.cutSelectedObjects === 'function' ? canvas.cutSelectedObjects : null;
    pasteObjects = typeof canvas.pasteObjects === 'function' ? canvas.pasteObjects : null;
    
    console.log('Initialized function references:', {
      getCanvas: !!getCanvas,
      undo: !!undo,
      redo: !!redo,
      bringForward: !!bringForward,
      sendBackward: !!sendBackward,
      bringToFront: !!bringToFront,
      sendToBack: !!sendToBack,
      copySelectedObjects: !!copySelectedObjects,
      cutSelectedObjects: !!cutSelectedObjects,
      pasteObjects: !!pasteObjects
    });
    
    // Update selection state now that we have the canvas functions
    updateSelectionState();
  }
  
  // Add keyboard event listener on component mount
  function handleMount() {
    window.addEventListener('keydown', handleKeyDown);
    
    // Listen for history changes
    document.addEventListener('historyChange', updateHistoryState);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('historyChange', updateHistoryState);
      
      const canvas = getCanvas && getCanvas();
      if (canvas) {
        canvas.off('selection:created', updateSelectionState);
        canvas.off('selection:updated', updateSelectionState);
        canvas.off('selection:cleared', updateSelectionState);
      }
    };
  }
  
  // Use onMount to handle initialization after component is mounted
  
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
      // Try again after a short delay
      if (initAttempts < MAX_INIT_ATTEMPTS) {
        initAttempts++;
        initTimer = setTimeout(tryInitializeCanvas, 100);
      } else {
        console.error('Failed to initialize canvas component - missing required functions');
      }
    }
  }
  
  // This function gets called when the canvasComponent is bound
  $: if (canvasComponent) {
    console.log('Canvas component changed:', canvasComponent);
    console.log('Available functions:', Object.keys(canvasComponent));
    
    // Clear any existing timer
    if (initTimer) {
      clearTimeout(initTimer);
    }
    
    // Reset attempts counter
    initAttempts = 0;
    
    // Try to initialize
    tryInitializeCanvas();
  }
  
  // Clean up on component unmount
  onDestroy(() => {
    if (initTimer) {
      clearTimeout(initTimer);
    }
  });
</script>

<div class="tools-panel" use:handleMount>
  {#each Object.entries(toolConfig) as [toolType, config]}
    <button
      class="tool-button {$activeTool === toolType ? 'tool-button-active' : ''}"
      title={config.tooltip}
      on:click={() => handleToolClick(toolType)}
      aria-label={config.tooltip}
      data-testid={`tool-${toolType}`}
    >
      {@html config.icon}
    </button>
  {/each}
  
  <!-- Layer ordering controls -->
  <div class="layer-controls border-t border-gray-200 pt-2 mt-2">
    <button 
      class="tool-button {!hasSelectedObject ? 'tool-button-disabled' : ''}" 
      title="Bring to Front (Ctrl+Shift+])"
      on:click={handleBringToFront}
      disabled={!hasSelectedObject}
      data-testid="layer-bring-to-front"
      aria-label="Bring to Front"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15h14M5 19h14M5 11h14M5 7h14M5 3h14" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 11l-5-5-5 5" />
      </svg>
    </button>
    
    <button 
      class="tool-button {!hasSelectedObject ? 'tool-button-disabled' : ''}" 
      title="Bring Forward (Ctrl+])"
      on:click={handleBringForward}
      disabled={!hasSelectedObject}
      data-testid="layer-bring-forward"
      aria-label="Bring Forward"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15h14M5 11h14M5 7h14" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 11l-5-5-5 5" />
      </svg>
    </button>
    
    <button 
      class="tool-button {!hasSelectedObject ? 'tool-button-disabled' : ''}" 
      title="Send Backward (Ctrl+[)"
      on:click={handleSendBackward}
      disabled={!hasSelectedObject}
      data-testid="layer-send-backward"
      aria-label="Send Backward"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15h14M5 11h14M5 7h14" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 15l-5 5-5-5" />
      </svg>
    </button>
    
    <button 
      class="tool-button {!hasSelectedObject ? 'tool-button-disabled' : ''}" 
      title="Send to Back (Ctrl+Shift+[)"
      on:click={handleSendToBack}
      disabled={!hasSelectedObject}
      data-testid="layer-send-to-back"
      aria-label="Send to Back"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19h14M5 15h14M5 11h14M5 7h14M5 3h14" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 15l-5 5-5-5" />
      </svg>
    </button>
  </div>
  
  <div class="flex-1"></div>
  
  <!-- Edit Controls - Copy/Cut/Paste -->
  <div class="tool-group border-t border-gray-200 pt-2 mt-2">
    <button 
      class="tool-button {!hasSelectedObject ? 'tool-button-disabled' : ''}" 
      title="Copy (Ctrl+C)"
      on:click={handleCopy}
      disabled={!hasSelectedObject}
      data-testid="edit-copy"
      aria-label="Copy"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    </button>
    
    <button 
      class="tool-button {!hasSelectedObject ? 'tool-button-disabled' : ''}" 
      title="Cut (Ctrl+X)"
      on:click={handleCut}
      disabled={!hasSelectedObject}
      data-testid="edit-cut"
      aria-label="Cut"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    </button>
    
    <button 
      class="tool-button" 
      title="Paste (Ctrl+V)"
      on:click={handlePaste}
      data-testid="edit-paste"
      aria-label="Paste"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    </button>
  </div>
  
  <!-- History Controls - Undo/Redo -->
  <div class="tool-group border-t border-gray-200 pt-2 mt-2">
    <button 
      class="tool-button {!canUndo ? 'tool-button-disabled' : ''}" 
      title="Undo (Ctrl+Z)"
      on:click={handleUndo}
      disabled={!canUndo}
      data-testid="history-undo"
      aria-label="Undo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </button>
    
    <button 
      class="tool-button {!canRedo ? 'tool-button-disabled' : ''}" 
      title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
      on:click={handleRedo}
      disabled={!canRedo}
      data-testid="history-redo"
      aria-label="Redo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>
  </div>

  <!-- Fixed tools at bottom -->
  <button class="tool-button" title="Zoom In (Ctrl++)" data-testid="tool-zoom-in" aria-label="Zoom In">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  </button>
  
  <button class="tool-button" title="Zoom Out (Ctrl+-)" data-testid="tool-zoom-out" aria-label="Zoom Out">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  </button>
</div>

<style>
  .tools-panel {
    width: 4rem;
    background-color: theme('colors.gray.100');
    border-right: 1px solid theme('colors.gray.200');
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .tool-button {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    color: theme('colors.secondary.DEFAULT');
    transition: all 0.15s ease-in-out;
  }
  
  .tool-button:hover {
    background-color: theme('colors.gray.200');
  }
  
  .tool-button:active {
    background-color: theme('colors.gray.300');
  }
  
  .tool-button-active {
    background-color: theme('colors.primary.DEFAULT/0.1');
    color: theme('colors.primary.DEFAULT');
  }
  
  .tool-button-active:hover {
    background-color: theme('colors.primary.DEFAULT/0.2');
  }
  
  .tool-button-active:active {
    background-color: theme('colors.primary.DEFAULT/0.3');
  }
  
  .tool-button-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .tool-button-disabled:hover {
    background-color: transparent;
  }
  
  .layer-controls, .tool-group {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    gap: 0.5rem;
  }
</style>