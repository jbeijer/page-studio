<script>
  import { activeTool, ToolType, setActiveTool } from '$lib/stores/toolbar';
  import { getToolButtonClass, getToolIconStyle, applyToolbarShortcuts } from './toolbar.utils.js';
  
  // Component props 
  export let context = null;

  // Tool configuration
  const toolConfig = {
    [ToolType.SELECT]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>`,
      tooltip: 'Select Tool (V)'
    },
    [ToolType.TEXT]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>`,
      tooltip: 'Text Tool (T)'
    },
    [ToolType.IMAGE]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>`,
      tooltip: 'Image Tool (I)'
    },
    [ToolType.RECTANGLE]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            </svg>`,
      tooltip: 'Rectangle Tool (R)'
    },
    [ToolType.ELLIPSE]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2" />
            </svg>`,
      tooltip: 'Ellipse Tool (E)'
    },
    [ToolType.LINE]: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19l14-14" />
            </svg>`,
      tooltip: 'Line Tool (L)'
    }
  };
  
  // Tool keyboard shortcuts
  const keyboardShortcuts = {
    'v': ToolType.SELECT,
    't': ToolType.TEXT,
    'i': ToolType.IMAGE,
    'r': ToolType.RECTANGLE,
    'e': ToolType.ELLIPSE,
    'l': ToolType.LINE
  };
  
  // Import toolService for better integration
  import toolService from '$lib/services/ToolService';
  
  // Handle tool selection using ToolService
  function handleToolClick(toolType) {
    console.log(`Tool click: ${toolType}`);
    
    // Use ToolService to set the active tool
    // This handles both updating the store and configuring the canvas
    toolService.setActiveTool(toolType);
    
    // Update context if provided
    if (context) {
      context.lastSelectedTool = toolType;
    }
  }
  
  // Setup keyboard shortcuts on mount
  import { onMount, onDestroy } from 'svelte';
  
  let cleanup = null;
  
  onMount(() => {
    cleanup = applyToolbarShortcuts(
      document,
      keyboardShortcuts,
      setActiveTool
    );
  });
  
  onDestroy(() => {
    if (cleanup) cleanup();
  });
</script>

<div class="drawing-tools flex flex-col space-y-1 px-1 py-2 bg-gray-50 border-b border-gray-200">
  <h2 class="text-xs font-semibold px-2 pb-1 text-gray-500 uppercase">Tools</h2>
  {#each Object.entries(toolConfig) as [tool, config]}
    <button
      class="tool-button w-full p-2 rounded transition-colors duration-150 flex justify-center {getToolButtonClass($activeTool, tool)}"
      on:click={() => handleToolClick(tool)}
      title={config.tooltip}
      data-testid={`tool-${tool}`}
    >
      <div style="{getToolIconStyle($activeTool, tool)}" class="tool-icon">
        {@html config.icon}
      </div>
    </button>
  {/each}
</div>

<style>
  .drawing-tools {
    min-width: 54px;
  }

  .tool-button {
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .tool-icon :global(svg) {
    width: 20px;
    height: 20px;
  }
</style>