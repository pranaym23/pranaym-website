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
  }),
});

export const collections = { blog, reads };
