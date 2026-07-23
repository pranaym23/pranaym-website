// src/pages/reads/rss.xml.ts — RSS 2.0 feed for the Recommended Reading collection.
// Hand-rolled (no @astrojs/rss dependency) so it works in the static build.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://pranaym.com';

function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const GET: APIRoute = async () => {
  const reads = await getCollection('reads');
  const sorted = reads.sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );

  const items = sorted
    .map((item) => {
      const link = `${SITE}/reads/${item.id}`;
      const pub = new Date(item.data.pubDate).toUTCString();
      return `    <item>
      <title>${esc(item.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pub}</pubDate>
      <author>${esc(item.data.author)}</author>
      <description>${esc(item.data.takeaway)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Recommended Reading — Pranay</title>
    <link>${SITE}/reads</link>
    <atom:link href="${SITE}/reads/rss.xml" rel="self" type="application/rss+xml" />
    <description>A curated collection of high-signal essays, papers, and articles with takeaways and commentary by Pranay.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
