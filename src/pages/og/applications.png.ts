import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/applications. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Monitoring",
  "titleLines": [
    "Applications"
  ],
  "sub": "Worked examples of monitoring GPU-backed credit with market data.",
  "rows": [
    [
      "Earning power",
      "Collateral tracked against the market rate",
      ""
    ],
    [
      "Re-leasing",
      "Rollover exposure against the live committed curve",
      ""
    ],
    [
      "Pools",
      "Monitoring a multi-generation pool",
      ""
    ]
  ],
  "url": "ccir.io/applications"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
