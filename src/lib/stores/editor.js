import { writable } from 'svelte/store';

/**
 * Store for the currently selected tool
 * @type {import('svelte/store').Writable<Tool>}
 */
export const currentTool = writable('select');

/**
 * Store for IDs of selected objects
 * @type {import('svelte/store').Writable<string[]>}
 */
export const selectedObjects = writable([]);

/**
 * Store for clipboard objects
 * @type {import('svelte/store').Writable<any[]>}
 */
export const clipboard = writable([]);

/**
 * Store for zoom level percentage
 * @type {import('svelte/store').Writable<number>}
 */
export const zoomLevel = writable(100);

/**
 * Store for grid visibility
 * @type {import('svelte/store').Writable<boolean>}
 */
export const showGrid = writable(true);

/**
 * Store for guides visibility
 * @type {import('svelte/store').Writable<boolean>}
 */
export const showGuides = writable(true);

/**
 * Tool types
 * @typedef {'select'|'text'|'image'|'rectangle'|'ellipse'|'line'|'polygon'|'zoom'|'pan'|'link'} Tool
 */