/**
 * Security & Sanitization utilities.
 * Defends against prompt injection, malicious document parsing, and role escalation attempts.
 */

export function sanitizeForPrompt(input: string, maxLen = 15000): string {
  if (!input) return '';
  // Truncate overly large inputs
  let sanitized = input.slice(0, maxLen);
  // Neutralize common prompt escape delimiters
  sanitized = sanitized.replace(/```/g, "'''");
  sanitized = sanitized.replace(/<\/?(?:system|instruction|prompt)>/gi, '');
  return sanitized.trim();
}

/**
 * Wraps untrusted candidate content in inert XML tags with explicit boundary instructions.
 */
export function wrapUntrustedContent(content: string, tag = 'candidate_untrusted_input'): string {
  const clean = sanitizeForPrompt(content);
  return `<${tag}>\n${clean}\n</${tag}>`;
}

/**
 * Validates that an email conforms to strict format standards.
 */
export function isValidEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email);
}
