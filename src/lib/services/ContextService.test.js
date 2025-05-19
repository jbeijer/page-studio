/**
 * ContextService.test.js
 * Unit tests for the ContextService
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import contextService from './ContextService';

describe('ContextService', () => {
  beforeEach(() => {
    // Reset the service before each test
    contextService.cleanup();
  });

  afterEach(() => {
    // Clean up after each test
    contextService.cleanup();
  });

  it('should initialize with empty context by default', () => {
    contextService.initialize();
    expect(contextService.getAll()).toEqual({});
  });

  it('should initialize with provided context', () => {
    const initialContext = { canvas: {}, document: {} };
    contextService.initialize(initialContext);
    expect(contextService.getAll()).toEqual(initialContext);
  });

  it('should warn when initializing multiple times', () => {
    const originalConsoleWarn = console.warn;
    const mockConsoleWarn = vi.fn();
    console.warn = mockConsoleWarn;

    contextService.initialize();
    contextService.initialize();
    
    expect(mockConsoleWarn).toHaveBeenCalledWith('ContextService has already been initialized');
    
    console.warn = originalConsoleWarn;
  });

  it('should get and set properties correctly', () => {
    contextService.initialize();
    
    contextService.set('testProp', 'testValue');
    expect(contextService.get('testProp')).toBe('testValue');
  });

  it('should update multiple properties', () => {
    contextService.initialize();
    
    contextService.update({ prop1: 'value1', prop2: 'value2' });
    expect(contextService.get('prop1')).toBe('value1');
    expect(contextService.get('prop2')).toBe('value2');
  });

  it('should check if a property exists', () => {
    contextService.initialize();
    
    contextService.set('existingProp', 'value');
    expect(contextService.has('existingProp')).toBe(true);
    expect(contextService.has('nonExistingProp')).toBe(false);
  });

  it('should remove a property', () => {
    contextService.initialize();
    
    contextService.set('tempProp', 'value');
    expect(contextService.has('tempProp')).toBe(true);
    
    contextService.remove('tempProp');
    expect(contextService.has('tempProp')).toBe(false);
  });

  it('should clear all properties', () => {
    contextService.initialize();
    
    contextService.update({ prop1: 'value1', prop2: 'value2' });
    contextService.clear();
    expect(contextService.getAll()).toEqual({});
  });

  it('should create a proxy for direct property access', () => {
    contextService.initialize();
    
    const proxy = contextService.createProxy();
    proxy.directProp = 'directValue';
    
    expect(contextService.get('directProp')).toBe('directValue');
    expect(proxy.directProp).toBe('directValue');
  });

  it('should expose methods through proxy', () => {
    contextService.initialize();
    
    const proxy = contextService.createProxy();
    
    proxy.testProp = 'testValue';
    expect(proxy.testProp).toBe('testValue');
    
    proxy.update({ newProp: 'newValue' });
    expect(proxy.newProp).toBe('newValue');
    
    expect(proxy.has('newProp')).toBe(true);
    expect(proxy.get('newProp')).toBe('newValue');
    
    proxy.remove('newProp');
    expect(proxy.has('newProp')).toBe(false);
    
    proxy.clear();
    expect(proxy.getAll()).toEqual({});
  });
});