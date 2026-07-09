import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/market-data. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Reference",
  "titleLines": [
    "Market Data"
  ],
  "sub": "The observability views beneath the published rates.",
  "rows": [
    [
      "Providers",
      "Per-provider list-ask time series",
      ""
    ],
    [
      "Marketplace",
      "Intraday clearing history",
      ""
    ],
    [
      "Availability",
      "Cross-provider observatories",
      ""
    ]
  ],
  "url": "ccir.io/market-data"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
