import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://pranaym.com',
  adapter: process.env.NODE_ENV === 'production' 
    ? cloudflare({ imageService: 'passthrough' })
    : node({ mode: 'standalone' }),
  integrations: [
    sitemap(),
    react(),
    keystatic(),
  ],
  devToolbar: {
    enabled: false,
  },
});
