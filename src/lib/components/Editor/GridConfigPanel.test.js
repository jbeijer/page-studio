/**
 * @vitest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/svelte';
import GridConfigPanel from './GridConfigPanel.svelte';
import { currentDocument } from '$lib/stores/document';

// Mock Svelte stores
vi.mock('$lib/stores/document', () => {
  const { writable } = require('svelte/store');
  return {
    currentDocument: writable({
      metadata: {
        grid: {
          enabled: true,
          size: 10,
          color: '#CCCCCC',
          opacity: 0.5,
          snap: true,
          snapThreshold: 5,
          subdivisions: 2
        },
        rulers: {
          enabled: true,
          horizontalVisible: true,
          verticalVisible: true,
          units: 'mm',
          color: '#666666',
          showNumbers: true
        }
      }
    })
  };
});

describe('GridConfigPanel component', () => {
  test('renders with correct initial values from store', () => {
    const { container } = render(GridConfigPanel);
    
    // Check grid checkbox
    const gridCheckbox = container.querySelector('input[type="checkbox"]');
    expect(gridCheckbox.checked).toBe(true);
    
    // Check size input
    const sizeInput = container.querySelector('input[type="number"]');
    expect(sizeInput.value).toBe('10');
    
    // Check units select
    const unitsSelect = container.querySelector('select');
    expect(unitsSelect.value).toBe('mm');
  });

  test('updates grid enabled setting', () => {
    const { container } = render(GridConfigPanel);
    const gridCheckbox = container.querySelector('input[type="checkbox"]');
    
    // Mock document update
    const updateSpy = vi.spyOn(currentDocument, 'update');
    
    // Toggle checkbox
    fireEvent.change(gridCheckbox, { target: { checked: false } });
    
    expect(updateSpy).toHaveBeenCalled();
    const updateFn = updateSpy.mock.calls[0][0];
    
    // Create a mock document and apply the update function
    const mockDoc = {
      metadata: {
        grid: {
          enabled: true
        }
      }
    };
    
    const result = updateFn(mockDoc);
    expect(result.metadata.grid.enabled).toBe(false);
  });

  test('updates grid size setting', () => {
    const { container } = render(GridConfigPanel);
    const sizeInput = container.querySelector('input[type="number"]');
    
    // Mock document update
    const updateSpy = vi.spyOn(currentDocument, 'update');
    
    // Change size input
    fireEvent.input(sizeInput, { target: { value: '20' } });
    
    expect(updateSpy).toHaveBeenCalled();
    const updateFn = updateSpy.mock.calls[0][0];
    
    // Create a mock document and apply the update function
    const mockDoc = {
      metadata: {
        grid: {
          size: 10
        }
      }
    };
    
    const result = updateFn(mockDoc);
    expect(result.metadata.grid.size).toBe(20);
  });

  test('updates ruler units setting', () => {
    const { container } = render(GridConfigPanel);
    const unitsSelect = container.querySelector('select');
    
    // Mock document update
    const updateSpy = vi.spyOn(currentDocument, 'update');
    
    // Change units select
    fireEvent.change(unitsSelect, { target: { value: 'cm' } });
    
    expect(updateSpy).toHaveBeenCalled();
    const updateFn = updateSpy.mock.calls[0][0];
    
    // Create a mock document and apply the update function
    const mockDoc = {
      metadata: {
        rulers: {
          units: 'mm'
        }
      }
    };
    
    const result = updateFn(mockDoc);
    expect(result.metadata.rulers.units).toBe('cm');
  });
});