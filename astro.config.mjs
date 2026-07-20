import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://ccir.io';

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [
    sitemap({
      lastmod: new Date(),
      changefreq: 'daily',
      // trailingSlash:'never' strips the root to the bare origin
      // (https://ccir.io), but the homepage canonical Google selects is
      // https://ccir.io/ — so the homepage never matched the sitemap ("No
      // referring sitemaps detected" in GSC URL Inspection). Normalize the
      // root entry to the slashed canonical form; all other URLs already
      // match (slashless on both sides).
      serialize(item) {
        if (item.url === SITE || item.url === `${SITE}/`) {
          item.url = `${SITE}/`;
        }
        return item;
      },
    }),
  ],
});
