import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/fitch-coreweave-ddtl-5-5. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · rating action",
  "right": "2026-07-17",
  "titleLines": [
    "Fitch's BB+ on CoreWeave's DDTL 5.5:",
    "The GPU Lease-Rate Assumption"
  ],
  "sub": "The leading rating-case assumption is new with this action: renewal at favorable GPU lease rates.",
  "rows": [
    [
      "Facility",
      "Proposed $2.6B delayed-draw term loan, in syndication",
      "BB+"
    ],
    [
      "Contracts",
      "Take-or-pay, generally 3–5 years per Fitch; debt matures later",
      ""
    ],
    [
      "Assumption #1",
      "“renew or replace … at favorable GPU lease rates”",
      "NEW"
    ],
    [
      "Track it",
      "Committed-term + on-demand reference rates, posted daily",
      "ccir.io/term"
    ]
  ],
  "foot": "FROM FITCH RATING ACTION COMMENTARIES · APR 30 / MAY 15 / JUL 16, 2026",
  "url": "ccir.io/research/fitch-coreweave-ddtl-5-5"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
