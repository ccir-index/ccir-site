import type { APIRoute } from 'astro';
import creditData from '../../../data/credit_instruments.json';

export const prerender = true;

/*
  Spread-at-signing series, CSV. Same selection as /credit/series#spreads:
  issuance-scope instruments (GPU-collateralized, disclosed size) with a
  disclosed SOFR spread and a parseable signing date. Spreads are as
  disclosed at signing and are never restated.
*/
const rows = (creditData.instruments as any[])
  .filter((i) => !i.exclude_from_issuance && typeof i.size_usd_m === 'number' && i.size_usd_m > 0)
  .filter((i) => i.rate?.kind === 'sofr_spread' && i.rate.value != null && /^\d{4}/.test(i.issued ?? ''))
  .map((i) => ({
    signed: i.issued,
    issuer: i.issuer,
    instrument: i.name,
    spread_pp_over_sofr: i.rate.value,
    size_usd_m: i.size_usd_m,
    status: i.status,
    source_url: i.source?.url ?? '',
  }))
  .sort((a, b) => a.signed.localeCompare(b.signed));

const esc = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET: APIRoute = () => {
  const header = 'signed,issuer,instrument,spread_pp_over_sofr,size_usd_m,status,source_url';
  const body = rows.map((r) => [r.signed, r.issuer, r.instrument, r.spread_pp_over_sofr, r.size_usd_m, r.status, r.source_url].map(esc).join(','));
  return new Response([header, ...body].join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};
