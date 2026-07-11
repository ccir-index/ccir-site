import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/rent-and-msrp. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · note",
  "right": "2026-07-08 · restated 07-11",
  "titleLines": [
    "Rent and MSRP: Five",
    "Generations of Posted Prices"
  ],
  "sub": "Cumulative rental revenue against the MSRP anchor, 2017–2026.",
  "rows": [
    [
      "Net, all-in",
      "Realization, facility rent, and overhead per filings",
      "V100 31mo · A100 37mo · H100 not yet"
    ],
    [
      "Gross ceiling",
      "Posted-rate revenue passed MSRP, every generation",
      "8–14 mo"
    ],
    [
      "The rule",
      "CCIR publishes the prices, not the elections",
      ""
    ]
  ],
  "url": "ccir.io/research/rent-and-msrp"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
