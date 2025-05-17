/**
 * Toolbar utility functions
 * 
 * This module provides common utilities and helpers for the toolbar component.
 */

/**
 * Creates a toolbar context for sharing data between toolbar components
 * @param {Object} initialContext - Initial context data
 * @returns {Object} Toolbar context object
 */
export function createToolbarContext(initialContext = {}) {
  // Private context object
  const context = { ...initialContext };

  // Get a property from the context
  function get(prop) {
    return context[prop];
  }

  // Set a property in the context
  function set(prop, value) {
    context[prop] = value;
    return value;
  }

  // Update multiple properties in the context
  function update(updates) {
    Object.assign(context, updates);
    return context;
  }

  // Create a proxy for accessing context properties
  function createProxy() {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'update') return update;
        if (prop === 'set') return set;
        if (prop === 'get') return get;
        return context[prop];
      },
      set: (target, prop, value) => {
        context[prop] = value;
        return true;
      }
    });
  }

  return createProxy();
}

/**
 * Apply a keyboard shortcut handler for toolbar tools
 * @param {Document} document - DOM document
 * @param {Object} shortcuts - Map of shortcuts to tool types
 * @param {Function} activateToolFn - Function to activate a tool
 * @returns {Function} Cleanup function
 */
export function applyToolbarShortcuts(document, shortcuts, activateToolFn) {
  // Keyboard shortcut handler
  function handleKeyDown(event) {
    // Skip when inside inputs or textareas
    if (
      event.target.tagName === 'INPUT' || 
      event.target.tagName === 'TEXTAREA' || 
      event.target.isContentEditable
    ) {
      return;
    }

    // Get the key without considering modifiers
    const key = event.key.toLowerCase();
    
    // Check if this key is a registered shortcut
    if (shortcuts[key]) {
      event.preventDefault();
      activateToolFn(shortcuts[key]);
    }
  }

  // Add event listener
  document.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Check if a tool is active
 * @param {string} currentTool - Currently active tool
 * @param {string} toolToCheck - Tool to check
 * @returns {boolean} True if the tool is active
 */
export function isToolActive(currentTool, toolToCheck) {
  return currentTool === toolToCheck;
}

/**
 * Get a CSS class based on tool active state
 * @param {string} currentTool - Currently active tool
 * @param {string} toolToCheck - Tool to check
 * @returns {string} CSS class string
 */
export function getToolButtonClass(currentTool, toolToCheck) {
  return isToolActive(currentTool, toolToCheck)
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-white text-gray-800 hover:bg-gray-100';
}

/**
 * Get an icon style based on tool active state
 * @param {string} currentTool - Currently active tool
 * @param {string} toolToCheck - Tool to check
 * @returns {string} CSS style string
 */
export function getToolIconStyle(currentTool, toolToCheck) {
  return isToolActive(currentTool, toolToCheck)
    ? 'filter: brightness(0) invert(1);'
    : '';
}

/**
 * Create a dropdown toggle handler
 * @param {Object} state - Reactive state object
 * @param {string} key - Key in state to toggle
 * @returns {Function} Toggle handler function
 */
export function createDropdownToggle(state, key) {
  return () => {
    state[key] = !state[key];

    // Close other dropdowns
    Object.keys(state).forEach(stateKey => {
      if (stateKey !== key && stateKey.startsWith('show')) {
        state[stateKey] = false;
      }
    });
  };
}