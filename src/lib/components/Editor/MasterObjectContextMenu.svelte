<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let visible = false;
  export let x = 0;
  export let y = 0;
  export let object = null;
  
  // Local state
  let menuRef;
  
  // Event handlers
  function handleOverride() {
    dispatch('override', { object });
    hideMenu();
  }
  
  function handleEditMaster() {
    dispatch('editMaster', { masterId: object?.masterId });
    hideMenu();
  }
  
  function hideMenu() {
    visible = false;
  }
  
  // Close the menu when clicking outside
  function handleWindowClick(event) {
    if (visible && menuRef && !menuRef.contains(event.target)) {
      hideMenu();
    }
  }
  
  // Set up and tear down the click event listener
  import { onMount, onDestroy } from 'svelte';
  
  onMount(() => {
    window.addEventListener('click', handleWindowClick);
  });
  
  onDestroy(() => {
    window.removeEventListener('click', handleWindowClick);
  });
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && hideMenu()} />

{#if visible && object}
  <div 
    bind:this={menuRef}
    class="master-object-context-menu absolute bg-white rounded-md shadow-lg z-50 overflow-hidden border border-gray-200 w-52"
    style="left: {x}px; top: {y}px;"
  >
    <div class="menu-title border-b border-gray-200 px-4 py-2 bg-gray-50">
      <h4 class="text-sm font-medium text-gray-700 truncate">Master Object</h4>
      <p class="text-xs text-gray-500 truncate">{object.type}</p>
    </div>
    
    <div class="menu-items">
      {#if object.overridable}
        <button 
          class="menu-item w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex items-center gap-2"
          on:click={handleOverride}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>Override on This Page</span>
        </button>
      {:else}
        <div class="menu-item-disabled w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-400 bg-gray-50">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Non-overridable Object</span>
        </div>
      {/if}
      
      <button 
        class="menu-item w-full text-left px-4 py-2 hover:bg-amber-50 text-sm flex items-center gap-2"
        on:click={handleEditMaster}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>Edit Master Page</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .master-object-context-menu {
    min-width: 200px;
    transform: translate(-50%, -100%);
  }
</style>