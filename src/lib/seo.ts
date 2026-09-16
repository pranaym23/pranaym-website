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

/**
 * Blog `<title>`s were emitted as `${title} — Pranay` with no ceiling, so the
 * longest few were truncated mid-word by Google. Trim the post title to what
 * is left of the budget instead, and drop the suffix entirely if even that
 * would not leave room for a meaningful title.
 */
export function buildPostTitle(title: string, suffix = ' — Pranay'): string {
  const clean = (title ?? '').trim();
  if (clean.length + suffix.length <= TITLE_BUDGET) return clean + suffix;
  return truncate(clean, TITLE_BUDGET - suffix.length) + suffix;
}

/** Meta descriptions are truncated around 155-160 characters. */
export function buildMetaDescription(text: string): string {
  return truncate(text, 155);
}

/**
 * BreadcrumbList for a content page. Breadcrumbs replace the bare URL in the
 * SERP and give crawlers an explicit parent/child relationship.
 */
export function buildBreadcrumbs(
  trail: Array<{ name: string; path: string }>,
  site = 'https://pranaym.com'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: new URL(crumb.path, site).href,
    })),
  };
}
