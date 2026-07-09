import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/observatory. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Observatory",
  "titleLines": [
    "Availability Observatory"
  ],
  "sub": "Cross-provider availability and pricing grid; collection paused at the last published snapshot.",
  "rows": [
    [
      "Grid",
      "Availability and pricing across providers",
      ""
    ],
    [
      "Source",
      "Aggregator-sourced, three-state availability",
      ""
    ],
    [
      "Status",
      "Paused — last snapshot May 13, 2026",
      ""
    ]
  ],
  "url": "ccir.io/observatory"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
