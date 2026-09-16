import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Sitemap entries shipped without `lastmod`, so crawlers had no signal about
 * which of the ~250 URLs had actually changed. Read each entry's `pubDate`
 * straight from the content frontmatter and attach it.
 */
function buildLastmodIndex() {
  const index = new Map();
  for (const [dir, prefix] of [
    ['src/content/blog', '/blog/'],
    ['src/content/reads', '/reads/'],
  ]) {
    let files = [];
    try {
      files = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(md|mdoc)$/.test(file)) continue;
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const match = raw.match(/^pubDate:\s*["']?([^"'\n]+)["']?\s*$/m);
      if (!match) continue;
      const date = new Date(match[1].trim());
      if (Number.isNaN(date.getTime())) continue;
      const slug = file.replace(/\.(md|mdoc)$/, '');
      index.set(`${prefix}${slug}/`, date.toISOString());
    }
  }
  return index;
}

const lastmodIndex = buildLastmodIndex();

// Index pages are only as fresh as the newest thing they list.
const newestIn = (prefix) => {
  const dates = [...lastmodIndex.entries()]
    .filter(([url]) => url.startsWith(prefix))
    .map(([, date]) => date)
    .sort();
  return dates.length ? dates[dates.length - 1] : undefined;
};

// Dev vs. production build. `astro build` runs with NODE_ENV=production.
const isDev = process.env.NODE_ENV !== 'production';

// https://astro.build/config
export default defineConfig({
  site: 'https://pranaym.com',
  // Cloudflare Pages serves directory routes at `/about/`, so every internal
  // href must carry the trailing slash — otherwise each click costs a 308.
  trailingSlash: 'always',
  // Production is a fully STATIC build deployed to Cloudflare Pages.
  // Keystatic's admin UI needs SSR, so it (and the node adapter that serves it)
  // are loaded in dev only — the CMS runs locally at /keystatic during `npm run dev`.
  ...(isDev ? { adapter: node({ mode: 'standalone' }) } : {}),
  integrations: [
    // Keep the noindex admin redirect out of the sitemap.
    sitemap({
      filter: (page) => !page.includes('/admin'),
      serialize(item) {
        const { pathname } = new URL(item.url);
        const lastmod =
          lastmodIndex.get(pathname) ??
          (pathname === '/blog/' ? newestIn('/blog/') : undefined) ??
          (pathname === '/reads/' || pathname.startsWith('/reads/page/')
            ? newestIn('/reads/')
            : undefined) ??
          (pathname === '/' ? newestIn('/') : undefined);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
    // Render Keystatic's .mdoc output (Markdoc) alongside the legacy .md posts.
    markdoc(),
    react(),
    ...(isDev ? [keystatic()] : []),
  ],
  devToolbar: {
    enabled: false,
  },
});
