/**
 * ServiceProvider.test.js
 * Unit tests for the ServiceProvider component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import ServiceProvider from './ServiceProvider.svelte';

// Mock Canvas and its services
vi.mock('./DocumentService', () => {
  return {
    default: {
      initialize: vi.fn(),
      cleanup: vi.fn(),
      canvas: null
    }
  };
});

vi.mock('./CanvasService', () => {
  return {
    default: {
      initialize: vi.fn(),
      cleanup: vi.fn(),
      canvas: null
    }
  };
});

vi.mock('./MasterPageService', () => {
  return {
    default: {
      initialize: vi.fn(),
      cleanup: vi.fn(),
      canvas: null
    }
  };
});

// Mock Svelte stores
vi.mock('svelte/store', () => {
  const writable = vi.fn(() => {
    const store = {
      set: vi.fn(),
      update: vi.fn(),
      subscribe: vi.fn(() => () => {})
    };
    return store;
  });
  
  const derived = vi.fn(() => {
    return {
      subscribe: vi.fn(() => () => {})
    };
  });
  
  return {
    writable,
    derived
  };
});

vi.mock('$lib/stores/document', () => {
  return {
    currentDocument: {
      subscribe: vi.fn(callback => {
        callback(null);
        return () => {};
      })
    },
    currentPage: {
      subscribe: vi.fn(() => () => {})
    }
  };
});

vi.mock('$lib/stores/canvasReady', () => {
  return {
    canvasReady: { subscribe: vi.fn(() => () => {}) }
  };
});

describe('ServiceProvider', () => {
  // Import mocked services
  const documentService = require('./DocumentService').default;
  const canvasService = require('./CanvasService').default;
  const masterPageService = require('./MasterPageService').default;
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up after each test
    cleanup();
  });
  
  it('should render without errors', () => {
    const { container } = render(ServiceProvider);
    expect(container).toBeTruthy();
  });
  
  it('should initialize services with canvas', () => {
    const { component } = render(ServiceProvider);
    
    // Create a mock canvas
    const mockCanvas = {};
    
    // Call the exported method
    const result = component.initializeCanvas(mockCanvas);
    
    // Check that services were initialized
    expect(result).toBe(true);
    expect(canvasService.initialize).toHaveBeenCalledWith(mockCanvas);
    expect(documentService.initialize).toHaveBeenCalledWith(mockCanvas);
    expect(masterPageService.initialize).toHaveBeenCalledWith(mockCanvas);
  });
  
  it('should handle null canvas', () => {
    const { component } = render(ServiceProvider);
    
    // Setup console error mock
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    // Call method with null canvas
    const result = component.initializeCanvas(null);
    
    // Check that error was logged and services were not initialized
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalled();
    expect(canvasService.initialize).not.toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });
  
  it('should handle service initialization error', () => {
    const { component } = render(ServiceProvider);
    
    // Make canvasService.initialize throw an error
    canvasService.initialize.mockImplementation(() => {
      throw new Error('Initialization error');
    });
    
    // Setup console error mock
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    // Call method with mock canvas
    const mockCanvas = {};
    const result = component.initializeCanvas(mockCanvas);
    
    // Expect error to be caught and logged
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });
  
  it('should clean up services on unmount', () => {
    const { component } = render(ServiceProvider);
    
    // Trigger component unmount
    component.$destroy();
    
    // Verify services were cleaned up
    expect(documentService.cleanup).toHaveBeenCalled();
    expect(canvasService.cleanup).toHaveBeenCalled();
    expect(masterPageService.cleanup).toHaveBeenCalled();
  });
});