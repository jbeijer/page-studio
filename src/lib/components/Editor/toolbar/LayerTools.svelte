<script>
  // Import dependencies
  import { onMount, onDestroy } from 'svelte';
  
  // Component props
  export let context = null;
  export let hasSelectedObject = false;

  // Canvas functions coming from parent
  export let bringForward = null;
  export let sendBackward = null;
  export let bringToFront = null;
  export let sendToBack = null;
  
  // Layer operation handlers
  function handleBringForward() {
    if (bringForward && typeof bringForward === 'function') {
      bringForward();
    } else {
      console.error('bringForward function is not available');
    }
  }
  
  function handleSendBackward() {
    if (sendBackward && typeof sendBackward === 'function') {
      sendBackward();
    } else {
      console.error('sendBackward function is not available');
    }
  }
  
  function handleBringToFront() {
    if (bringToFront && typeof bringToFront === 'function') {
      bringToFront();
    } else {
      console.error('bringToFront function is not available');
    }
  }
  
  function handleSendToBack() {
    if (sendToBack && typeof sendToBack === 'function') {
      sendToBack();
    } else {
      console.error('sendToBack function is not available');
    }
  }
  
  // Register keyboard shortcuts for layer operations
  function handleKeyDown(event) {
    // Skip if element is an input or contenteditable
    if (
      event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable
    ) {
      return;
    }
    
    // Handle keyboard shortcuts for layer operations
    if (event.ctrlKey) {
      if (event.key === ']') {
        event.preventDefault();
        if (event.shiftKey) {
          handleBringToFront();
        } else {
          handleBringForward();
        }
      } else if (event.key === '[') {
        event.preventDefault();
        if (event.shiftKey) {
          handleSendToBack();
        } else {
          handleSendBackward();
        }
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

<div class="layer-tools" class:disabled={!hasSelectedObject}>
  <h2 class="text-xs font-semibold px-2 pb-1 text-gray-500 uppercase">Arrange</h2>
  
  <div class="flex flex-col space-y-1">
    <button 
      class="tool-button" 
      title="Bring to Front (Ctrl+Shift+])"
      on:click={handleBringToFront}
      disabled={!hasSelectedObject}
      data-testid="layer-bring-to-front"
      aria-label="Bring to Front"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19h14M5 15h14M5 11h14M5 7h14M5 3h14" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 11l-5-5-5 5" />
      </svg>
      Bring to Front
    </button>
    
    <button 
      class="tool-button" 
      title="Bring Forward (Ctrl+])"
      on:click={handleBringForward}
      disabled={!hasSelectedObject}
      data-testid="layer-bring-forward"
      aria-label="Bring Forward"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15h14M5 11h14M5 7h14" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 11l-5-5-5 5" />
      </svg>
      Bring Forward
    </button>
    
    <button 
      class="tool-button" 
      title="Send Backward (Ctrl+[)"
      on:click={handleSendBackward}
      disabled={!hasSelectedObject}
      data-testid="layer-send-backward"
      aria-label="Send Backward"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15h14M5 11h14M5 7h14" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 15l-5 5-5-5" />
      </svg>
      Send Backward
    </button>
    
    <button 
      class="tool-button" 
      title="Send to Back (Ctrl+Shift+[)"
      on:click={handleSendToBack}
      disabled={!hasSelectedObject}
      data-testid="layer-send-to-back"
      aria-label="Send to Back"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19h14M5 15h14M5 11h14M5 7h14M5 3h14" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 15l-5 5-5-5" />
      </svg>
      Send to Back
    </button>
  </div>
</div>

<style>
  .layer-tools {
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
  
  .tool-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f5f5f5;
  }
  
  .disabled button {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
</style>