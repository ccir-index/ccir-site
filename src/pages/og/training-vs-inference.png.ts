import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/training-vs-inference. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · primer",
  "right": "2026-07-07",
  "titleLines": [
    "Training, Inference, and",
    "What Compute Earns"
  ],
  "sub": "A primer for credit readers: two workloads, two demand profiles.",
  "rows": [
    [
      "Training",
      "Construction backlog — lumpy, concentrated, contract-wrapped",
      ""
    ],
    [
      "Inference",
      "Utility load — diffuse, recurring, diurnal",
      ""
    ],
    [
      "Observables",
      "Tenor · price by generation · realized vs posted",
      ""
    ]
  ],
  "url": "ccir.io/research/training-vs-inference"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
