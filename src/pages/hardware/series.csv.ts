import type { APIRoute } from 'astro';
import hw from '../../data/hardware_panels.json';

export const prerender = true;

// Public download window (data terms §03, 2026-09-08): the current print and
// the trailing thirty days. Longer history is licensed.
const PUBLIC_DAYS = 30;
const dayNum = (d: string) => Date.parse(d.slice(0, 10) + 'T00:00:00Z');

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
  // Monthly grain: keep the months whose end falls inside the trailing
  // thirty days of the latest month in the record.
  const months = hw.models.flatMap((m) => m.monthly.map((p) => p.m));
  const lastM = months.length ? months.reduce((a, b) => (a > b ? a : b)) : '';
  const endOf = (ym: string) => { const [y, mo] = ym.split('-').map(Number); return Date.UTC(y, mo, 0); };
  const cutoff = lastM ? endOf(lastM) - (PUBLIC_DAYS - 1) * 86400000 : 0;
  for (const m of hw.models) {
    for (const p of m.monthly) {
      if (endOf(p.m) < cutoff) continue;
      body.push([m.key, p.m, p.med ?? '', p.n, p.units].map(esc).join(','));
    }
  }
  return new Response([header, ...body].join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};
