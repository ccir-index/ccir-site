import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/gpu-spv. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · primer",
  "right": "2026-07-09",
  "titleLines": [
    "The GPU SPV: How Lenders",
    "Take Compute as Collateral"
  ],
  "sub": "Serial-number covenants, account control, and a rating that travels with the offtake.",
  "rows": [
    [
      "DDTL 1.0",
      "Aug 2023 — reported first large H100-collateralized loan",
      "14.1% actual"
    ],
    [
      "DDTL 4.0",
      "Mar 2026 — take-or-pay offtake, first IG-rated",
      "SOFR + 2.25%"
    ],
    [
      "DDTL 5.0",
      "May 2026 — two non-IG customers, parent-guaranteed",
      "SOFR + 4.50%"
    ],
    [
      "Every facility",
      "Amortizes the collateral to zero; no market residual",
      ""
    ]
  ],
  "foot": "FROM CREDIT AGREEMENTS FILED ON SEC EDGAR",
  "url": "ccir.io/research/gpu-spv"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
