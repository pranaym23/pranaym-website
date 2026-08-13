// Title/description helpers shared by the content routes.

/** Google renders roughly 60 characters of a <title> before truncating. */
const TITLE_BUDGET = 60;

/** Cut at the last word boundary that fits, then add an ellipsis. */
export function truncate(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;

  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  // Only honour the word boundary if it is not absurdly early.
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,;:.\-]+$/, '')}…`;
}

/**
 * Reads titles come from academic papers and long-form essays, so many run
 * well past the SERP budget. Spend what is left on the most informative
 * suffix that still fits rather than always appending the longest one.
 */
export function buildReadTitle(title: string, seoTitle?: string): string {
  if (seoTitle) return seoTitle;

  const long = ' — Recommendation by Pranay';
  const short = ' — Pranay';

  if (title.length + long.length <= TITLE_BUDGET) return title + long;
  if (title.length + short.length <= TITLE_BUDGET) return title + short;
  return truncate(title, TITLE_BUDGET - short.length) + short;
}

/** Meta descriptions are truncated around 155 characters. */
export function buildReadDescription(
  title: string,
  author: string,
  takeaway: string
): string {
  return truncate(`Pranay's notes on "${title}" by ${author}: ${takeaway}`, 155);
}
