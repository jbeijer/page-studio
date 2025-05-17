<script>
  // Import dependencies
  import { onMount, onDestroy } from 'svelte';
  
  // Component props
  export let context = null;
  export let hasSelectedObject = false;
  export let canUndo = false;
  export let canRedo = false;
  
  // Canvas functions coming from parent
  export let undo = null;
  export let redo = null;
  export let copySelectedObjects = null;
  export let cutSelectedObjects = null;
  export let pasteObjects = null;
  
  // Edit operation handlers
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
  
  function handleCopy() {
    if (typeof copySelectedObjects === 'function' && hasSelectedObject) {
      copySelectedObjects();
    } else if (!hasSelectedObject) {
      console.warn('No object selected to copy');
    } else {
      console.error('copySelectedObjects function is not available');
    }
  }
  
  function handleCut() {
    if (typeof cutSelectedObjects === 'function' && hasSelectedObject) {
      cutSelectedObjects();
    } else if (!hasSelectedObject) {
      console.warn('No object selected to cut');
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
  
  // Register keyboard shortcuts for edit operations
  function handleKeyDown(event) {
    // Skip if element is an input or contenteditable
    if (
      event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable
    ) {
      return;
    }
    
    // Handle keyboard shortcuts for edit operations
    if (event.ctrlKey) {
      if (event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (event.key === 'y') {
        event.preventDefault();
        handleRedo();
      } else if (event.key === 'c') {
        if (hasSelectedObject) {
          event.preventDefault();
          handleCopy();
        }
      } else if (event.key === 'x') {
        if (hasSelectedObject) {
          event.preventDefault();
          handleCut();
        }
      } else if (event.key === 'v') {
        event.preventDefault();
        handlePaste();
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

<div class="edit-tools">
  <h2 class="text-xs font-semibold px-2 pb-1 text-gray-500 uppercase">Edit</h2>
  
  <!-- History Controls -->
  <div class="flex flex-col space-y-1 mb-4">
    <button 
      class="tool-button {!canUndo ? 'tool-button-disabled' : ''}" 
      title="Undo (Ctrl+Z)"
      on:click={handleUndo}
      disabled={!canUndo}
      data-testid="edit-undo"
      aria-label="Undo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 0 1 5 5v2m0-7l-4-4m4 4L10 6" />
      </svg>
      Undo
    </button>
    
    <button 
      class="tool-button {!canRedo ? 'tool-button-disabled' : ''}" 
      title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
      on:click={handleRedo}
      disabled={!canRedo}
      data-testid="edit-redo"
      aria-label="Redo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h-4a5 5 0 0 0-5 5v2m0-7l4-4m-4 4l4 4" />
      </svg>
      Redo
    </button>
  </div>
  
  <!-- Edit Controls - Copy/Cut/Paste -->
  <div class="flex flex-col space-y-1">
    <button 
      class="tool-button" 
      title="Copy (Ctrl+C)"
      on:click={handleCopy}
      disabled={!hasSelectedObject}
      data-testid="edit-copy"
      aria-label="Copy"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
      Copy
    </button>
    
    <button 
      class="tool-button" 
      title="Cut (Ctrl+X)"
      on:click={handleCut}
      disabled={!hasSelectedObject}
      data-testid="edit-cut"
      aria-label="Cut"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
      Cut
    </button>
    
    <button 
      class="tool-button" 
      title="Paste (Ctrl+V)"
      on:click={handlePaste}
      data-testid="edit-paste"
      aria-label="Paste"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      Paste
    </button>
  </div>
</div>

<style>
  .edit-tools {
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
  
  .tool-button:disabled,
  .tool-button-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f5f5f5;
    pointer-events: none;
  }
</style>