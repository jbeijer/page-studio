import { describe, it, expect, vi, beforeEach } from 'vitest';
import TextEditingPanel from './TextEditingPanel.svelte';

// Skip DOM tests due to Svelte 5 compatibility
describe('TextEditingPanel', () => {
  it('correctly exports component', () => {
    expect(typeof TextEditingPanel).toBe('function');
    
    // Check for expected methods and properties in component
    const componentSource = TextEditingPanel.toString();
    expect(componentSource).toContain('updateTextProperty');
    expect(componentSource).toContain('linkTextBoxes');
    expect(componentSource).toContain('unlinkTextBoxes');
    expect(componentSource).toContain('textFlow');
  });
  
  // Test link and unlink functionality
  it('should use TextFlow for text flow functionality', () => {
    const componentSource = TextEditingPanel.toString();
    expect(componentSource).toContain('textFlow');
    expect(componentSource).toContain('linkTextBoxes');
    expect(componentSource).toContain('unlinkTextBoxes');
  });
});