import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/term. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Monitor · updated daily",
  "titleLines": [
    "Committed Term Structure"
  ],
  "sub": "Posted committed asks by tenor — guaranteed capacity, one month to a year.",
  "rows": [
    [
      "On-demand",
      "The spot end of the curve",
      ""
    ],
    [
      "1–12 months",
      "Committed asks per chip and tenor",
      ""
    ],
    [
      "The discount",
      "Commitment priced against the spot rate, daily",
      ""
    ]
  ],
  "url": "ccir.io/term"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
