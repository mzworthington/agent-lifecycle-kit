/**
 * Redact credential-like values from eval report text before upload or display.
 */
export function redactSecrets(text: string): string {
  return text
    .replace(/\b(sk-[A-Za-z0-9_-]{8,})\b/g, '[REDACTED_API_KEY]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi, '$1[REDACTED_TOKEN]')
    .replace(
      /\b(api[_-]?key|token|password|secret)\b(["']?\s*[:=]\s*["']?)([^"'\s,}]{6,})/gi,
      '$1$2[REDACTED]'
    );
}
