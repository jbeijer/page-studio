/**
 * @vitest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/svelte';
import HorizontalRuler from './HorizontalRuler.svelte';
import { currentDocument, currentPage } from '$lib/stores/document';

// Mock Svelte stores
vi.mock('$lib/stores/document', () => {
  const { writable } = require('svelte/store');
  return {
    currentDocument: writable({
      metadata: {
        rulers: {
          units: 'mm'
        }
      },
      pages: [
        {
          id: 'page-1',
          guides: {
            vertical: [100, 200]
          }
        }
      ]
    }),
    currentPage: writable('page-1')
  };
});

describe('HorizontalRuler component', () => {
  test('renders with correct width', () => {
    const { container } = render(HorizontalRuler, { width: 500 });
    const ruler = container.querySelector('.horizontal-ruler');
    expect(ruler).not.toBeNull();
    expect(ruler.style.width).toBe('500px');
  });

  test('renders tick marks', () => {
    const { container } = render(HorizontalRuler, { width: 500 });
    const ticks = container.querySelectorAll('.tick');
    expect(ticks.length).toBeGreaterThan(0);
  });

  test('renders guide markers from store', () => {
    const { container } = render(HorizontalRuler, { width: 500 });
    const guideMarkers = container.querySelectorAll('.guide-marker');
    expect(guideMarkers.length).toBe(2);
  });

  test('emits createGuide event on mousedown', () => {
    const { container, component } = render(HorizontalRuler, { width: 500 });
    const ruler = container.querySelector('.horizontal-ruler');
    
    // Mock event listener
    const createGuideMock = vi.fn();
    component.$on('createGuide', createGuideMock);
    
    // Trigger mousedown event
    fireEvent.mouseDown(ruler, { clientX: 100, clientY: 10 });
    
    expect(createGuideMock).toHaveBeenCalled();
  });

  test('emits deleteGuide event on marker double click', () => {
    currentDocument.update(doc => ({
      ...doc,
      pages: [
        {
          id: 'page-1',
          guides: {
            vertical: [100, 200]
          }
        }
      ]
    }));
    currentPage.set('page-1');

    const { container, component } = render(HorizontalRuler, { width: 500 });
    const guideMarker = container.querySelector('.guide-marker');
    
    // Mock event listener
    const deleteGuideMock = vi.fn();
    component.$on('deleteGuide', deleteGuideMock);
    
    // Trigger double click event
    fireEvent.dblClick(guideMarker);
    
    expect(deleteGuideMock).toHaveBeenCalled();
  });
});