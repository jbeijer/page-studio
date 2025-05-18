<script>
  import { onMount } from 'svelte';
  import { 
    LOG_LEVELS, 
    LOG_MODULES, 
    getLoggerSettings, 
    setLogLevel, 
    setModuleLogLevel, 
    setConsoleLogging, 
    setStorageLogging, 
    clearLogs, 
    getLogs
  } from '$lib/utils/debug-logger.js';
  import { canvasReadyStatus } from '$lib/stores/canvasReady.js';
  import { pageRecovery } from '$lib/utils/page-recovery.js';
  
  // Visibility state
  export let visible = false;
  export let position = 'right'; // 'left', 'right', 'top', 'bottom'
  
  // Panel state
  let activeTab = 'logging';
  let settings = getLoggerSettings();
  let logs = [];
  let filteredModule = 'all';
  let filteredLevel = 'all';
  let snapshots = [];
  let recoveryEnabled = true;
  let recoveryInterval = 60;
  let canvasStatus = {};
  
  $: logsToShow = filterLogs(logs, filteredModule, filteredLevel);
  
  // Setup event listeners
  onMount(() => {
    // Subscribe to canvas status updates
    const unsubscribe = canvasReadyStatus.subscribe(status => {
      canvasStatus = status;
    });
    
    // Get initial logs
    refreshLogs();
    
    // Get initial snapshots
    refreshSnapshots();
    
    // Update settings
    refreshSettings();
    
    // Setup periodic updates
    const intervalId = setInterval(() => {
      if (visible) {
        refreshLogs();
        refreshSnapshots();
      }
    }, 5000);
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  });
  
  // Toggle panel visibility
  function togglePanel() {
    visible = !visible;
    if (visible) {
      refreshLogs();
      refreshSnapshots();
      refreshSettings();
    }
  }
  
  // Refresh log data
  function refreshLogs() {
    logs = getLogs();
  }
  
  // Refresh snapshot data
  function refreshSnapshots() {
    if (!window.$pageRecovery) return;
    
    try {
      // Get snapshots from the currently active page
      snapshots = window.$pageRecovery.getSnapshots() || [];
    } catch (err) {
      console.error("Error refreshing snapshots:", err);
    }
  }
  
  // Refresh settings
  function refreshSettings() {
    settings = getLoggerSettings();
    
    // Get recovery settings
    if (window.$pageRecovery) {
      const pageRecoveryConfig = window.$pageRecovery.config || {};
      recoveryEnabled = pageRecoveryConfig.enabled !== false;
      recoveryInterval = Math.round(pageRecoveryConfig.interval / 1000);
    }
  }
  
  // Filter logs based on module and level
  function filterLogs(logs, module, level) {
    return logs.filter(log => {
      const moduleMatch = module === 'all' || log.module === module;
      const levelMatch = level === 'all' || log.level >= LOG_LEVELS[level];
      return moduleMatch && levelMatch;
    });
  }
  
  // Handle log level change
  function handleLogLevelChange(event) {
    const level = parseInt(event.target.value);
    setLogLevel(level);
    refreshSettings();
  }
  
  // Handle module log level change
  function handleModuleLogLevelChange(event, module) {
    const level = parseInt(event.target.value);
    setModuleLogLevel(module, level);
    refreshSettings();
  }
  
  // Handle console logging toggle
  function handleConsoleLoggingChange(event) {
    setConsoleLogging(event.target.checked);
    refreshSettings();
  }
  
  // Handle storage logging toggle
  function handleStorageLoggingChange(event) {
    setStorageLogging(event.target.checked);
    refreshSettings();
  }
  
  // Clear all logs
  function handleClearLogs() {
    clearLogs();
    refreshLogs();
  }
  
  // Take a manual snapshot
  function takeSnapshot() {
    if (window.$pageRecovery && window.$pageRecovery.takeSnapshot) {
      window.$pageRecovery.takeSnapshot();
      setTimeout(refreshSnapshots, 500);
    }
  }
  
  // Recover from a snapshot
  function recoverFromSnapshot() {
    if (window.$pageRecovery && window.$pageRecovery.recover) {
      const result = window.$pageRecovery.recover();
      setTimeout(refreshSnapshots, 500);
      return result;
    }
    return false;
  }
  
  // Clear all snapshots
  function clearSnapshots() {
    if (window.$pageRecovery && window.$pageRecovery.clear) {
      window.$pageRecovery.clear();
      setTimeout(refreshSnapshots, 500);
    }
  }
  
  // Toggle recovery system
  function toggleRecovery() {
    if (window.pageRecovery) {
      window.pageRecovery.config.enabled = !recoveryEnabled;
      recoveryEnabled = window.pageRecovery.config.enabled;
      
      if (recoveryEnabled) {
        // Restart snapshots
        if (window.$pageRecovery && window.$pageRecovery.startSnapshots) {
          window.$pageRecovery.startSnapshots();
        }
      } else {
        // Stop snapshots
        if (window.$pageRecovery && window.$pageRecovery.stopSnapshots) {
          window.$pageRecovery.stopSnapshots();
        }
      }
    }
  }
  
  // Format date for display
  function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
  
  // Get the background color for log level
  function getLogLevelColor(level) {
    switch(level) {
      case LOG_LEVELS.ERROR: return 'bg-red-100';
      case LOG_LEVELS.WARN: return 'bg-orange-100';
      case LOG_LEVELS.INFO: return 'bg-blue-100';
      case LOG_LEVELS.DEBUG: return 'bg-gray-100';
      case LOG_LEVELS.VERBOSE: return 'bg-purple-100';
      default: return 'bg-white';
    }
  }
</script>

<!-- Floating debug panel trigger button -->
<button 
  class="debug-panel-trigger fixed z-50 bg-gray-800 text-white rounded-full p-2 shadow-lg"
  class:left-2={position === 'left'}
  class:right-2={position === 'right'}
  class:top-2={position === 'top'}
  class:bottom-2={position === 'bottom'}
  on:click={togglePanel}
  title="Debug Panel"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
</button>

<!-- Debug panel -->
{#if visible}
  <div class="debug-panel fixed z-50 bg-white shadow-xl border border-gray-300 rounded-lg p-4 overflow-hidden flex flex-col" 
       class:left-4={position === 'left'}
       class:right-4={position === 'right'}
       class:top-4={position === 'top'}
       class:bottom-4={position === 'bottom'}>
    
    <!-- Panel header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold">Debug Panel</h2>
      <button class="text-gray-500 hover:text-gray-700" on:click={togglePanel}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <!-- Panel navigation -->
    <div class="flex border-b border-gray-300 mb-4">
      <button 
        class="px-4 py-2 text-sm font-medium"
        class:text-blue-600={activeTab === 'logging'}
        class:border-b-2={activeTab === 'logging'}
        class:border-blue-600={activeTab === 'logging'}
        on:click={() => activeTab = 'logging'}
      >
        Logging
      </button>
      <button 
        class="px-4 py-2 text-sm font-medium"
        class:text-blue-600={activeTab === 'recovery'}
        class:border-b-2={activeTab === 'recovery'}
        class:border-blue-600={activeTab === 'recovery'}
        on:click={() => activeTab = 'recovery'}
      >
        Recovery
      </button>
      <button 
        class="px-4 py-2 text-sm font-medium"
        class:text-blue-600={activeTab === 'status'}
        class:border-b-2={activeTab === 'status'}
        class:border-blue-600={activeTab === 'status'}
        on:click={() => activeTab = 'status'}
      >
        Status
      </button>
    </div>
    
    <!-- Panel content -->
    <div class="flex-grow overflow-auto">
      <!-- Logging tab -->
      {#if activeTab === 'logging'}
        <div class="logging-tab">
          <div class="mb-4 border-b pb-4">
            <h3 class="text-md font-semibold mb-2">Log Settings</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Global Log Level</label>
                <select class="w-full p-2 border rounded" value={settings.globalLevel} on:change={handleLogLevelChange}>
                  <option value={LOG_LEVELS.NONE}>None</option>
                  <option value={LOG_LEVELS.ERROR}>Error</option>
                  <option value={LOG_LEVELS.WARN}>Warning</option>
                  <option value={LOG_LEVELS.INFO}>Info</option>
                  <option value={LOG_LEVELS.DEBUG}>Debug</option>
                  <option value={LOG_LEVELS.VERBOSE}>Verbose</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1">Outputs</label>
                <div class="flex items-center mb-2">
                  <input 
                    type="checkbox" 
                    id="console-logging" 
                    checked={settings.logToConsole}
                    on:change={handleConsoleLoggingChange}
                    class="mr-2"
                  />
                  <label for="console-logging" class="text-sm">Console</label>
                </div>
                <div class="flex items-center">
                  <input 
                    type="checkbox" 
                    id="storage-logging" 
                    checked={settings.logToStorage}
                    on:change={handleStorageLoggingChange}
                    class="mr-2"
                  />
                  <label for="storage-logging" class="text-sm">In-memory Storage</label>
                </div>
              </div>
            </div>
            
            <div class="mt-4">
              <h4 class="text-sm font-semibold mb-2">Module Log Levels</h4>
              <div class="grid grid-cols-2 gap-2">
                {#each Object.entries(LOG_MODULES) as [moduleName, moduleValue]}
                  <div class="flex items-center">
                    <label class="text-sm w-24">{moduleValue}</label>
                    <select 
                      class="text-xs p-1 border rounded flex-grow"
                      value={settings.moduleSettings[moduleValue] || settings.globalLevel}
                      on:change={(e) => handleModuleLogLevelChange(e, moduleValue)}
                    >
                      <option value={LOG_LEVELS.NONE}>None</option>
                      <option value={LOG_LEVELS.ERROR}>Error</option>
                      <option value={LOG_LEVELS.WARN}>Warning</option>
                      <option value={LOG_LEVELS.INFO}>Info</option>
                      <option value={LOG_LEVELS.DEBUG}>Debug</option>
                      <option value={LOG_LEVELS.VERBOSE}>Verbose</option>
                    </select>
                  </div>
                {/each}
              </div>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-md font-semibold">Log Entries ({logs.length})</h3>
              <div class="flex gap-2">
                <select class="text-xs p-1 border rounded" bind:value={filteredModule}>
                  <option value="all">All Modules</option>
                  {#each Object.values(LOG_MODULES) as module}
                    <option value={module}>{module}</option>
                  {/each}
                </select>
                <select class="text-xs p-1 border rounded" bind:value={filteredLevel}>
                  <option value="all">All Levels</option>
                  <option value="ERROR">Error+</option>
                  <option value="WARN">Warning+</option>
                  <option value="INFO">Info+</option>
                  <option value="DEBUG">Debug+</option>
                  <option value="VERBOSE">Verbose</option>
                </select>
                <button 
                  class="text-xs px-2 py-1 bg-gray-100 border rounded"
                  on:click={refreshLogs}
                >
                  Refresh
                </button>
                <button 
                  class="text-xs px-2 py-1 bg-red-100 border rounded"
                  on:click={handleClearLogs}
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div class="log-list h-64 overflow-y-auto border rounded p-2">
              {#if logsToShow.length === 0}
                <div class="text-center text-gray-500 p-4">No logs to display</div>
              {:else}
                {#each logsToShow as log}
                  <div class="log-entry text-xs mb-1 p-1 rounded {getLogLevelColor(log.level)}">
                    <div class="flex justify-between">
                      <span class="font-mono">{formatDate(log.timestamp)}</span>
                      <span class="font-semibold">[{log.levelName}] [{log.module}]</span>
                    </div>
                    <div>{log.message}</div>
                    {#if log.data}
                      <div class="text-gray-600 font-mono text-[10px] overflow-x-auto">
                        {typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                      </div>
                    {/if}
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Recovery tab -->
      {#if activeTab === 'recovery'}
        <div class="recovery-tab">
          <div class="mb-4 border-b pb-4">
            <h3 class="text-md font-semibold mb-2">Page Recovery</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="flex items-center mb-2">
                  <input 
                    type="checkbox" 
                    id="recovery-enabled" 
                    checked={recoveryEnabled}
                    on:change={toggleRecovery}
                    class="mr-2"
                  />
                  <label for="recovery-enabled" class="text-sm">Enabled</label>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1">Interval (seconds)</label>
                <input 
                  type="number" 
                  class="w-full p-1 border rounded text-sm" 
                  value={recoveryInterval}
                  min="5"
                  max="300"
                  disabled={true}
                />
              </div>
            </div>
            
            <div class="flex gap-2 mt-4">
              <button 
                class="text-xs px-3 py-1 bg-blue-100 border rounded"
                on:click={takeSnapshot}
              >
                Take Snapshot
              </button>
              <button 
                class="text-xs px-3 py-1 bg-green-100 border rounded"
                on:click={recoverFromSnapshot}
              >
                Recover Page
              </button>
              <button 
                class="text-xs px-3 py-1 bg-red-100 border rounded"
                on:click={clearSnapshots}
              >
                Clear Snapshots
              </button>
              <button 
                class="text-xs px-3 py-1 bg-gray-100 border rounded"
                on:click={refreshSnapshots}
              >
                Refresh
              </button>
            </div>
          </div>
          
          <div>
            <h3 class="text-md font-semibold mb-2">Available Snapshots ({snapshots.length})</h3>
            
            <div class="snapshots-list h-64 overflow-y-auto border rounded p-2">
              {#if snapshots.length === 0}
                <div class="text-center text-gray-500 p-4">No snapshots available</div>
              {:else}
                {#each snapshots as snapshot}
                  <div class="snapshot-entry text-xs mb-2 p-2 border rounded">
                    <div class="flex justify-between">
                      <span class="font-semibold">Page: {snapshot.pageId}</span>
                      <span class="font-mono">{formatDate(snapshot.timestamp)}</span>
                    </div>
                    <div class="mt-1">
                      <span class="text-gray-600">Source: {snapshot.source}</span>
                      <span class="ml-2 text-gray-600">Has Data: {snapshot.hasData ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Status tab -->
      {#if activeTab === 'status'}
        <div class="status-tab">
          <h3 class="text-md font-semibold mb-2">Canvas Status</h3>
          
          <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="flex items-center">
              <span class="text-sm w-32">Canvas:</span>
              <span class="text-sm font-medium {canvasStatus.hasCanvas ? 'text-green-600' : 'text-red-600'}">
                {canvasStatus.hasCanvas ? 'Available' : 'Not Available'}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-sm w-32">Document:</span>
              <span class="text-sm font-medium {canvasStatus.hasDocument ? 'text-green-600' : 'text-red-600'}">
                {canvasStatus.hasDocument ? 'Available' : 'Not Available'}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-sm w-32">Page:</span>
              <span class="text-sm font-medium {canvasStatus.hasPage ? 'text-green-600' : 'text-red-600'}">
                {canvasStatus.hasPage ? 'Available' : 'Not Available'}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-sm w-32">Initialization:</span>
              <span class="text-sm font-medium {canvasStatus.isFullyInitialized ? 'text-green-600' : 'text-yellow-600'}">
                {canvasStatus.isFullyInitialized ? 'Complete' : 'In Progress'}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-sm w-32">Objects:</span>
              <span class="text-sm font-medium {canvasStatus.hasActiveObjects ? 'text-green-600' : 'text-yellow-600'}">
                {canvasStatus.hasActiveObjects ? 'Present' : 'None'}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-sm w-32">Error State:</span>
              <span class="text-sm font-medium {canvasStatus.hasError ? 'text-red-600' : 'text-green-600'}">
                {canvasStatus.hasError ? 'Error' : 'No Errors'}
              </span>
            </div>
          </div>
          
          {#if canvasStatus.errorMessage}
            <div class="mb-4">
              <h4 class="text-sm font-semibold text-red-600">Error Message:</h4>
              <div class="text-xs p-2 bg-red-50 border border-red-200 rounded">
                {canvasStatus.errorMessage}
              </div>
            </div>
          {/if}
          
          <div class="mb-4">
            <h4 class="text-sm font-semibold mb-1">Last Updated:</h4>
            <div class="text-xs">{formatDate(canvasStatus.lastUpdated)}</div>
          </div>
          
          <h3 class="text-md font-semibold mb-2">Global Store</h3>
          <div class="global-store h-32 overflow-y-auto border rounded p-2 text-xs">
            <pre>{JSON.stringify({
              '$document': window.$document ? { 
                id: window.$document.id,
                pages: window.$document.pages ? window.$document.pages.length : 0,
                title: window.$document.title
              } : 'Not Available',
              '$page': window.$page || 'Not Available',
              '$canvas': window.$canvas ? 'Available' : 'Not Available',
              '$globalContext': window.$globalContext ? 'Available' : 'Not Available',
              '$pageRecovery': window.$pageRecovery ? 'Available' : 'Not Available'
            }, null, 2)}</pre>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .debug-panel {
    width: 500px;
    max-width: 90vw;
    height: 500px;
    max-height: 80vh;
  }
  
  .log-entry, .snapshot-entry {
    transition: background-color 0.2s;
  }
  
  .log-entry:hover, .snapshot-entry:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
</style>