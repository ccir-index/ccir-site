import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/basis-layer-measured. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · cross-section",
  "right": "2026-07-17",
  "titleLines": [
    "The Basis Layer, Measured:",
    "What a GPU-Hour's Price Depends On"
  ],
  "sub": "The same-name chip, the same day — priced by operator class, region, term, and interruptibility.",
  "rows": [
    [
      "Operator class",
      "H100 GTD on-demand, US: $9.15 / $3.63 / $2.89",
      "3.2×"
    ],
    [
      "Location",
      "Neocloud H100, EU below US ($2.74 vs $3.63)",
      "−25%"
    ],
    [
      "Term",
      "Within-provider H100 schedules, 1M out to 3Y",
      "−2% to −56%"
    ],
    [
      "Counterparty",
      "No posted price — filed spreads +2.25 to +9.62 over SOFR",
      "credit docs"
    ]
  ],
  "foot": "FROM THE 2026-07-17 DAILY PRINT · METHODOLOGY v2.2.0",
  "url": "ccir.io/research/basis-layer-measured"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
