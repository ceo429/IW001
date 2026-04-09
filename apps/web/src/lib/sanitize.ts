import DOMPurify from 'dompurify';

/**
 * Single entry point for any time we are forced to render user-supplied HTML.
 *
 * The first-class rule in this codebase: NEVER use `dangerouslySetInnerHTML`
 * directly. If you really must render HTML, route it through this function.
 * That way the ESLint rule `react/no-danger` can stay fully enforcing, with
 * this file as the one allow-listed exception.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  });
}
