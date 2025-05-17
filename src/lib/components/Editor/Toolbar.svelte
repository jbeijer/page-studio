<script>
  import { activeTool, ToolType, setActiveTool } from '$lib/stores/toolbar';
  
  // Map of tool types to their icons and tooltips
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
  
  function handleToolClick(toolType) {
    setActiveTool(toolType);
  }
  
  // Set up keyboard event listener for tool shortcuts
  function handleKeyDown(event) {
    // Only process if not in a text input or similar
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.isContentEditable) {
      return;
    }
    
    const key = event.key.toLowerCase();
    if (keyboardShortcuts[key]) {
      setActiveTool(keyboardShortcuts[key]);
      event.preventDefault();
    }
  }
  
  // Add keyboard event listener on component mount
  function handleMount() {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }
</script>

<div class="tools-panel" use:handleMount>
  {#each Object.entries(toolConfig) as [toolType, config]}
    <button
      class="tool-button {$activeTool === toolType ? 'tool-button-active' : ''}"
      title={config.tooltip}
      on:click={() => handleToolClick(toolType)}
      aria-label={config.tooltip}
      data-testid={`tool-${toolType}`}
    >
      {@html config.icon}
    </button>
  {/each}
  
  <div class="flex-1"></div>
  
  <!-- Fixed tools at bottom -->
  <button class="tool-button" title="Zoom In (Ctrl++)" data-testid="tool-zoom-in" aria-label="Zoom In">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  </button>
  
  <button class="tool-button" title="Zoom Out (Ctrl+-)" data-testid="tool-zoom-out" aria-label="Zoom Out">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  </button>
</div>

<style>
  .tools-panel {
    width: 4rem;
    background-color: theme('colors.gray.100');
    border-right: 1px solid theme('colors.gray.200');
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .tool-button {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    color: theme('colors.secondary.DEFAULT');
    transition: all 0.15s ease-in-out;
  }
  
  .tool-button:hover {
    background-color: theme('colors.gray.200');
  }
  
  .tool-button:active {
    background-color: theme('colors.gray.300');
  }
  
  .tool-button-active {
    background-color: theme('colors.primary.DEFAULT/0.1');
    color: theme('colors.primary.DEFAULT');
  }
  
  .tool-button-active:hover {
    background-color: theme('colors.primary.DEFAULT/0.2');
  }
  
  .tool-button-active:active {
    background-color: theme('colors.primary.DEFAULT/0.3');
  }
</style>