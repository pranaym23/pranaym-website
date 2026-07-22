import { config, fields, collection } from '@keystatic/core';

export default config({
  // Offline-first: Keystatic runs locally in `npm run dev` and writes markdown
  // straight to disk (src/content/**). No network/GitHub auth needed. Publish
  // by committing + pushing — Cloudflare Pages then deploys.
  storage: { kind: 'local' },
  collections: {
    blog: collection({
      label: 'Blog Posts',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        pubDate: fields.date({ label: 'Publication Date' }),
        description: fields.text({ label: 'SEO Description', multiline: true }),
        friendlyDate: fields.text({ label: 'Friendly Date (e.g. July 2026)' }),
        canonical: fields.text({ label: 'Canonical URL' }),
        wordpressLink: fields.text({ label: 'Original WordPress URL (optional)' }),
        content: fields.markdoc({ label: 'Post Content' }),
      },
    }),
    reads: collection({
      label: 'Recommended Reading',
      slugField: 'title',
      path: 'src/content/reads/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        author: fields.text({ label: 'Author' }),
        domain: fields.text({ label: 'Domain (e.g. situational-awareness.ai)' }),
        url: fields.text({ label: 'Original Article URL' }),
        pubDate: fields.date({ label: 'Date Added' }),
        takeaway: fields.text({ label: 'Key Takeaway / Quote', multiline: true }),
        content: fields.markdoc({ label: 'Personal Commentary & Notes' }),
      },
    }),
  },
});
