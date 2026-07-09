import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research hub",
  "titleLines": [
    "CCIR Research"
  ],
  "sub": "Standing monitors updated daily; dated notes never revised in place.",
  "rows": [
    [
      "Asset Economics",
      "Chip economics · rent and age · MSRP recovery",
      ""
    ],
    [
      "Term & Price Structure",
      "Tenor · commitment discount · clearing basis",
      ""
    ],
    [
      "Demand & Utilization",
      "Realized vs posted · fleet utilization · workloads",
      ""
    ],
    [
      "Contracts & Credit",
      "The paper behind the prices",
      ""
    ],
    [
      "Precedents & History",
      "Prior markets for expensive, fast-improving machines",
      ""
    ]
  ],
  "url": "ccir.io/research"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
