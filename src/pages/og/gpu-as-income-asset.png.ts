import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/gpu-as-income-asset. Content mirrors the page.
const SPEC = {
  "kicker": "Research · primer",
  "right": "",
  "titleLines": [
    "The GPU as an Income Asset:",
    "Why Credit References a Lease Rate"
  ],
  "sub": "A GPU's earning power is a market lease rate — the variable under renewal, collateral, and coverage.",
  "rows": [
    [
      "Earning power",
      "The lease rate a GPU commands per hour, declining with age",
      ""
    ],
    [
      "Every credit Q",
      "Renewal, collateral, coverage — all reduce to that rate",
      ""
    ],
    [
      "Today",
      "Credit amortizes to zero — no citeable way to price the residual",
      ""
    ],
    [
      "The reference",
      "Published GPU lease rates, as oil references NYMEX",
      "ccir.io/rates"
    ]
  ],
  "foot": "CCIR · WE PUBLISH THE RATE; THE LENDER OWNS THE VALUATION",
  "url": "ccir.io/research/gpu-as-income-asset"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
