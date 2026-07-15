import type { APIRoute } from 'astro';
import hw from '../../data/hardware_panels.json';

export const prerender = true;

/*
  Monthly executed hardware price series, CSV. Median sale price per GPU
  across sold listings (each listing counts once at its average sale
  price), single-card listings only; n = sold listings in the month,
  units = total units those listings sold. Observed prices, not residual
  value opinions. Window and provenance: /hardware Method.
*/
const esc = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET: APIRoute = () => {
  const header = 'model,month,median_usd,n_listings,units';
  const body: string[] = [];
  for (const m of hw.models) {
    for (const p of m.monthly) {
      body.push([m.key, p.m, p.med ?? '', p.n, p.units].map(esc).join(','));
    }
  }
  return new Response([header, ...body].join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};
