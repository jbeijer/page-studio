<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Canvas from '$lib/components/Editor/Canvas.svelte';
  import EditorHeader from '$lib/components/Editor/editor/EditorHeader.svelte';
  import PropertiesPanel from '$lib/components/Editor/editor/PropertiesPanel.svelte';
  import documentService from '$lib/services/DocumentService.js';
  import canvasService from '$lib/services/CanvasService.js';
  import masterPageService from '$lib/services/MasterPageService.js';
  import { getIdFromSlug, getUpdatedSlugIfNeeded } from '$lib/utils/slug-helper';
  
  // Get the current slug from URL
  $: slug = $page.params.slug;
  
  // Get document ID from the slug
  $: documentId = getIdFromSlug(slug);
  
  let loaded = false;
  let loadError = null;
  let canvasComponent;
  let documentTitle = 'Loading...';

  // Handle document loading
  onMount(async () => {
    // Skip if we're server-side rendering
    if (typeof window === 'undefined') {
      console.log('Server-side rendering detected, skipping document loading');
      return;
    }
    
    console.log(`Starting document loading process for slug: ${slug}`);
    
    if (!documentId) {
      console.error('Invalid document ID from slug:', slug);
      loadError = 'Invalid document ID. Please try again.';
      return;
    }
    
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.error('IndexedDB not available in this browser');
      loadError = 'Your browser does not support features required for document editing.';
      return;
    }
    
    try {
      console.log(`Loading document with ID: ${documentId}`);
      
      // Load the document from storage
      const document = await documentService.loadDocumentById(documentId);
      
      if (!document) {
        loadError = 'Failed to load document.';
        console.error('Failed to load document:', loadError);
        return;
      }
      
      // Update document title and URL if needed
      if (document && document.title) {
        documentTitle = document.title;
        
        // Check if the URL needs updating based on the actual document title
        const updatedSlug = getUpdatedSlugIfNeeded(slug, documentTitle, documentId);
        if (updatedSlug) {
          // Update URL but don't create a new history entry
          goto(`/editor/${updatedSlug}`, { replaceState: true });
        }
      }
      
      loaded = true;
      
      // Initialize the canvas once the document is loaded
      initializeCanvas();
    } catch (err) {
      console.error('Error loading document:', err);
      loadError = err.message || 'An unexpected error occurred.';
    }
  });
  
  // Initialize the canvas and associated services
  function initializeCanvas() {
    try {
      setTimeout(() => {
        if (!canvasComponent) {
          console.warn('Canvas component not found during initialization');
          return;
        }
      
        // Get the actual Fabric.js canvas instance from the Canvas.svelte component
        const fabricCanvas = canvasComponent.getCanvas?.() || window.$canvas;
      
        if (fabricCanvas) {
          console.log("Retrieved Fabric.js canvas instance successfully");
          
          // Verify we have a proper Fabric.js canvas instance
          if (fabricCanvas.on && typeof fabricCanvas.on === 'function') {
            console.log("Verified canvas has required methods");
            canvasService.initialize(fabricCanvas, {
              dispatch: canvasComponent.dispatch,
              imageInput: canvasComponent.imageInput
            });
            documentService.initialize(fabricCanvas);
            masterPageService.initialize(fabricCanvas);
          } else {
            console.error("Invalid canvas instance: missing 'on' method (not a Fabric.js canvas)");
            
            // Try getting the canvas directly from window as a fallback
            setTimeout(() => {
              if (window.$canvas && window.$canvas.on && typeof window.$canvas.on === 'function') {
                console.log("Using fallback canvas from window.$canvas");
                canvasService.initialize(window.$canvas, {
                  dispatch: canvasComponent.dispatch,
                  imageInput: canvasComponent.imageInput
                });
                documentService.initialize(window.$canvas);
                masterPageService.initialize(window.$canvas);
              }
            }, 500);
          }
        }
      }, 500);
    } catch (err) {
      console.error('Error initializing canvas:', err);
    }
  }
  
  // Update the document title
  function handleTitleChange(event) {
    documentTitle = event.detail.title;
    
    // Check if the URL needs updating based on the updated document title
    const updatedSlug = getUpdatedSlugIfNeeded(slug, documentTitle, documentId);
    if (updatedSlug) {
      // Update URL but don't create a new history entry
      goto(`/editor/${updatedSlug}`, { replaceState: true });
    }
  }
  
  // Clean up on component destruction
  onDestroy(() => {
    try {
      if (canvasService) {
        canvasService.cleanup();
      }
    } catch (err) {
      console.warn('Error during canvas cleanup:', err);
    }
  });
</script>

<div class="editor-container h-screen flex flex-col">
  {#if loadError}
    <div class="error-container flex flex-col items-center justify-center h-full">
      <div class="bg-red-50 border-l-4 border-red-500 p-4 w-1/2">
        <h2 class="text-xl font-semibold text-red-700 mb-2">Error Loading Document</h2>
        <p class="text-red-600">{loadError}</p>
        <div class="mt-4">
          <a href="/" class="text-blue-600 hover:underline">Return to Home</a>
          <span class="mx-2">|</span>
          <a href="/editor/new" class="text-blue-600 hover:underline">Create New Document</a>
        </div>
      </div>
    </div>
  {:else}
    <!-- Editor Header -->
    <EditorHeader 
      {documentTitle} 
      on:titleChange={handleTitleChange} 
    />
    
    <!-- Main Editor Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Main Canvas Area -->
      <div class="flex-1 canvas-area bg-gray-200 overflow-auto">
        <Canvas bind:this={canvasComponent} />
      </div>
      
      <!-- Properties Panel -->
      <PropertiesPanel />
    </div>
  {/if}
</div>

<style>
  .editor-container {
    background-color: #f0f0f0;
  }
  
  .canvas-area {
    position: relative;
  }
</style>