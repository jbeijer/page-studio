# Service Usage Examples

This document provides examples of how to use the new centralized services in different components.

## Example: Editor Page Component

Here's how you can use the services in an editor page component:

```svelte
<script>
  import { onMount } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import Canvas from '$lib/components/Editor/Canvas.refactored.svelte';
  import Toolbar from '$lib/components/Editor/Toolbar.svelte';
  import PropertiesPanel from '$lib/components/Editor/editor/PropertiesPanel.svelte';
  import { documentService } from '$lib/services';
  
  // Document info
  let documentTitle = '';
  let canvasComponent;
  
  // Handle document title updates
  $: if ($currentDocument) {
    documentTitle = $currentDocument.title || 'Untitled Document';
  }
  
  // Initialize a new document if none exists
  onMount(async () => {
    // Check if we have a document ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');
    
    if (docId) {
      // Load existing document
      await documentService.loadDocumentById(docId);
    } else if (!$currentDocument) {
      // Create a new document
      await documentService.createNewDocument({
        title: 'Untitled Document',
        format: 'A4',
        pageCount: 1
      });
    }
  });
  
  // Handle document title changes
  function handleTitleChange(event) {
    documentTitle = event.target.value;
    documentService.updateDocumentTitle(documentTitle);
  }
  
  // Handle adding a new page
  function handleAddPage() {
    documentService.addPage();
  }
</script>

<div class="editor-layout">
  <header class="editor-header">
    <div class="document-title">
      <input
        type="text"
        bind:value={documentTitle}
        on:change={handleTitleChange}
        placeholder="Document Title"
      />
    </div>
    
    <div class="header-actions">
      <button on:click={() => documentService.forceSave()}>Save</button>
      <button on:click={() => documentService.exportPDF()}>Export PDF</button>
    </div>
  </header>
  
  <div class="main-content">
    <Toolbar />
    
    <div class="canvas-area">
      <Canvas bind:this={canvasComponent} />
    </div>
    
    <PropertiesPanel />
  </div>
  
  <footer class="editor-footer">
    <button on:click={handleAddPage}>Add Page</button>
    
    <div class="page-navigation">
      {#if $currentDocument && $currentDocument.pages}
        {#each $currentDocument.pages as page, index}
          <button 
            class={page.id === $currentPage ? 'active' : ''}
            on:click={() => currentPage.set(page.id)}
          >
            {index + 1}
          </button>
        {/each}
      {/if}
    </div>
  </footer>
</div>
```

## Example: Using MasterPageService

Here's how to work with master pages:

```svelte
<script>
  import { masterPageService } from '$lib/services';
  import { currentDocument } from '$lib/stores/document';
  
  // Master pages list
  $: masterPages = $currentDocument?.masterPages || [];
  
  // Create a new master page
  async function createMasterPage() {
    const masterPageId = await masterPageService.createMasterPage({
      title: 'New Master Page'
    });
    
    // Load the master page for editing
    await masterPageService.loadMasterPage(masterPageId);
  }
  
  // Apply a master page to the current page
  function applyMasterPage(masterId) {
    masterPageService.applyMasterPage(currentPage, masterId);
  }
  
  // Save changes to a master page
  function saveMasterPage(masterId) {
    masterPageService.saveMasterPage(masterId);
  }
</script>

<div class="master-page-panel">
  <h2>Master Pages</h2>
  
  <button on:click={createMasterPage}>Create New Master Page</button>
  
  <ul class="master-page-list">
    {#each masterPages as master}
      <li>
        <span>{master.title}</span>
        <button on:click={() => applyMasterPage(master.id)}>Apply</button>
        <button on:click={() => masterPageService.loadMasterPage(master.id)}>Edit</button>
        <button on:click={() => masterPageService.deleteMasterPage(master.id)}>Delete</button>
      </li>
    {/each}
  </ul>
</div>
```

## Example: Creating Objects with CanvasService

Here's how to use CanvasService for object creation:

```svelte
<script>
  import { canvasService } from '$lib/services';
  import { get } from 'svelte/store';
  import { canvasReady } from '$lib/stores/canvasReady';
  
  // Create a text box
  function createTextBox() {
    if (get(canvasReady)) {
      canvasService.createObject('textbox', {
        left: 100,
        top: 100,
        width: 200,
        text: 'New Text Box',
        fontSize: 16,
        fontFamily: 'Arial'
      });
    }
  }
  
  // Create a rectangle
  function createRectangle() {
    if (get(canvasReady)) {
      canvasService.createObject('rect', {
        left: 150,
        top: 150,
        width: 100,
        height: 100,
        fill: '#e2e2e2',
        stroke: '#000000',
        strokeWidth: 1
      });
    }
  }
  
  // Create an image from URL
  function createImage(url) {
    if (get(canvasReady)) {
      canvasService.createObject('image', {
        src: url,
        left: 200,
        top: 200
      });
    }
  }
</script>

<div class="object-creation-panel">
  <button on:click={createTextBox}>Add Text</button>
  <button on:click={createRectangle}>Add Rectangle</button>
  <button on:click={() => createImage('/images/logo.png')}>Add Logo</button>
</div>
```

## Example: Object Manipulation

Here's an example of how to manipulate objects:

```svelte
<script>
  import { canvasService } from '$lib/services';
  
  // Layer management
  function bringForward() {
    canvasService.bringForward();
  }
  
  function sendBackward() {
    canvasService.sendBackward();
  }
  
  function bringToFront() {
    canvasService.bringToFront();
  }
  
  function sendToBack() {
    canvasService.sendToBack();
  }
  
  // Copy, cut, paste
  function copySelected() {
    canvasService.copySelectedObjects();
  }
  
  function cutSelected() {
    canvasService.copySelectedObjects();
    canvasService.deleteSelectedObjects();
  }
  
  function pasteObjects() {
    canvasService.pasteObjects();
  }
  
  // Delete selected objects
  function deleteSelected() {
    canvasService.deleteSelectedObjects();
  }
</script>

<div class="object-tools">
  <div class="layer-tools">
    <button on:click={bringToFront}>Bring to Front</button>
    <button on:click={bringForward}>Bring Forward</button>
    <button on:click={sendBackward}>Send Backward</button>
    <button on:click={sendToBack}>Send to Back</button>
  </div>
  
  <div class="edit-tools">
    <button on:click={copySelected}>Copy</button>
    <button on:click={cutSelected}>Cut</button>
    <button on:click={pasteObjects}>Paste</button>
    <button on:click={deleteSelected}>Delete</button>
  </div>
</div>
```

## Best Practices When Using Services

1. **Import Services Only When Needed**: Only import the services you need in each component

2. **Use Svelte Stores with Services**: The services work with Svelte stores for reactive state

3. **Check Canvas Readiness**: Before performing canvas operations, check that the canvas is ready using:
   ```javascript
   import { get } from 'svelte/store';
   import { canvasReady } from '$lib/stores/canvasReady';
   
   if (get(canvasReady)) {
     // Perform canvas operations
   }
   ```

4. **Cleanup on Component Destruction**:
   ```javascript
   onDestroy(() => {
     // If this component initialized any services, clean them up
     documentService.cleanup();
     canvasService.cleanup();
     masterPageService.cleanup();
   });
   ```

5. **Error Handling**: Services handle most errors internally, but you can also wrap service calls in try/catch blocks for component-specific error handling.

By using these services, you'll benefit from improved code organization, reduced duplication, and better separation of concerns.