/**
 * ContextService.js
 * Provides a shared context for Canvas components and other services
 */

/**
 * Service for managing shared context across components and services
 * Following the singleton pattern to ensure consistent context across the application
 */
class ContextService {
  constructor() {
    this.context = {};
    this.initialized = false;
  }

  /**
   * Initialize the context service with initial values
   * @param {Object} initialContext - Initial context properties and references
   * @returns {ContextService} - This instance for method chaining
   */
  initialize(initialContext = {}) {
    if (this.initialized) {
      console.warn('ContextService has already been initialized');
      return this;
    }
    
    this.context = { ...initialContext };
    this.initialized = true;
    return this;
  }

  /**
   * Get a property from the context
   * @param {string} prop - Property name
   * @returns {*} Property value
   */
  get(prop) {
    return this.context[prop];
  }

  /**
   * Set a property in the context
   * @param {string} prop - Property name
   * @param {*} value - Property value
   * @returns {ContextService} - This instance for method chaining
   */
  set(prop, value) {
    this.context[prop] = value;
    return this;
  }

  /**
   * Update multiple properties in the context
   * @param {Object} updates - Object containing updates to apply
   * @returns {ContextService} - This instance for method chaining
   */
  update(updates) {
    Object.assign(this.context, updates);
    return this;
  }

  /**
   * Get all context properties
   * @returns {Object} The complete context object
   */
  getAll() {
    return { ...this.context };
  }

  /**
   * Check if a property exists in the context
   * @param {string} prop - Property name
   * @returns {boolean} True if the property exists
   */
  has(prop) {
    return prop in this.context;
  }

  /**
   * Remove a property from the context
   * @param {string} prop - Property name
   * @returns {ContextService} - This instance for method chaining
   */
  remove(prop) {
    delete this.context[prop];
    return this;
  }

  /**
   * Clear all context properties
   * @returns {ContextService} - This instance for method chaining
   */
  clear() {
    this.context = {};
    return this;
  }

  /**
   * Create a proxy for accessing context properties directly
   * @returns {Object} Proxy object that provides direct access to context properties
   */
  createProxy() {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'update') return this.update.bind(this);
        if (prop === 'set') return this.set.bind(this);
        if (prop === 'get') return this.get.bind(this);
        if (prop === 'getAll') return this.getAll.bind(this);
        if (prop === 'has') return this.has.bind(this);
        if (prop === 'remove') return this.remove.bind(this);
        if (prop === 'clear') return this.clear.bind(this);
        return this.context[prop];
      },
      set: (target, prop, value) => {
        this.context[prop] = value;
        return true;
      }
    });
  }

  /**
   * Reset the service to its initial state (for testing purposes)
   */
  cleanup() {
    this.context = {};
    this.initialized = false;
  }
}

// Create and export a singleton instance
const contextService = new ContextService();
export default contextService;