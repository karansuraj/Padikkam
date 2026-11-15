const MAX_MEANINGS = 3;
const MAX_LENGTH = 90;

/**
 * Make a Wikidata gloss fit on a flashcard: drop editor notes that mention item
 * ids ("(for physical venues, use Q132510 ...)"), keep the first few meanings,
 * and shorten anything still too long at a word boundary.
 */
export function tidyGloss(gloss: string): string {
  const withoutNotes = gloss.replace(/\s*\([^)]*\bQ\d{3,}\b[^)]*\)/g, '').trim();
  const meanings = withoutNotes
    .split(';')
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, MAX_MEANINGS)
    .join('; ');
  if (meanings.length <= MAX_LENGTH) return meanings;
  const room = meanings.slice(0, MAX_LENGTH - 1); // leave space for the ellipsis
  const lastSpace = room.lastIndexOf(' ');
  const base = lastSpace > 20 ? room.slice(0, lastSpace) : room;
  return `${base.replace(/[;,\s]+$/, '')}…`;
}
