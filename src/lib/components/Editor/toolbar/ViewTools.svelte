<script>
  import { onMount, onDestroy } from 'svelte';
  import GridConfigPanel from '../GridConfigPanel.svelte';
  import { createDropdownToggle } from './toolbar.utils.js';
  
  // Component props
  export let context = null;
  
  // View state
  let showGridConfig = false;
  let currentZoom = 100;
  
  // Toggle functions
  const toggleGridConfig = createDropdownToggle({ showGridConfig }, 'showGridConfig');
  
  // Canvas functions
  export let zoomIn = null;
  export let zoomOut = null;
  export let resetZoom = null;
  export let toggleGrid = null;
  
  // Handle zoom operations
  function handleZoomIn() {
    if (typeof zoomIn === 'function') {
      zoomIn();
      currentZoom = Math.min(currentZoom + 25, 400);
    } else {
      console.error('zoomIn function is not available');
    }
  }
  
  function handleZoomOut() {
    if (typeof zoomOut === 'function') {
      zoomOut();
      currentZoom = Math.max(currentZoom - 25, 25);
    } else {
      console.error('zoomOut function is not available');
    }
  }
  
  function handleResetZoom() {
    if (typeof resetZoom === 'function') {
      resetZoom();
      currentZoom = 100;
    } else {
      console.error('resetZoom function is not available');
    }
  }
  
  // Register keyboard shortcuts for view operations
  function handleKeyDown(event) {
    // Skip if element is an input or contenteditable
    if (
      event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable
    ) {
      return;
    }
    
    // Handle keyboard shortcuts for zoom operations
    if (event.ctrlKey) {
      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        handleZoomIn();
      } else if (event.key === '-') {
        event.preventDefault();
        handleZoomOut();
      } else if (event.key === '0') {
        event.preventDefault();
        handleResetZoom();
      }
    }
  }
  
  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
</script>

<div class="view-tools">
  <h2 class="text-xs font-semibold px-2 pb-1 text-gray-500 uppercase">View</h2>
  
  <div class="flex flex-col space-y-1">
    <!-- Zoom controls -->
    <div class="zoom-controls flex space-x-1 mb-2">
      <button 
        class="tool-button" 
        title="Zoom In (Ctrl++)" 
        on:click={handleZoomIn}
        data-testid="tool-zoom-in" 
        aria-label="Zoom In"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>
      
      <button 
        class="tool-button" 
        title="Zoom Out (Ctrl+-)" 
        on:click={handleZoomOut}
        data-testid="tool-zoom-out" 
        aria-label="Zoom Out"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>
      
      <div class="zoom-percentage">
        <span>{currentZoom}%</span>
      </div>
    </div>
    
    <!-- Grid & Guides -->
    <button 
      class="tool-button {showGridConfig ? 'tool-button-active' : ''}" 
      title="Grid & Guides" 
      data-testid="tool-grid" 
      aria-label="Grid & Guides"
      on:click={toggleGridConfig}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5v14M9 5v14M14 5v14M19 5v14M4 9h15M4 14h15" />
      </svg>
      Grid & Guides
    </button>
    
    {#if showGridConfig}
      <div class="grid-config-wrapper">
        <GridConfigPanel />
      </div>
    {/if}
  </div>
</div>

<style>
  .view-tools {
    padding: 10px;
    border-bottom: 1px solid #eaeaea;
  }
  
  .tool-button {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background-color: white;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 14px;
    color: #4a5568;
    transition: all 0.2s;
    cursor: pointer;
  }
  
  .tool-button:hover {
    background-color: #f7fafc;
  }
  
  .tool-button-active {
    background-color: #ebf8ff;
    border-color: #90cdf4;
    color: #2b6cb0;
  }
  
  .zoom-controls {
    display: flex;
    align-items: center;
  }
  
  .zoom-percentage {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    font-size: 14px;
    color: #4a5568;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    min-width: 60px;
    height: 38px;
  }
  
  .grid-config-wrapper {
    margin-top: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    background-color: white;
    padding: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
</style>