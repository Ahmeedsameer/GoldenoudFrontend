/**
 * Client-side search helper — normalizes every field the same way (lowercase,
 * trimmed) so callers never re-implement the normalization per page.
 */
export function matchesSearch(term: string, ...fields: (string | number | null | undefined)[]): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => String(f ?? '').toLowerCase().includes(needle));
}
