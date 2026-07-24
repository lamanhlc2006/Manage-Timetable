/**
 * Helper to escape special regular expression characters in user input strings
 * to prevent Regex Injection and ReDoS attacks.
 */
export const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
