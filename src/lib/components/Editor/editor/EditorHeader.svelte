<script>
  import { goto } from '$app/navigation';
  import { currentDocument } from '$lib/stores/document';
  
  // Props
  export let documentTitle = '';
  export let isSaving = false;
  export let saveError = null;
  export let handleSave;
  export let handleExport;
  export let toggleMasterPagePanel;
  
  // Methods
  function handleBackToHome() {
    goto('/');
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