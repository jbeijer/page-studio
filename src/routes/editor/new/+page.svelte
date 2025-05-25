<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import documentService from '$lib/services/DocumentService.js';
  import { createSlug } from '$lib/utils/slug-helper';
  
  let loading = true;
  let error = null;
  
  // Get format from page data or URL (with fallback to A4)
  $: format = $page.data.format || $page.url.searchParams.get('format') || 'A4';
  
  // Log format and page data for debugging
  $: console.log(`Document format: ${format}`, $page.data);
  
  // Create a new document on mount and redirect to its editor
  onMount(async () => {
    // Skip if we're server-side rendering
    if (typeof window === 'undefined') {
      console.log('Server-side rendering detected, skipping document creation');
      return;
    }
    
    // Check if we have the necessary browser APIs
    if (!window.indexedDB) {
      error = 'Your browser does not support IndexedDB, which is required for document storage.';
      loading = false;
      return;
    }
    
    console.log(`Starting new document creation process. Format: ${format}`);
    try {
      console.log(`Creating new document with format: ${format}`);
      
      // Create a new document with specified format
      loading = true;
      const document = await documentService.createNewDocument({
        title: 'Untitled Document',
        format: format,
        pageCount: 1
      });
      
      console.log('Document created:', document);
      
      if (!document || !document.id) {
        error = 'Failed to create new document';
        console.error('Error creating document:', error);
        loading = false;
        return;
      }
      
      // Redirect to the new document using the slug format
      const slug = createSlug(document.title || 'Untitled Document', document.id);
      goto(`/editor/${slug}`);
    } catch (err) {
      console.error('Error in document creation:', err);
      error = err.message || 'An unexpected error occurred';
      loading = false;
    }
  });
</script>

<div class="h-screen flex flex-col items-center justify-center">
  <div class="text-center">
    {#if error}
      <div class="bg-red-50 border-l-4 border-red-500 p-4 max-w-lg mx-auto mb-4">
        <h2 class="text-xl font-semibold text-red-700 mb-2">Error Creating Document</h2>
        <p class="text-red-600">{error}</p>
        <div class="mt-4">
          <a href="/" class="text-blue-600 hover:underline">Return to Home</a>
          <span class="mx-2">|</span>
          <button 
            class="text-blue-600 hover:underline"
            on:click={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    {:else}
      <h1 class="text-2xl font-bold mb-4">Creating New Document</h1>
      <p>Please wait while we prepare your new document...</p>
      <!-- Loading spinner -->
      <div class="mt-4 inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
    {/if}
  </div>
</div>