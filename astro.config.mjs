import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';

// Dev vs. production build. `astro build` runs with NODE_ENV=production.
const isDev = process.env.NODE_ENV !== 'production';

// https://astro.build/config
export default defineConfig({
  site: 'https://pranaym.com',
  // Production is a fully STATIC build deployed to Cloudflare Pages.
  // Keystatic's admin UI needs SSR, so it (and the node adapter that serves it)
  // are loaded in dev only — the CMS runs locally at /keystatic during `npm run dev`.
  ...(isDev ? { adapter: node({ mode: 'standalone' }) } : {}),
  integrations: [
    // Keep the noindex admin redirect out of the sitemap.
    sitemap({ filter: (page) => !page.includes('/admin') }),
    react(),
    ...(isDev ? [keystatic()] : []),
  ],
  devToolbar: {
    enabled: false,
  },
});
