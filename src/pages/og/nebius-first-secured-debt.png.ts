import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/nebius-first-secured-debt. Content mirrors the
// page; regenerate by editing here.
const SPEC = {
  "kicker": "Research · new issuance",
  "right": "2026-07-20",
  "titleLines": [
    "Nebius's First Secured Debt:",
    "A $775M GPU-Backed Term Loan"
  ],
  "sub": "The company's first secured debt — after a debt history made up entirely of convertible notes.",
  "rows": [
    [
      "Facility",
      "$775M senior secured term loan, SOFR+2.50%, due 2030",
      "FIRST SECURED"
    ],
    [
      "Security",
      "Deployed GPUs + contracted cash flows",
      "1.15x DSCR"
    ],
    [
      "Was",
      "Convertible notes — unsecured, equity-linked",
      ""
    ],
    [
      "Track it",
      "Every GPU-backed facility, traced to a filing",
      "ccir.io/credit"
    ]
  ],
  "foot": "FROM NEBIUS PRESS RELEASE + FORM 6-K · JUL 10 / JUL 17, 2026",
  "url": "ccir.io/research/nebius-first-secured-debt"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
