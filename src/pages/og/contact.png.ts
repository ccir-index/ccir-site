import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/contact. Content mirrors the page; regenerate by editing here.
const SPEC = {
  "kicker": "Contact",
  "titleLines": [
    "Contact CCIR"
  ],
  "sub": "Citation and use questions; data partnerships and corrections.",
  "rows": [
    [
      "Counsel",
      "Citation questions from lender and borrower counsel",
      ""
    ],
    [
      "Agencies",
      "Rating-agency and regulator queries",
      ""
    ],
    [
      "Operators",
      "Data partnerships and corrections",
      ""
    ]
  ],
  "url": "ccir.io/contact"
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
