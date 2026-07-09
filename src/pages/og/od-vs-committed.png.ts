import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/od-vs-committed. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · note",
  "right": "2026-07-06",
  "titleLines": [
    "The Commitment Discount: Three",
    "Years of H100 Posted Prices"
  ],
  "sub": "Neocloud on-demand vs committed posted prices, Oct 2023 – Jun 2026.",
  "rows": [
    [
      "The discount",
      "Committed consistently posted below on-demand",
      ""
    ],
    [
      "The floor",
      "On-demand held near $2.80 through 2025",
      "$2.80"
    ],
    [
      "The turn",
      "Posted prices moving up since December 2025",
      ""
    ]
  ],
  "url": "ccir.io/research/od-vs-committed"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
