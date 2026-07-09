import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/compute-glossary. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · primer",
  "right": "2026-07-09",
  "titleLines": [
    "A Compute Glossary",
    "for Finance Professionals"
  ],
  "sub": "The units in which capacity is sold, covenants are tested, and collateral is described.",
  "rows": [
    [
      "FLOPS",
      "Peak arithmetic — a ceiling, not a forecast",
      ""
    ],
    [
      "TB/s",
      "The inference constraint; rent per unit flat across generations",
      ""
    ],
    [
      "TDP · PUE",
      "Watts to megawatts — the chip-to-facility bridge",
      ""
    ],
    [
      "MFU · goodput",
      "What a renter actually extracts from peak",
      ""
    ]
  ],
  "foot": "NO MACHINE-LEARNING BACKGROUND ASSUMED",
  "url": "ccir.io/research/compute-glossary"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
