// src/pages/blog/rss.xml.ts — RSS 2.0 feed for the writing archive.
// Hand-rolled (no @astrojs/rss dependency) to match src/pages/reads/rss.xml.ts.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://pranaym.com';

function esc(s: string): string {
  return (s ?? '')
    // XML 1.0 forbids most C0 control characters outright - strip before escaping.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog');
  const sorted = posts.sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );

  const buildDate = new Date(
    sorted[0]?.data.pubDate ?? Date.now()
  ).toUTCString();

  const items = sorted
    .map((post) => {
      const link = `${SITE}/blog/${post.id}/`;
      const pub = new Date(post.data.pubDate).toUTCString();
      return `    <item>
      <title>${esc(post.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pub}</pubDate>
      <dc:creator>Pranay Mehrotra</dc:creator>
      <description>${esc(post.data.description ?? '')}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Writing — Pranay</title>
    <link>${SITE}/blog/</link>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Essays, reflections, and technical articles by Pranay Mehrotra.</description>
    <language>en</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
