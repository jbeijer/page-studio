<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { currentDocument, currentPage } from '$lib/stores/document';
  
  // Core Components
  import Canvas from '$lib/components/Editor/Canvas.svelte';
  import Toolbar from '$lib/components/Editor/Toolbar.svelte';
  import MasterPageController from '$lib/components/Editor/MasterPageController.svelte';
  
  // Modular Editor Components
  import EditorHeader from '$lib/components/Editor/editor/EditorHeader.svelte';
  import PageNavigator from '$lib/components/Editor/editor/PageNavigator.svelte';
  import PropertiesPanel from '$lib/components/Editor/editor/PropertiesPanel.svelte';
  import { createDocumentManager } from '$lib/components/Editor/editor/DocumentManager.js';
  import { createAutoSaveManager } from '$lib/components/Editor/editor/AutoSaveManager.js';
  
  // For SSR prevention
  export const ssr = false;
  
  // Component state
  let canvasComponent;
  let masterPageController;
  let selectedObject = null;
  let selectedObjectType = null;
  let isSaving = false;
  let saveError = null;
  let documentTitle = '';
  let canUndo = false;
  let canRedo = false;
  
  // Page title
  let title = "PageStudio Editor";
  
  // Create application context
  const context = {
    canvasComponent: undefined,
    documentManager: undefined,
    autoSaveManager: undefined
  };
  
  onMount(async () => {
    // Update context with available components
    context.canvasComponent = canvasComponent;
    
    // Initialize document manager
    context.documentManager = createDocumentManager(context);
    
    // Initialize auto-save manager
    context.autoSaveManager = createAutoSaveManager(context, {
      autoSaveDelay: 30000,    // 30 seconds
      forceSaveInterval: 15000 // 15 seconds
    });
    
    // Initialize auto-save systems
    context.autoSaveManager.initialize();
    
    // Get document ID from URL (only on client-side)
    let docId = null;
    
    if (browser && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        docId = urlParams.get('id');
        console.log("Got document ID from URL:", docId);
      } catch (err) {
        console.error("Failed to get document ID from URL:", err);
      }
    }
    
    // Load existing document or create a new one
    if (docId) {
      const loadedDocument = await context.documentManager.loadDocumentById(docId);
      if (loadedDocument) {
        documentTitle = loadedDocument.title;
      } else {
        context.documentManager.createNewDocument();
      }
    } else {
      context.documentManager.createNewDocument();
    }
    
    // Cleanup when component unmounts
    return () => {
      context.autoSaveManager.cleanup();
    };
  });
  
  // Event handlers
  function handleObjectSelected(event) {
    selectedObject = event.detail.object;
    selectedObjectType = event.detail.objectType;
  }
  
  function handleHistoryChange(event) {
    canUndo = event.detail.canUndo;
    canRedo = event.detail.canRedo;
  }
  
  async function handleSave() {
    try {
      isSaving = true;
      saveError = null;
      
      // Update document title
      if (documentTitle !== $currentDocument.title) {
        context.documentManager.updateDocumentTitle(documentTitle);
      }
      
      // Save the document
      const result = await context.documentManager.handleSave();
      
      if (!result.success) {
        saveError = result.error;
      }
    } catch (err) {
      console.error('Error in handleSave:', err);
      saveError = err.message || "An unknown error occurred";
    } finally {
      isSaving = false;
    }
  }
  
  function handleExport() {
    // This is a placeholder for the export functionality
    // It will be implemented with jsPDF in a future step
    alert('Export functionality will be implemented in a future step');
  }
  
  function handleAddPage(masterPageId = null) {
    context.documentManager.handleAddPage(masterPageId);
  }
  
  function toggleMasterPagePanel() {
    if (masterPageController) {
      masterPageController.togglePanel();
    }
  }
  
  function handleEditMasterPage(event) {
    const { masterPageId } = event.detail;
    // TODO: Implement master page editing
  }
  
  function handleMasterPageApplied(event) {
    // Refresh the canvas to show the applied master page
    if (canvasComponent) {
      canvasComponent.loadPage($currentPage);
    }
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="h-screen flex flex-col">
  <!-- Header -->
  <EditorHeader
    bind:documentTitle
    {isSaving}
    {saveError}
    {handleSave}
    {handleExport}
    {toggleMasterPagePanel}
  />
  
  <!-- Main editor area -->
  <div class="flex-1 flex relative">
    <!-- Tools panel (left) -->
    <Toolbar bind:canvasComponent />
    
    <!-- Canvas (center) -->
    <div class="flex-1 overflow-hidden">
      <Canvas 
        bind:this={canvasComponent} 
        on:objectselected={handleObjectSelected}
        on:historyChange={handleHistoryChange}
      />
      
      <!-- Master Page Controller -->
      <MasterPageController 
        bind:this={masterPageController}
        canvasComponent={canvasComponent}
        on:editMasterPage={handleEditMasterPage}
        on:masterPageApplied={handleMasterPageApplied}
      />
    </div>
    
    <!-- Properties panel (right) -->
    <PropertiesPanel
      {selectedObject}
      {selectedObjectType}
      {canvasComponent}
      {canUndo}
      {canRedo}
    />
  </div>
  
  <!-- Page navigator (bottom) -->
  <PageNavigator {handleAddPage} />
</div>