<!--
  ServiceProvider.svelte
  
  This component initializes and provides services to the application.
  It doesn't render anything visible but handles service initialization
  and makes them available to child components through context.
-->
<script>
  import { setContext, onMount, onDestroy } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import { currentDocument, currentPage } from '$lib/stores/document';
  import { canvasReady } from '$lib/stores/canvasReady';
  
  import documentService from './DocumentService';
  import canvasService from './CanvasService';
  import masterPageService from './MasterPageService';
  
  // Service initialization status
  const servicesReady = writable({
    document: false,
    canvas: false,
    masterPage: false
  });
  
  // Derived store for overall service readiness
  const allServicesReady = derived(
    servicesReady,
    $status => $status.document && $status.canvas && $status.masterPage
  );
  
  // Context key for services
  const SERVICES_CONTEXT_KEY = 'pageStudioServices';
  
  // Set up the services context
  setContext(SERVICES_CONTEXT_KEY, {
    documentService,
    canvasService,
    masterPageService,
    servicesReady,
    allServicesReady
  });
  
  // Canvas initialization function to be called by components
  export function initializeCanvas(canvas) {
    if (!canvas) {
      console.error('ServiceProvider: Cannot initialize services - Canvas is null or undefined');
      return false;
    }
    
    try {
      console.log('ServiceProvider: Initializing services with canvas');
      
      // Initialize services in order
      canvasService.initialize(canvas);
      documentService.initialize(canvas);
      masterPageService.initialize(canvas);
      
      // Update service status
      servicesReady.update(status => ({
        ...status,
        canvas: true,
        document: true,
        masterPage: true
      }));
      
      // Store references in window for debugging and recovery
      if (typeof window !== 'undefined') {
        window.$documentService = documentService;
        window.$canvasService = canvasService;
        window.$masterPageService = masterPageService;
      }
      
      console.log('ServiceProvider: Services initialized successfully');
      return true;
    } catch (err) {
      console.error('ServiceProvider: Error initializing services:', err);
      
      // Update service status with failure
      servicesReady.update(status => ({
        ...status,
        canvas: !!canvasService.canvas,
        document: !!documentService.canvas,
        masterPage: !!masterPageService.canvas
      }));
      
      return false;
    }
  }
  
  onMount(() => {
    console.log('ServiceProvider: Component mounted');
    
    // Set up subscription to document store for additional safeguards
    const unsubscribeDoc = currentDocument.subscribe(doc => {
      if (doc && !documentService.canvas && canvasService.canvas) {
        console.log('ServiceProvider: Detected document change without DocumentService initialization');
        documentService.initialize(canvasService.canvas);
        servicesReady.update(status => ({ ...status, document: true }));
      }
    });
    
    return () => {
      unsubscribeDoc();
    };
  });
  
  onDestroy(() => {
    console.log('ServiceProvider: Component unmounting, cleaning up services');
    
    try {
      documentService.cleanup();
      canvasService.cleanup();
      masterPageService.cleanup();
      
      // Update service status
      servicesReady.set({
        document: false,
        canvas: false,
        masterPage: false
      });
      
      console.log('ServiceProvider: Services cleaned up successfully');
    } catch (err) {
      console.error('ServiceProvider: Error during service cleanup:', err);
    }
  });
</script>

<!-- Render child components -->
<slot></slot>