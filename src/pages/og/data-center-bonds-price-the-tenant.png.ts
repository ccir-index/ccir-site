import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';

export const prerender = true;

// OG card for ccir.io/research/data-center-bonds-price-the-tenant. Content mirrors the page; regenerate by editing here.
const SPEC = {
  kicker: 'Research · credit',
  right: '2026-09-25',
  titleLines: ['Data-Center Bonds', 'Price the Tenant'],
  sub: 'Bond coupons sorted by who stands behind the lease, Oct 2025 to Sep 2026.',
  rows: [
    ['Hyperscaler or IG tenant', '11 bonds', '5.70% to 7.875%'],
    ['Google-guaranteed lease', '5 bonds', '6.19% to 7.75%'],
    ['CoreWeave', '6 bonds', '7.00% to 9.875%'],
    ['Other unrated tenants', '3 bonds', '8.875% to 9.00%'],
  ] as [string, string, string][],
  foot: 'COUPONS AT PRICING FROM FILINGS AND RELEASES',
  url: 'ccir.io/research/data-center-bonds-price-the-tenant',
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
