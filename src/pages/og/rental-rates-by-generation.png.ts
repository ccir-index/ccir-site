import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/rental-rates-by-generation. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · note",
  "right": "2026-07-08",
  "titleLines": [
    "GPU Rental Rates by Generation:",
    "Nine Years of Posted Prices"
  ],
  "sub": "Per-generation histories from dated captures of providers’ own pages.",
  "rows": [
    [
      "V100",
      "Oct 2017 – Apr 2026, stepped declines set by repricers",
      "−21.1%/yr"
    ],
    [
      "A100",
      "Flat nominal is roughly −6% real",
      "−7.0%/yr"
    ],
    [
      "H100",
      "Interrupted twice by demand episodes",
      "−13.0%/yr"
    ],
    [
      "2026",
      "Prior-generation repricing: sharpest in the record",
      ""
    ]
  ],
  "url": "ccir.io/research/rental-rates-by-generation"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
