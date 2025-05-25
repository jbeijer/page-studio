<script>
  import { onMount } from 'svelte';
  import { getDocumentList, deleteDocument } from '$lib/utils/storage';
  import { documentList } from '$lib/stores/document';
  import { goto } from '$app/navigation';
  import { createSlug } from '$lib/utils/slug-helper';

  let loading = true;
  let error = null;

  // Format date for display
  function formatDate(date) {
    if (!date) return '';
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  // Load document list on component mount
  onMount(async () => {
    try {
      loading = true;
      const docs = await getDocumentList();
      documentList.set(docs);
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });

  // Open a document in the editor with a slug-based URL
  async function openDocument(documentId, title) {
    try {
      // Create URL-friendly slug using our utility function
      const slug = createSlug(title, documentId);
      
      // Navigate to the document using the slug route
      goto(`/editor/${slug}`);
    } catch (err) {
      console.error('Error navigating to document:', err);
      // Fallback to a basic URL if slug creation fails
      goto(`/editor/doc-${documentId}`);
    }
  }

  // Delete a document after confirmation
  async function handleDelete(documentId, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await deleteDocument(documentId);
      documentList.update(list => list.filter(doc => doc.id !== documentId));
    } catch (err) {
      error = err.message;
    }
  }
</script>

<div class="document-list p-4">
  <h2 class="text-2xl font-semibold mb-6">Your Documents</h2>
  
  {#if loading}
    <div class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <p class="text-red-700">{error}</p>
      <p class="mt-2">Try refreshing the page or creating a new document.</p>
    </div>
  {:else if $documentList.length === 0}
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <h3 class="text-lg font-medium mb-2">No documents yet</h3>
      <p class="text-gray-600 mb-4">Create your first document to get started.</p>
      <a href="/editor/new" class="btn btn-primary">Create New Document</a>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each $documentList as doc}
        <div class="document-card bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div class="p-4">
            <h3 class="text-lg font-medium mb-2 truncate">{doc.title}</h3>
            <div class="text-sm text-gray-500 mb-1">
              {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
            </div>
            <div class="text-sm text-gray-500 mb-3">
              Modified: {formatDate(doc.lastModified)}
            </div>
            <div class="flex gap-2">
              <button 
                class="btn btn-primary flex-1" 
                on:click={() => openDocument(doc.id, doc.title)}
              >
                Open
              </button>
              <button 
                class="btn btn-secondary" 
                on:click={() => handleDelete(doc.id, doc.title)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="mt-8 flex justify-center">
    <a href="/editor/new" class="btn btn-primary">Create New Document</a>
  </div>
</div>

<style>
  .document-card {
    transition: transform 0.2s ease-in-out;
  }
  
  .document-card:hover {
    transform: translateY(-2px);
  }
  
  .btn {
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    outline: none;
    transition: background-color 0.2s;
  }
  
  .btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }
  
  .btn-primary {
    background-color: #2563eb;
    color: white;
  }
  
  .btn-primary:hover {
    background-color: #1d4ed8;
  }
  
  .btn-secondary {
    background-color: #e5e7eb;
    color: #1f2937;
  }
  
  .btn-secondary:hover {
    background-color: #d1d5db;
  }
</style>