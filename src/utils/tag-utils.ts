/**
 * Deduplicate tags in a comma-separated string (case-insensitive).
 * Newlines in the source prompt are preserved: any line breaks found in the
 * whitespace preceding a tag are re-attached to that tag so intentional
 * prompt formatting survives deduplication.
 * @param prompt - Prompt string with tags separated by commas
 * @returns Deduplicated prompt string
 */
export function deduplicateTags(prompt: string): string {
  if (!prompt) return prompt;

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const tag of prompt.split(",")) {
    // Keep any line breaks that appear in the leading whitespace of this tag.
    const leadingWhitespace = tag.match(/^\s*/)?.[0] ?? "";
    const leadingNewlines = leadingWhitespace.replace(/[^\n]/g, "");
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(leadingNewlines + trimmed);
    }
  }

  return deduped.join(", ");
}
