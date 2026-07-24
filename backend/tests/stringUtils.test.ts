import { escapeRegex } from '../src/utils/stringUtils';

describe('stringUtils - escapeRegex', () => {
  it('should return plain alphanumeric text without spaces unchanged', () => {
    expect(escapeRegex('helloworld')).toBe('helloworld');
  });

  it('should escape regex special characters properly', () => {
    const specialChars = '.*+?^${}()|[]\\';
    const escaped = escapeRegex(specialChars);
    expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('should prevent Regex Injection attacks in search strings', () => {
    const maliciousInput = 'admin.*';
    const escaped = escapeRegex(maliciousInput);
    const regex = new RegExp(escaped, 'i');

    expect(regex.test('admin.*')).toBe(true);
    expect(regex.test('admin123')).toBe(false);
  });
});
