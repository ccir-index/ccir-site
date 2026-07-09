import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/compute-contracts. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · primer",
  "right": "2026-07-09",
  "titleLines": [
    "The Compute Contract: From",
    "On-Demand Terms to Take-or-Pay"
  ],
  "sub": "How GPU-hours are actually sold — read from the filed documents.",
  "rows": [
    [
      "On-demand",
      "Published terms of service, accepted as-is",
      "per hour"
    ],
    [
      "Reserved",
      "Order form under standard terms",
      "1–12 mo"
    ],
    [
      "Committed MSA",
      "Fixed payments independent of usage",
      "1–6 yr"
    ],
    [
      "Beneath it all",
      "The datacenter lease, longer-dated than everything above",
      "~15 yr"
    ]
  ],
  "foot": "SEC-FILED MSAS · PUBLISHED TERMS · DATACENTER LEASES",
  "url": "ccir.io/research/compute-contracts"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
