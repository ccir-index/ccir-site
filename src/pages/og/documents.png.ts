import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/documents. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Reference documents",
  "titleLines": [
    "Reference Documents"
  ],
  "sub": "What a citation of any CCIR series relies on.",
  "rows": [
    [
      "Methodology",
      "What the series measure, and how",
      ""
    ],
    [
      "How we publish",
      "Versions, restatements, independence",
      ""
    ],
    [
      "Data terms",
      "What you may use without asking",
      ""
    ]
  ],
  "url": "ccir.io/documents"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
