import { vi } from 'vitest';

// Mock browser APIs that aren't available in the test environment
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock canvas
if (typeof HTMLCanvasElement.prototype.getContext === 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 }))
  }));
}

// Mock window.matchMedia
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

// Mock IntersectionObserver
if (typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));
}

// Mock requestAnimationFrame
if (typeof window.requestAnimationFrame === 'undefined') {
  window.requestAnimationFrame = vi.fn(callback => setTimeout(callback, 0));
  window.cancelAnimationFrame = vi.fn(id => clearTimeout(id));
}

// Mock fetch
if (typeof window.fetch === 'undefined') {
  window.fetch = vi.fn();
}

// Add any other browser API mocks needed for tests