# Page Component Refactoring Plan

## Current Issues
- The main editor page component (+page.svelte) is over 1000 lines
- Contains multiple UI panels and controls
- Handles too many responsibilities
- Makes maintenance and feature additions difficult

## Refactoring Goals
- Break down the large component into smaller, focused components
- Improve readability and maintainability
- Enable easier testing
- Follow single-responsibility principle
- Keep each component under 500 lines

## Proposed Component Structure

### 1. EditorPage.svelte (main page)
**Purpose**: Main container and coordinator
**Target size**: 300-400 lines
**Responsibilities**:
- Layout management
- Core component coordination
- Document loading/saving
- Main state management
- Router integration

### 2. EditorHeader.svelte
**Purpose**: Application header with controls
**Target size**: 150-200 lines
**Responsibilities**:
- Navigation controls (home button)
- Document title editing
- Save/Export controls
- Master page panel toggle
- Saving status indicators

### 3. EditorCanvas.svelte
**Purpose**: Canvas wrapper component
**Target size**: 50-100 lines
**Responsibilities**:
- Canvas initialization
- Canvas event handling
- Canvas size management
- Delegate to the refactored Canvas component

### 4. ObjectPropertiesPanel.svelte
**Purpose**: Right side properties panel
**Target size**: 250-300 lines
**Responsibilities**:
- Object property display and editing
- Different panels based on selection type
- Document metadata display
- Tool-specific property controls

### 5. TextPropertiesPanel.svelte
**Purpose**: Text-specific properties editor
**Target size**: 150-200 lines
**Responsibilities**:
- Text editing controls
- Font controls
- Text alignment
- Typography settings

### 6. DocumentInfoPanel.svelte
**Purpose**: Document metadata display
**Target size**: 100-150 lines
**Responsibilities**:
- Document format info
- Page size information
- Document statistics
- Document metadata display

### 7. EditControlsPanel.svelte
**Purpose**: Edit operation controls
**Target size**: 100-150 lines
**Responsibilities**:
- Edit history controls (undo/redo)
- Clipboard controls
- Layer controls duplicate from toolbar
- Selection management

### 8. PageNavigator.svelte
**Purpose**: Bottom page navigation
**Target size**: 150-200 lines
**Responsibilities**:
- Page thumbnails
- Page navigation
- Add page controls
- Master page application

### 9. SaveManager.js
**Purpose**: Document saving logic
**Target size**: 200-250 lines
**Responsibilities**:
- Auto-save functionality
- Save status management
- Force save implementation
- Verification logic

### 10. DocumentLoader.js
**Purpose**: Document loading logic
**Target size**: 200-250 lines
**Responsibilities**:
- Document loading from IndexedDB
- Document initialization
- Canvas state recovery
- Error handling

## Implementation Approach

### Phase 1: Create Component Structure
1. Create all component files with minimal implementations
2. Define props and events for each component
3. Set up shared state management

### Phase 2: Extract Components
1. Start with the simplest components (headers, page navigator)
2. Move relevant template sections to new components
3. Extract supporting functions to appropriate modules
4. Update bindings and references

### Phase 3: Extract Business Logic
1. Move document loading logic to DocumentLoader.js
2. Move saving logic to SaveManager.js
3. Ensure proper error handling and status updates

### Phase 4: Finalize
1. Update main page component to use all extracted components
2. Clean up any remaining code
3. Add typing and documentation
4. Test the refactored components

## Component Communication

### Prop Passing
- Pass essential data and callbacks as props
- Use TypeScript interfaces to define prop structures

### Event Handling
- Use Svelte's createEventDispatcher for component events
- Bubble important events up to the main coordinator

### Store Integration
- Use existing stores for global state
- Add component-specific stores where needed

## Example Refactoring (EditorHeader)

```svelte
<!-- EditorHeader.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { currentDocument } from '$lib/stores/document';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let documentTitle = '';
  export let isSaving = false;
  export let saveError = null;
  
  // Events
  function handleBackToHome() {
    dispatch('navigate-home');
  }
  
  function handleSave() {
    dispatch('save-document');
  }
  
  function handleExport() {
    dispatch('export-document');
  }
  
  function handleTitleChange() {
    dispatch('title-change', { title: documentTitle });
  }
  
  function toggleMasterPagePanel() {
    dispatch('toggle-master-panel');
  }
</script>

<header class="bg-white border-b border-gray-200 h-12 flex items-center px-4 justify-between">
  <div class="flex items-center gap-2">
    <button class="p-1 hover:bg-gray-100 rounded-full" on:click={handleBackToHome}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </button>
    <img src="/favicon.png" alt="PageStudio Logo" class="h-8 w-8" />
    <h1 class="font-semibold text-xl">PageStudio</h1>
    {#if $currentDocument}
      <div class="ml-4 flex items-center">
        <input 
          type="text" 
          bind:value={documentTitle} 
          on:change={handleTitleChange}
          class="border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none px-2 py-1 text-gray-800 bg-transparent" 
          placeholder="Document Title"
        />
      </div>
    {/if}
  </div>
  
  <div class="flex gap-2 items-center">
    <div class="flex items-center h-8">
      {#if isSaving}
        <span class="text-blue-500 text-sm flex items-center gap-1">
          <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        </span>
      {:else if saveError}
        <span class="text-red-500 text-sm flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {saveError}
        </span>
      {/if}
    </div>
    
    <button class="btn btn-secondary" on:click={toggleMasterPagePanel} title="Master Pages">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
      Master Pages
    </button>
    
    <button 
      class="btn {isSaving ? 'btn-disabled' : 'btn-secondary'} flex items-center gap-1" 
      on:click={handleSave} 
      disabled={isSaving}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
      Save
    </button>
    
    <button class="btn btn-primary flex items-center gap-1" on:click={handleExport}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export PDF
    </button>
  </div>
</header>
```

## Main Page Integration

```svelte
<!-- +page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentDocument, currentPage } from '$lib/stores/document';
  
  // Import components
  import EditorHeader from '$lib/components/Editor/EditorHeader.svelte';
  import EditorCanvas from '$lib/components/Editor/EditorCanvas.svelte';
  import Toolbar from '$lib/components/Editor/Toolbar.svelte';
  import ObjectPropertiesPanel from '$lib/components/Editor/ObjectPropertiesPanel.svelte';
  import PageNavigator from '$lib/components/Editor/PageNavigator.svelte';
  import MasterPageController from '$lib/components/Editor/MasterPageController.svelte';
  
  // Import utilities
  import { DocumentLoader } from '$lib/utils/DocumentLoader.js';
  import { SaveManager } from '$lib/utils/SaveManager.js';
  
  // State
  let canvasComponent;
  let selectedObject = null;
  let selectedObjectType = null;
  let documentTitle = '';
  let masterPageController;
  
  // Document loading state
  let isLoading = true;
  let loadError = null;
  
  // Saving state
  let isSaving = false;
  let saveError = null;
  
  // Initialize save manager
  const saveManager = new SaveManager({
    onSaveStart: () => { isSaving = true; saveError = null; },
    onSaveComplete: () => { isSaving = false; },
    onSaveError: (error) => { isSaving = false; saveError = error.message; }
  });
  
  // Load document from URL param
  onMount(async () => {
    // Setup and initialization code...
    const docLoader = new DocumentLoader();
    try {
      const loadedDoc = await docLoader.loadFromUrlOrCreateNew();
      documentTitle = loadedDoc.title;
      isLoading = false;
    } catch (error) {
      loadError = error.message;
      isLoading = false;
    }
    
    // Setup auto-save
    saveManager.setupAutoSave(canvasComponent);
    
    // Handle beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveManager.cleanup();
    };
  });
  
  // Handle events
  function handleObjectSelected(event) {
    selectedObject = event.detail.object;
    selectedObjectType = event.detail.objectType;
  }
  
  function handleSaveDocument() {
    saveManager.forceSave(canvasComponent, $currentDocument);
  }
  
  function handleExportDocument() {
    // Export functionality
  }
  
  function handleNavigateHome() {
    goto('/');
  }
  
  function handleTitleChange(event) {
    documentTitle = event.detail.title;
    if ($currentDocument) {
      $currentDocument.title = documentTitle;
    }
  }
  
  function handleAddPage(masterPageId = null) {
    // Add page logic
  }
  
  function handleBeforeUnload(event) {
    // Handle page unload
    saveManager.saveBeforeUnload(canvasComponent, $currentDocument);
    event.preventDefault();
    event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    return event.returnValue;
  }
</script>

<EditorHeader 
  {documentTitle}
  {isSaving}
  {saveError}
  on:navigate-home={handleNavigateHome}
  on:save-document={handleSaveDocument}
  on:export-document={handleExportDocument}
  on:title-change={handleTitleChange}
  on:toggle-master-panel={() => masterPageController.togglePanel()}
/>

<div class="flex-1 flex relative">
  <Toolbar bind:canvasComponent />
  
  <div class="flex-1 overflow-hidden">
    <EditorCanvas 
      bind:this={canvasComponent}
      on:object-selected={handleObjectSelected}
    />
    
    <MasterPageController 
      bind:this={masterPageController}
      {canvasComponent}
    />
  </div>
  
  <ObjectPropertiesPanel 
    {selectedObject}
    {selectedObjectType}
    {canvasComponent}
  />
</div>

<PageNavigator 
  on:add-page={handleAddPage}
/>
```

## Expected Outcomes
- More maintainable, focused components
- Clear responsibilities for each component
- Better testability of isolated functionality
- Improved code organization
- All components under 500 lines