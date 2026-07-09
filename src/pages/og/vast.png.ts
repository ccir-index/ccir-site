import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/vast. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Observatory · intraday",
  "titleLines": [
    "Vast.ai Observatory"
  ],
  "sub": "Marketplace microstructure: distributions, verification, tenancy.",
  "rows": [
    [
      "Distributions",
      "Per-chip price distributions",
      ""
    ],
    [
      "Panels",
      "Verified vs unverified machines",
      ""
    ],
    [
      "Segments",
      "Dedicated vs shared instances",
      ""
    ]
  ],
  "url": "ccir.io/vast"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
