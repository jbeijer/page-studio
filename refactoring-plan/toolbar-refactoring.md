# Toolbar Component Refactoring Plan

## Current Issues
- Toolbar.svelte is 645 lines - too large for a UI component
- Mixes multiple types of tools and controls
- Complex event handling for various tools
- Unclear separation between tool types

## Refactoring Goals
- Reduce Toolbar.svelte to under 300 lines
- Create logical groupings of toolbar functionality
- Separate tool types into their own components
- Improve testability and maintainability

## Module Structure

### 1. Toolbar.svelte (main container)
**Purpose**: Main toolbar container and coordinator
**Target size**: 200-250 lines
**Responsibilities**:
- Basic toolbar layout
- Tool category management
- Communication with canvas component
- Common utility functions

### 2. DrawingTools.svelte
**Purpose**: Drawing tools section
**Target size**: 150-200 lines
**Responsibilities**:
- Selection tool
- Shape tools (rectangle, ellipse, line)
- Text tool
- Image tool
- Tool switching logic

### 3. LayerTools.svelte
**Purpose**: Layer management tools
**Target size**: 100-150 lines
**Responsibilities**:
- Bring forward/backward
- Bring to front/back
- Layer visibility
- Group/ungroup

### 4. EditTools.svelte
**Purpose**: Editing tools
**Target size**: 100-150 lines
**Responsibilities**:
- Copy/Cut/Paste
- Undo/Redo
- Delete
- Duplicate

### 5. ViewTools.svelte
**Purpose**: View-related tools
**Target size**: 100-150 lines
**Responsibilities**:
- Zoom controls
- Grid toggling
- Rulers visibility
- Preview mode

### 6. ToolConfigPanel.svelte
**Purpose**: Tool-specific configuration
**Target size**: 150-200 lines
**Responsibilities**:
- Dynamic tool options
- Property controls for active tool
- Tool presets

### 7. toolbar.utils.js
**Purpose**: Shared toolbar utilities
**Target size**: 100-150 lines
**Responsibilities**:
- Tool icon definitions
- Keyboard shortcut mappings
- Tool configuration helpers
- Event handling utilities

## Implementation Approach

### Phase 1: Reorganize Toolbar.svelte
1. Identify and group functions by their purpose
2. Refactor internal structure to group related code
3. Create the shared utility module

### Phase 2: Extract Tool Components
1. Create the tool component files
2. Move relevant template sections and functions
3. Set up proper event handling
4. Maintain keyboard shortcuts

### Phase 3: Update Main Toolbar
1. Replace code with component instances
2. Set up proper prop and event passing
3. Ensure all functionality remains intact

### Phase 4: Testing & Finalization
1. Test all toolbar functions
2. Fix any issues with event bubbling or state sync
3. Document the new structure

## Component Structure Example

### Toolbar.svelte (main container)

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { toolIcons, toolTooltips, keyboardShortcuts } from './toolbar.utils.js';
  import DrawingTools from './DrawingTools.svelte';
  import LayerTools from './LayerTools.svelte';
  import EditTools from './EditTools.svelte';
  import ViewTools from './ViewTools.svelte';
  import ToolConfigPanel from './ToolConfigPanel.svelte';
  
  // Component reference
  export let canvasComponent;
  
  // State
  let showConfigPanel = false;
  let selectedToolCategory = 'drawing';
  
  // Initialize from canvas component
  $: if (canvasComponent) {
    console.log("Canvas component initialized:", canvasComponent);
  }
  
  // Common event handlers
  function handleKeyDown(event) {
    // Global keyboard shortcut handling
    // (Delegate specific tool shortcuts to child components)
  }
  
  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
  
  // Tool category switching
  function setToolCategory(category) {
    selectedToolCategory = category;
  }
</script>

<div class="tools-panel">
  <!-- Tool category tabs -->
  <div class="tool-tabs">
    <button 
      class="tool-tab {selectedToolCategory === 'drawing' ? 'active' : ''}"
      on:click={() => setToolCategory('drawing')}
    >
      <svg><!-- Draw icon --></svg>
    </button>
    <button 
      class="tool-tab {selectedToolCategory === 'layers' ? 'active' : ''}"
      on:click={() => setToolCategory('layers')}
    >
      <svg><!-- Layers icon --></svg>
    </button>
    <button 
      class="tool-tab {selectedToolCategory === 'edit' ? 'active' : ''}"
      on:click={() => setToolCategory('edit')}
    >
      <svg><!-- Edit icon --></svg>
    </button>
    <button 
      class="tool-tab {selectedToolCategory === 'view' ? 'active' : ''}"
      on:click={() => setToolCategory('view')}
    >
      <svg><!-- View icon --></svg>
    </button>
  </div>
  
  <!-- Tool panels based on category -->
  <div class="tool-panel-container">
    {#if selectedToolCategory === 'drawing'}
      <DrawingTools {canvasComponent} />
    {:else if selectedToolCategory === 'layers'}
      <LayerTools {canvasComponent} />
    {:else if selectedToolCategory === 'edit'}
      <EditTools {canvasComponent} />
    {:else if selectedToolCategory === 'view'}
      <ViewTools 
        {canvasComponent} 
        on:toggle-config-panel={() => showConfigPanel = !showConfigPanel} 
      />
    {/if}
  </div>
  
  <!-- Config panel (optional) -->
  {#if showConfigPanel}
    <div class="config-panel">
      <ToolConfigPanel {canvasComponent} />
    </div>
  {/if}
</div>

<style>
  .tools-panel {
    width: 10rem;
    background-color: theme('colors.gray.100');
    border-right: 1px solid theme('colors.gray.200');
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .tool-tabs {
    display: flex;
    border-bottom: 1px solid theme('colors.gray.200');
    background-color: theme('colors.gray.200');
  }
  
  .tool-tab {
    flex: 1;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .tool-tab.active {
    background-color: theme('colors.gray.100');
    border-bottom: 2px solid theme('colors.primary.DEFAULT');
  }
  
  .tool-panel-container {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }
  
  .config-panel {
    position: absolute;
    left: 10.5rem;
    top: 3rem;
    background-color: white;
    border: 1px solid theme('colors.gray.200');
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 20;
    width: 18rem;
  }
</style>
```

### LayerTools.svelte (example)

```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let canvasComponent;
  
  // State
  let hasSelectedObject = false;
  
  // Events
  const dispatch = createEventDispatcher();
  
  // Update selection state whenever canvasComponent changes
  $: if (canvasComponent) {
    updateSelectionState();
    setupEventListeners();
  }
  
  function updateSelectionState() {
    if (!canvasComponent) return;
    
    try {
      const canvas = canvasComponent.getCanvas();
      if (canvas) {
        const activeObject = canvas.getActiveObject();
        hasSelectedObject = !!activeObject;
      }
    } catch (error) {
      console.error("Error updating selection state:", error);
    }
  }
  
  function setupEventListeners() {
    const canvas = canvasComponent?.getCanvas();
    if (!canvas) return;
    
    // Clean up old listeners first
    canvas.off('selection:created', updateSelectionState);
    canvas.off('selection:updated', updateSelectionState);
    canvas.off('selection:cleared', updateSelectionState);
    
    // Add listeners
    canvas.on('selection:created', updateSelectionState);
    canvas.on('selection:updated', updateSelectionState);
    canvas.on('selection:cleared', updateSelectionState);
  }
  
  // Layer functions
  function handleBringToFront() {
    if (canvasComponent && typeof canvasComponent.bringToFront === 'function') {
      canvasComponent.bringToFront();
    }
  }
  
  function handleBringForward() {
    if (canvasComponent && typeof canvasComponent.bringForward === 'function') {
      canvasComponent.bringForward();
    }
  }
  
  function handleSendBackward() {
    if (canvasComponent && typeof canvasComponent.sendBackward === 'function') {
      canvasComponent.sendBackward();
    }
  }
  
  function handleSendToBack() {
    if (canvasComponent && typeof canvasComponent.sendToBack === 'function') {
      canvasComponent.sendToBack();
    }
  }
</script>

<div class="layer-tools">
  <h3 class="tools-header">Layer Controls</h3>
  
  <button 
    class="tool-button" 
    title="Bring to Front (Ctrl+Shift+])"
    on:click={handleBringToFront}
  >
    <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24">
      <!-- Icon SVG -->
    </svg>
    Bring to Front
  </button>
  
  <button 
    class="tool-button" 
    title="Bring Forward (Ctrl+])"
    on:click={handleBringForward}
  >
    <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24">
      <!-- Icon SVG -->
    </svg>
    Bring Forward
  </button>
  
  <button 
    class="tool-button" 
    title="Send Backward (Ctrl+[)"
    on:click={handleSendBackward}
  >
    <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24">
      <!-- Icon SVG -->
    </svg>
    Send Backward
  </button>
  
  <button 
    class="tool-button" 
    title="Send to Back (Ctrl+Shift+[)"
    on:click={handleSendToBack}
  >
    <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24">
      <!-- Icon SVG -->
    </svg>
    Send to Back
  </button>
</div>

<style>
  .layer-tools {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .tools-header {
    font-size: 0.875rem;
    font-weight: 500;
    color: theme('colors.gray.600');
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid theme('colors.gray.200');
  }
  
  .tool-button {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: background-color 0.15s ease-in-out;
  }
  
  .tool-button:hover {
    background-color: theme('colors.gray.200');
  }
</style>
```

## Benefits of This Approach

### Improved Organization
- Tools are grouped logically by function
- Each component has clear, focused responsibilities
- Better visual organization with categories

### Enhanced Maintainability
- Smaller, more focused files
- Easier to understand component structure
- Reduced complexity in each component

### Better Testability
- Isolated components are easier to test
- Can mock canvas interaction for unit tests
- Clear interfaces between components

### Extensibility
- Adding new tool categories is straightforward
- Tool configurations can be extended independently
- Clearer extension points for new features

## Implementation Notes

### State Management
- Use props for passing Canvas component reference
- Maintain tool state in the component that needs it
- Use events for communicating changes

### Keyboard Shortcuts
- Handle global shortcuts in main Toolbar
- Delegate tool-specific shortcuts to tool components
- Maintain shortcut documentation in toolbar.utils.js

### Component Communication
- Use props for passing down data
- Use events for communicating up
- Svelte's reactivity for internal state