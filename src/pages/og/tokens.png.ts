import type { APIRoute } from 'astro';
import { noteCardPng, CT } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/tokens — terminal (dark) palette, matching /term's
// card (the MI-monitor fleet look; the editorial fleet is for notes).
const SPEC = {
  "kicker": "Monitor · updated daily",
  "titleLines": [
    "Token Prices"
  ],
  "sub": "What a million tokens costs, measured on a constant basket of open-weight models.",
  "rows": [
    [
      "Fixed basket",
      "Five models, one per lab — membership frozen and versioned",
      ""
    ],
    [
      "Input / Output",
      "Separate posted $/Mtoken legs, never blended",
      ""
    ],
    [
      "Dispersion",
      "The same open weights, priced provider by provider",
      ""
    ]
  ],
  "url": "ccir.io/tokens"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng({ ...SPEC, palette: CT });
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
