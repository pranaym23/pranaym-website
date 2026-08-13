import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    friendlyDate: z.string().optional(),
    description: z.string().optional(),
    canonical: z.string().optional(),
    wordpressLink: z.string().optional(),
  }),
});

const reads = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/reads' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    domain: z.string(),
    url: z.string().url(),
    pubDate: z.coerce.date(),
    takeaway: z.string(),
    // Optional hand-written <title>. Without it the title is derived from
    // `title` and trimmed to the SERP budget (see src/lib/seo.ts).
    seoTitle: z.string().optional(),
  }),
});

export const collections = { blog, reads };
