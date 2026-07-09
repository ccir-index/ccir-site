import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/chip-economics. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Monitor · updated daily",
  "titleLines": [
    "Chip Economics"
  ],
  "sub": "Earning power per spec-sheet unit. One lens makes the cross-section flat.",
  "rows": [
    [
      "$ / GPU-hr",
      "The posted rate, as quoted",
      ""
    ],
    [
      "$ / PFLOP-hr",
      "Falls fastest with generation age",
      ""
    ],
    [
      "$ / TB/s-hr",
      "Flat across generations — the inference lens",
      ""
    ],
    [
      "$ / TDP-kW-hr",
      "What a watt delivered to silicon earns",
      ""
    ]
  ],
  "foot": "RE-DENOMINATED DAILY FROM PUBLISHED RATES",
  "url": "ccir.io/chip-economics"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
