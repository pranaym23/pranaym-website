import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.string().or(z.date()),
    friendlyDate: z.string(),
    description: z.string(),
    wordpressLink: z.string().url().optional(),
    layout: z.string().optional(),
  }),
});

export const collections = { blog };
