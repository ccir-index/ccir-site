import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/marketplace. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Monitor · intraday",
  "titleLines": [
    "Marketplace Rates"
  ],
  "sub": "Least-expensive available rates from GPU marketplaces, every three hours.",
  "rows": [
    [
      "Window",
      "Seven days, per-cycle history",
      ""
    ],
    [
      "Unit",
      "Least-expensive available listing per cycle",
      ""
    ],
    [
      "Layer",
      "The clearing venues beneath the posted asks",
      ""
    ]
  ],
  "url": "ccir.io/marketplace"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
