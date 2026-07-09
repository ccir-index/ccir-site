import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/basis. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Monitor · updated daily",
  "titleLines": [
    "On-Demand vs Clearing Basis"
  ],
  "sub": "Posted list asks against marketplace clearing at matched tier.",
  "rows": [
    [
      "List",
      "Posted on-demand asks",
      ""
    ],
    [
      "Clearing",
      "The executable marketplace price",
      ""
    ],
    [
      "Basis",
      "Where list sits above what transacts",
      ""
    ]
  ],
  "url": "ccir.io/basis"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
