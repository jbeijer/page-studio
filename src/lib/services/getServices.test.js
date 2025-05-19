/**
 * getServices.test.js
 * Unit tests for the getServices utility
 */

import { describe, it, expect, vi } from 'vitest';
import { getServices } from './getServices';

// Mock Svelte context
vi.mock('svelte', () => {
  return {
    getContext: vi.fn()
  };
});

describe('getServices', () => {
  const { getContext } = require('svelte');
  
  it('should return services from context when available', () => {
    // Setup mock services in context
    const mockServices = {
      documentService: {
        initialize: vi.fn(),
        saveCurrentPage: vi.fn()
      },
      canvasService: {
        initialize: vi.fn(),
        createObject: vi.fn()
      },
      masterPageService: {
        initialize: vi.fn(),
        applyMasterPage: vi.fn()
      },
      servicesReady: { subscribe: vi.fn() },
      allServicesReady: { subscribe: vi.fn() }
    };
    
    // Mock getContext to return our mock services
    getContext.mockReturnValue(mockServices);
    
    // Call getServices
    const services = getServices();
    
    // Verify services were returned correctly
    expect(services).toBe(mockServices);
    expect(getContext).toHaveBeenCalledWith('pageStudioServices');
  });
  
  it('should return dummy objects when services are not in context', () => {
    // Mock getContext to return null (services not found)
    getContext.mockReturnValue(null);
    
    // Setup console error mock
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    // Call getServices
    const services = getServices();
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith(
      'getServices: Services not found in context. Make sure ServiceProvider is a parent component.'
    );
    
    // Verify dummy services are returned
    expect(services).toHaveProperty('documentService');
    expect(services).toHaveProperty('canvasService');
    expect(services).toHaveProperty('masterPageService');
    expect(services).toHaveProperty('servicesReady');
    expect(services).toHaveProperty('allServicesReady');
    
    // Verify dummy services contain appropriate methods
    expect(typeof services.documentService.initialize).toBe('function');
    expect(typeof services.canvasService.initialize).toBe('function');
    expect(typeof services.masterPageService.initialize).toBe('function');
    
    // Restore console.error
    console.error = originalConsoleError;
  });
  
  it('should provide dummy methods that log errors when called', () => {
    // Mock getContext to return null (services not found)
    getContext.mockReturnValue(null);
    
    // Setup console error mock
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    // Get dummy services
    const services = getServices();
    
    // Call dummy methods
    services.documentService.initialize();
    services.canvasService.createObject();
    
    // Verify error messages
    expect(console.error).toHaveBeenCalledWith('Document service not available');
    expect(console.error).toHaveBeenCalledWith('Canvas service not available');
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});