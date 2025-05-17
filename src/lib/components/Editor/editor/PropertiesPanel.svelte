<script>
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { activeTool, ToolType, updateToolOptions } from '$lib/stores/toolbar';
  import TextEditingPanel from '$lib/components/Editor/TextEditingPanel.svelte';
  
  // Props
  export let selectedObject = null;
  export let selectedObjectType = null;
  export let canvasComponent = null;
  export let canUndo = false;
  export let canRedo = false;
  
  // Methods
  function handleUndo() {
    if (canvasComponent) {
      canvasComponent.undo();
    }
  }
  
  function handleRedo() {
    if (canvasComponent) {
      canvasComponent.redo();
    }
  }
  
  function handleDeleteObject() {
    if (canvasComponent) {
      canvasComponent.deleteSelectedObjects();
    }
  }
</script>

<div class="properties-panel">
  <h2 class="font-medium text-lg mb-4">Properties</h2>
  
  {#if selectedObjectType === 'textbox'}
    <!-- Text editing panel for selected textbox -->
    <TextEditingPanel 
      canvas={canvasComponent?.getCanvas()} 
      textObject={selectedObject} 
    />
  {:else}
    <!-- Default properties panels -->
    <div class="mb-4">
      <h3 class="font-medium mb-2">Document</h3>
      {#if $currentDocument}
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="text-gray-600">Format:</div>
          <div>{$currentDocument.format}</div>
          <div class="text-gray-600">Width:</div>
          <div>{$currentDocument.metadata.pageSize.width} mm</div>
          <div class="text-gray-600">Height:</div>
          <div>{$currentDocument.metadata.pageSize.height} mm</div>
          <div class="text-gray-600">Pages:</div>
          <div>{$currentDocument.pages.length}</div>
        </div>
      {/if}
    </div>
    
    <div class="mb-4">
      <h3 class="font-medium mb-2">Tool: {$activeTool}</h3>
      
      {#if $activeTool === 'select'}
        <p class="text-sm mb-2">Use select tool to manage objects</p>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn btn-sm btn-secondary" on:click={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))}>Delete</button>
          <button class="btn btn-sm btn-secondary" on:click={() => document.execCommand('copy')}>Copy</button>
        </div>
        
        <div class="mt-4">
          <h4 class="text-sm font-medium mb-2">Transform</h4>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn btn-sm btn-secondary" on:click={() => canvasComponent.bringForward()}>Bring Forward</button>
            <button class="btn btn-sm btn-secondary" on:click={() => canvasComponent.sendBackward()}>Send Backward</button>
            <button class="btn btn-sm btn-secondary" on:click={() => canvasComponent.bringToFront()}>Bring to Front</button>
            <button class="btn btn-sm btn-secondary" on:click={() => canvasComponent.sendToBack()}>Send to Back</button>
          </div>
        </div>
        
        <!-- Edit History Controls -->
        <div class="mt-4">
          <h4 class="text-sm font-medium mb-2">Edit</h4>
          <div class="grid grid-cols-3 gap-2">
            <button 
              class="btn btn-sm btn-secondary" 
              on:click={handleUndo} 
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a4 4 0 0 1 0 8H9" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10l5-5-5-5" />
              </svg>
              Undo
            </button>
            <button 
              class="btn btn-sm btn-secondary" 
              on:click={handleRedo} 
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a4 4 0 0 0 0 8h4" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10l-5-5 5-5" />
              </svg>
              Redo
            </button>
            <button 
              class="btn btn-sm btn-danger" 
              on:click={handleDeleteObject}
              title="Delete (Del)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      {/if}
      
      {#if $activeTool === 'text'}
        <div class="text-sm">
          <div class="mb-2">
            <label for="font-family-select" class="block text-gray-600">Font Family</label>
            <select 
              id="font-family-select"
              class="w-full border rounded px-2 py-1" 
              value="Arial"
              on:change={(e) => updateToolOptions('text', { fontFamily: e.target.value })}>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
          
          <div class="mb-2">
            <label for="font-size-input" class="block text-gray-600">Font Size</label>
            <input 
              id="font-size-input"
              type="number" 
              class="w-full border rounded px-2 py-1" 
              min="8" max="72" step="1" value="16"
              on:change={(e) => updateToolOptions('text', { fontSize: parseInt(e.target.value) })} />
          </div>
          
          <div class="mb-2">
            <span id="text-align-label" class="block text-gray-600">Text Align</span>
            <div class="flex gap-1" role="group" aria-labelledby="text-align-label">
              <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'left' })}>Left</button>
              <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'center' })}>Center</button>
              <button class="flex-1 btn btn-sm btn-secondary" on:click={() => updateToolOptions('text', { textAlign: 'right' })}>Right</button>
            </div>
          </div>
          
          <div class="mb-2">
            <span id="text-style-label" class="block text-gray-600">Style</span>
            <div class="flex gap-1" role="group" aria-labelledby="text-style-label">
              <button class="flex-1 btn btn-sm btn-secondary font-bold" on:click={() => updateToolOptions('text', { fontWeight: 'bold' })} aria-label="Bold">B</button>
              <button class="flex-1 btn btn-sm btn-secondary italic" on:click={() => updateToolOptions('text', { fontStyle: 'italic' })} aria-label="Italic">I</button>
              <button class="flex-1 btn btn-sm btn-secondary underline" on:click={() => updateToolOptions('text', { textDecoration: 'underline' })} aria-label="Underline">U</button>
            </div>
          </div>
        </div>
      {/if}
      
      {#if $activeTool === 'image'}
        <div class="text-sm">
          <p class="mb-2">Click on canvas to add an image</p>
          <div class="flex items-center mb-2">
            <input type="checkbox" id="preserveAspect" checked
               on:change={(e) => updateToolOptions('image', { preserveAspectRatio: e.target.checked })} />
            <label for="preserveAspect" class="ml-2">Preserve aspect ratio</label>
          </div>
        </div>
      {/if}
      
      {#if $activeTool === 'rectangle' || $activeTool === 'ellipse' || $activeTool === 'line'}
        <div class="text-sm">
          <div class="mb-2">
            <label for="fill-color-input" class="block text-gray-600">Fill Color</label>
            <input 
              id="fill-color-input"
              type="color" 
              class="w-full border rounded px-2 py-1" 
              value="#ffffff"
              on:change={(e) => updateToolOptions($activeTool, { fill: e.target.value })} />
          </div>
          
          <div class="mb-2">
            <label for="stroke-color-input" class="block text-gray-600">Stroke Color</label>
            <input 
              id="stroke-color-input"
              type="color" 
              class="w-full border rounded px-2 py-1" 
              value="#000000"
              on:change={(e) => updateToolOptions($activeTool, { stroke: e.target.value })} />
          </div>
          
          <div class="mb-2">
            <label for="stroke-width-input" class="block text-gray-600">Stroke Width</label>
            <input 
              id="stroke-width-input"
              type="number" 
              class="w-full border rounded px-2 py-1" 
              min="0" max="20" step="1" value="1"
              on:change={(e) => updateToolOptions($activeTool, { strokeWidth: parseInt(e.target.value) })} />
          </div>
          
          {#if $activeTool === 'rectangle'}
            <div class="mb-2">
              <label for="corner-radius-input" class="block text-gray-600">Corner Radius</label>
              <input 
                id="corner-radius-input"
                type="number" 
                class="w-full border rounded px-2 py-1" 
                min="0" max="50" step="1" value="0"
                on:change={(e) => updateToolOptions('rectangle', { cornerRadius: parseInt(e.target.value) })} />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>