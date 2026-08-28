import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORY } from '../constants';

describe('Constants', () => {
  it('should export DEFAULT_CATEGORY as a non-empty string', () => {
    expect(DEFAULT_CATEGORY).toBeDefined();
    expect(typeof DEFAULT_CATEGORY).toBe('string');
    expect(DEFAULT_CATEGORY.length).toBeGreaterThan(0);
  });

  it('DEFAULT_CATEGORY should be "Học tập"', () => {
    expect(DEFAULT_CATEGORY).toBe('Học tập');
  });
});
