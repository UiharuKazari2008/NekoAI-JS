/**
 * Deduplicate tags in a comma-separated string (case-insensitive)
 * @param prompt - Prompt string with tags separated by commas
 * @returns Deduplicated prompt string
 */
export function deduplicateTags(prompt: string): string {
  if (!prompt) return prompt;

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const tag of prompt.split(",")) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(trimmed);
    }
  }

  return deduped.join(", ");
}
