<script>
  import { onMount, onDestroy } from 'svelte';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { fabric } from 'fabric';
  
  export let width = 1240; // Default A4 @ 150 DPI: 210mm × 1.5 × 3.93701
  export let height = 1754; // Default A4 @ 150 DPI: 297mm × 1.5 × 3.93701
  
  let canvasElement;
  let canvas;
  let pages = [];
  
  // Subscribe to current page changes
  $: if ($currentPage && canvas) {
    loadPage($currentPage);
  }
  
  onMount(() => {
    // Initialize Fabric.js canvas with the given dimensions
    canvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'white'
    });
    
    // Add a basic rectangle as a test
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: '#3B82F6',
      stroke: '#2563EB',
      strokeWidth: 2,
      rx: 10,
      ry: 10
    });
    
    canvas.add(rect);
    
    // Load document from store if it exists
    if ($currentDocument) {
      pages = $currentDocument.pages || [{ 
        id: 'page-1', 
        canvasJSON: null,
        masterPageId: null
      }];
      
      // Set first page as active
      if (!$currentPage && pages.length > 0) {
        currentPage.set(pages[0].id);
      }
    }
    
    // Listen for changes to update store
    canvas.on('object:modified', saveCurrentPage);
    canvas.on('object:added', saveCurrentPage);
    canvas.on('object:removed', saveCurrentPage);
    
    return () => {
      // Clean up canvas on component unmount
      canvas.dispose();
    };
  });
  
  function loadPage(pageId) {
    if (!canvas || !$currentDocument) return;
    
    // Save current page first
    saveCurrentPage();
    
    // Find the page to load
    const pageToLoad = $currentDocument.pages.find(p => p.id === pageId);
    
    if (pageToLoad) {
      // Clear canvas
      canvas.clear();
      canvas.backgroundColor = 'white';
      
      // Load content if it exists
      if (pageToLoad.canvasJSON) {
        canvas.loadFromJSON(pageToLoad.canvasJSON, () => {
          canvas.renderAll();
        });
      }
      
      // Apply master page if specified (placeholder for future implementation)
      if (pageToLoad.masterPageId) {
        // This will be implemented later
        console.log(`Master page ${pageToLoad.masterPageId} will be applied`);
      }
    }
  }
  
  function saveCurrentPage() {
    if (!canvas || !$currentPage || !$currentDocument) return;
    
    const pageIndex = $currentDocument.pages.findIndex(p => p.id === $currentPage);
    if (pageIndex >= 0) {
      const updatedPages = [...$currentDocument.pages];
      updatedPages[pageIndex] = {
        ...updatedPages[pageIndex],
        canvasJSON: canvas.toJSON()
      };
      
      currentDocument.update(doc => ({
        ...doc,
        pages: updatedPages,
        lastModified: new Date()
      }));
    }
  }
</script>

<div class="canvas-wrapper relative overflow-hidden">
  <div class="canvas-container flex items-center justify-center p-8">
    <div class="canvas-paper shadow-lg">
      <canvas 
        bind:this={canvasElement} 
        width={width} 
        height={height}
        class="border border-gray-300"
      ></canvas>
    </div>
  </div>
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: theme('colors.canvas.background');
  }
  
  .canvas-paper {
    display: inline-block;
  }
</style>