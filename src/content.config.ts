// Content collections. `methodology` holds the public methodology text
// (src/content/methodology/methodology.md), read by
// src/pages/documents/methodology.astro through src/lib/methodology-md.mjs.
// Declared here so Astro does not auto-generate a legacy collection for the
// folder; the page reads the file directly (?raw) rather than through
// getCollection, because it renders with its own remark pipeline.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const methodology = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/methodology' }),
});

export const collections = { methodology };
