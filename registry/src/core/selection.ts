/** Pure helpers for the "ask about selected text" feature. */

export const MAX_SELECTION_CHARS = 600;
export const MAX_SELECTION_ITEMS = 8;

/**
 * Collapse whitespace and cap the length of a raw text selection.
 * Returns null when nothing meaningful was selected.
 */
export function normalizeSelection(
  text: string,
  maxChars = MAX_SELECTION_CHARS,
): string | null {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return null;
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars).trimEnd()}…`;
}

/**
 * Normalize and append a selection while keeping pending context bounded.
 * Duplicate selections are ignored and the oldest item is dropped first
 * when the cap is reached.
 */
export function appendSelection(
  selections: readonly string[],
  rawSelection: string,
  maxItems = MAX_SELECTION_ITEMS,
): string[] {
  const normalized = normalizeSelection(rawSelection);
  if (!normalized || selections.includes(normalized)) return [...selections];
  const cap = Math.max(1, Math.floor(maxItems));
  return [...selections, normalized].slice(-cap);
}

/**
 * Prepend the quoted selection to the user's question as a markdown
 * blockquote, so the model (and the transcript) see what was selected.
 */
export function buildQuotedMessage(
  quotes: readonly string[],
  question: string,
): string {
  const quoted = quotes
    .flatMap((quote) => quote.split("\n").map((line) => `> ${line}`))
    .join("\n");
  return `${quoted}\n\n${question}`;
}
