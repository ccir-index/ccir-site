import type { APIRoute } from 'astro';
import { noteCardPng, CT } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/term. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Monitor · updated daily",
  "titleLines": [
    "Committed Term Structure"
  ],
  "sub": "Posted committed asks by tenor — guaranteed capacity, one month to three years.",
  "rows": [
    [
      "On-demand",
      "The anchor end of the curve",
      ""
    ],
    [
      "1M – 3Y",
      "Committed asks per chip and tenor",
      ""
    ],
    [
      "The discount",
      "Each operator's committed ask vs its own on-demand rate, daily",
      ""
    ]
  ],
  "url": "ccir.io/term"
};

export const GET: APIRoute = async () => {
  // Terminal (dark) card — John 2026-07-16; the rest of the OG fleet stays editorial.
  const png = await noteCardPng({ ...SPEC, palette: CT });
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
