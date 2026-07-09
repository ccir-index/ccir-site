import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/gpu-age-curve. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · note",
  "right": "2026-07-06",
  "titleLines": [
    "Rent and Age:",
    "Five Generations"
  ],
  "sub": "The July 6, 2026 posted-rate cross-section, V100 to B300.",
  "rows": [
    [
      "$ / GPU-hr",
      "Falls with age, five generations in one line",
      "~ −26%/yr"
    ],
    [
      "$ / TB/s-hr",
      "Flat from A100 to B300 — the inference lens",
      ""
    ],
    [
      "$ / TDP-kW-hr",
      "Banded per watt delivered to silicon",
      ""
    ]
  ],
  "url": "ccir.io/research/gpu-age-curve"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
