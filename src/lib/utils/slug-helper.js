/**
 * Utility functions for handling document slug URLs
 */

/**
 * Create a URL-friendly slug from a document title and ID
 * @param {string} title - The document title
 * @param {string} id - The document ID
 * @returns {string} A URL-friendly slug
 */
export function createSlug(title, id) {
  if (!id) {
    throw new Error('Document ID is required for slug creation');
  }

  // Format the title for URL
  const titleSlug = title
    ? title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    : 'untitled';

  // Combine with ID
  return `${titleSlug}-${id}`;
}

/**
 * Extract document ID from a slug
 * @param {string} slug - The URL slug
 * @returns {string|null} The document ID or null if not found
 */
export function getIdFromSlug(slug) {
  if (!slug) return null;

  // Extract ID as the last segment after hyphen
  const parts = slug.split('-');
  if (parts.length < 2) return null;

  return parts[parts.length - 1];
}

/**
 * Check if a slug is correctly formatted for the given title and ID
 * @param {string} slug - The current slug
 * @param {string} title - The document title
 * @param {string} id - The document ID
 * @returns {boolean} Whether the slug is correctly formatted
 */
export function isSlugCorrect(slug, title, id) {
  try {
    const correctSlug = createSlug(title, id);
    return slug === correctSlug;
  } catch (err) {
    return false;
  }
}

/**
 * Update slug if needed based on document title and ID
 * @param {string} currentSlug - The current URL slug
 * @param {string} title - The document title
 * @param {string} id - The document ID
 * @returns {string|null} New slug if update needed, null otherwise
 */
export function getUpdatedSlugIfNeeded(currentSlug, title, id) {
  if (!currentSlug || !id) return null;

  // Check if the slug needs updating
  if (!isSlugCorrect(currentSlug, title, id)) {
    return createSlug(title, id);
  }

  return null;
}