<script>
  import { currentDocument, currentPage } from '$lib/stores/document';
  
  // Props
  export let handleAddPage;
</script>

<div class="page-navigator flex items-end gap-4 p-4 overflow-x-auto bg-white border-t border-gray-200 z-20 shadow-lg sticky bottom-0 left-0 w-full" style="height: 120px;">
  {#if $currentDocument && $currentDocument.pages}
    {#each $currentDocument.pages as page}
      <button 
        type="button"
        class="page-thumb min-w-[80px] aspect-[1/1.414] bg-white border-2 {$currentPage === page.id ? 'border-primary' : 'border-gray-300'} cursor-pointer shadow-md hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-sm relative"
        on:click={() => currentPage.set(page.id)}
        on:keydown={(e) => e.key === 'Enter' && currentPage.set(page.id)}
        aria-label="Select page {page.id.replace('page-', '')}"
        aria-current={$currentPage === page.id ? 'page' : undefined}
      >
        <span class="absolute top-1 left-1 text-xs text-gray-500">
          {page.id.replace('page-', '')}
        </span>
        {#if page.masterPageId}
          <span class="absolute bottom-1 right-1 text-xs text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </span>
        {/if}
      </button>
    {/each}
  {/if}
  
  <div class="relative group">
    <button 
      class="min-w-[80px] aspect-[1/1.414] border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:bg-gray-100 shadow-md hover:shadow-lg transition-shadow rounded-sm"
      on:click={() => handleAddPage()} 
      title="Add blank page"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
    
    <!-- Dropdown for master pages (appears on hover) -->
    {#if $currentDocument && $currentDocument.masterPages && $currentDocument.masterPages.length > 0}
      <div class="absolute left-0 top-0 transform -translate-y-full mb-2 hidden group-hover:block bg-white shadow-xl rounded-lg border border-blue-200 w-64 z-30">
        <div class="px-3 py-2 font-medium text-blue-700 border-b border-blue-200 bg-blue-50 rounded-t-lg">
          Add page from master:
        </div>
        <div class="max-h-64 overflow-y-auto py-1">
          {#each $currentDocument.masterPages as masterPage}
            <button 
              class="block w-full text-left px-3 py-2 hover:bg-blue-50 truncate flex items-center gap-2 transition-colors"
              on:click={() => handleAddPage(masterPage.id)}
              title={masterPage.description || ''}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              <span>{masterPage.name}</span>
            </button>
          {/each}
        </div>
        <div class="px-3 py-2 border-t border-blue-100 bg-blue-50 text-xs text-blue-600 italic rounded-b-lg">
          Tip: Pages with masters inherit their content
        </div>
      </div>
    {/if}
  </div>
</div>