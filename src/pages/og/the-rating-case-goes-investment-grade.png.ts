import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/the-rating-case-goes-investment-grade. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · rating actions",
  "right": "2026-08-13",
  "titleLines": [
    "The Rating Case Goes Investment Grade"
  ],
  "sub": "Six rated GPU financings. The counterparty opens the grade; the structure sets the notch.",
  "rows": [
    [
      "IREN",
      "Microsoft take-or-pay",
      "A"
    ],
    [
      "CoreWeave",
      "Meta take-or-pay",
      "A3"
    ],
    [
      "Nscale",
      "hyperscaler take-or-pay",
      "Baa1"
    ],
    [
      "Lambda",
      "NVIDIA take-or-pay",
      "Baa2"
    ],
    [
      "CoreWeave",
      "unrated customers, two facilities",
      "Ba2 / BB+"
    ]
  ],
  "foot": "FROM MOODY'S / FITCH / DBRS RATING ACTIONS · MAR 31 – AUG 12, 2026",
  "url": "ccir.io/research/the-rating-case-goes-investment-grade"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
