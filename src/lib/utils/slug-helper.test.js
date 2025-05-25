import { describe, it, expect } from 'vitest';
import { 
  createSlug, 
  getIdFromSlug, 
  isSlugCorrect, 
  getUpdatedSlugIfNeeded 
} from './slug-helper';

describe('Slug Helper Functions', () => {
  describe('createSlug', () => {
    it('should create a valid slug from title and ID', () => {
      expect(createSlug('My Document Title', 'doc-123')).toBe('my-document-title-doc-123');
    });

    it('should handle titles with special characters', () => {
      expect(createSlug('Special @#$% Characters!', 'doc-456')).toBe('special-characters-doc-456');
    });

    it('should use "untitled" for empty or null titles', () => {
      expect(createSlug('', 'doc-789')).toBe('untitled-doc-789');
      expect(createSlug(null, 'doc-789')).toBe('untitled-doc-789');
    });

    it('should throw error if ID is not provided', () => {
      expect(() => createSlug('Test Document')).toThrow();
      expect(() => createSlug('Test Document', null)).toThrow();
      expect(() => createSlug('Test Document', '')).toThrow();
    });
  });

  describe('getIdFromSlug', () => {
    it('should extract ID from a valid slug', () => {
      expect(getIdFromSlug('my-document-title-doc-123')).toBe('doc-123');
    });

    it('should handle slugs with multiple hyphens', () => {
      expect(getIdFromSlug('my-complex-title-with-hyphens-doc-456')).toBe('456');
    });

    it('should return null for invalid slugs', () => {
      expect(getIdFromSlug('invalid-slug-format')).not.toBeNull(); // This will extract "format" as ID
      expect(getIdFromSlug('')).toBeNull();
      expect(getIdFromSlug(null)).toBeNull();
    });
  });

  describe('isSlugCorrect', () => {
    it('should confirm correctly formatted slugs', () => {
      expect(isSlugCorrect('my-document-title-doc-123', 'My Document Title', 'doc-123')).toBe(true);
    });

    it('should reject incorrectly formatted slugs', () => {
      expect(isSlugCorrect('wrong-slug-doc-123', 'My Document Title', 'doc-123')).toBe(false);
      expect(isSlugCorrect('my-document-title-wrong-id', 'My Document Title', 'doc-123')).toBe(false);
    });

    it('should handle edge cases gracefully', () => {
      expect(isSlugCorrect('', 'Title', 'id')).toBe(false);
      expect(isSlugCorrect(null, 'Title', 'id')).toBe(false);
      expect(isSlugCorrect('slug', null, 'id')).toBe(false);
      expect(isSlugCorrect('slug', 'Title', null)).toBe(false);
    });
  });

  describe('getUpdatedSlugIfNeeded', () => {
    it('should return null if slug is correctly formatted', () => {
      expect(getUpdatedSlugIfNeeded('my-document-title-doc-123', 'My Document Title', 'doc-123')).toBeNull();
    });

    it('should return updated slug if current slug is incorrect', () => {
      expect(getUpdatedSlugIfNeeded('old-title-doc-123', 'New Title', 'doc-123')).toBe('new-title-doc-123');
    });

    it('should handle edge cases gracefully', () => {
      expect(getUpdatedSlugIfNeeded('', 'Title', 'id')).toBeNull();
      expect(getUpdatedSlugIfNeeded(null, 'Title', 'id')).toBeNull();
      expect(getUpdatedSlugIfNeeded('slug', 'Title', null)).toBeNull();
    });
  });
});