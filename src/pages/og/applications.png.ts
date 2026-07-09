import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/applications. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Reference",
  "titleLines": [
    "Applications"
  ],
  "sub": "How a CCIR reference rate fits into credit agreements and citations.",
  "rows": [
    [
      "Covenants",
      "Drafting against a published H100 series",
      ""
    ],
    [
      "Re-leasing",
      "Rollover exposure against the live committed curve",
      ""
    ],
    [
      "Citation",
      "Benchmark-citation language, worked examples",
      ""
    ]
  ],
  "url": "ccir.io/applications"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
