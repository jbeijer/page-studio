/**
 * Canvas.context.js
 * Provides a shared context for Canvas modules
 */

/**
 * Create a shared context for Canvas modules
 * @param {Object} initialContext - Initial context properties and references
 * @returns {Object} The context object with getter/setter methods
 */
export function createCanvasContext(initialContext = {}) {
  // Private context object
  const context = { ...initialContext };

  /**
   * Get a property from the context
   * @param {string} prop - Property name
   * @returns {*} Property value
   */
  function get(prop) {
    return context[prop];
  }

  /**
   * Set a property in the context
   * @param {string} prop - Property name
   * @param {*} value - Property value
   */
  function set(prop, value) {
    context[prop] = value;
  }

  /**
   * Update multiple properties in the context
   * @param {Object} updates - Object containing updates to apply
   */
  function update(updates) {
    Object.assign(context, updates);
  }

  /**
   * Create a proxy for accessing context properties
   * @returns {Object} Proxy object
   */
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

  // Return a proxy object that allows access to context properties
  return createProxy();
}