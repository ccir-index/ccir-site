import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/markets. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Monitor · updated daily",
  "titleLines": [
    "Provider Time Series"
  ],
  "sub": "Per-provider list-ask series across 25+ neoclouds, hyperscalers, marketplaces.",
  "rows": [
    [
      "Snapshots",
      "Daily, per provider and chip",
      ""
    ],
    [
      "Coverage",
      "Premium chip generations",
      ""
    ],
    [
      "Grain",
      "The observability layer beneath the benchmark",
      ""
    ]
  ],
  "url": "ccir.io/markets"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
