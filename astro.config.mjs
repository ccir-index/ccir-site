import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://ccir.io';

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  // The editorial-register rules in base.css assume page-scoped styles carry
  // zero scoping specificity (":where()-scoped", see the register comment).
  // Astro 5's default strategy is 'attribute', which made every note's own
  // scoped `.sec p { font-size: var(--fs-md) }` (13px) beat the register's
  // 16px reading size — found 2026-08-19 on /research/the-rating-case-goes-
  // investment-grade. 'where' restores the documented cascade.
  scopedStyleStrategy: 'where',
  build: {
    format: 'file',
  },
  integrations: [
    sitemap({
      lastmod: new Date(),
      changefreq: 'daily',
      // /realized (a pre-redesign hand-built static tool) was retired
      // 2026-08-28 — deleted from public/, 301 to /hardware in _redirects,
      // and dropped from the sitemap here.
      // trailingSlash:'never' strips the root to the bare origin
      // (https://ccir.io), but the homepage canonical Google selects is
      // https://ccir.io/ — so the homepage never matched the sitemap ("No
      // referring sitemaps detected" in GSC URL Inspection). Normalize the
      // root entry to the slashed canonical form; all other URLs already
      // match (slashless on both sides).
      // /tokenindex (2026-08-29) is a share-link shim: it serves the candle
      // OG card and bounces to /tokens. It carries noindex, so listing it
      // here would point Google at a page that asks not to be indexed.
      filter: (page) => !/\/tokenindex\/?$/.test(page),
      serialize(item) {
        if (item.url === SITE || item.url === `${SITE}/`) {
          item.url = `${SITE}/`;
        }
        return item;
      },
    }),
  ],
});
