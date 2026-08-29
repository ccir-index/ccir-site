import type { APIRoute } from 'astro';
import vvti from '../../data/vvti_daily.json';

export const prerender = true;

/*
  CCIR Vercel Volume Token Index (VVTI), daily. The volume-weighted posted
  price of an output token: each model's posted first-party price weighted
  by its share of daily token volume on Vercel's AI Gateway, renormalized
  over the priced set. Coverage is that priced share of gateway tokens, and
  it is disclosed per day rather than smoothed away.

  open_weight_avg is the same construction over open-weight providers only,
  the reference line on the chart.

  Weights: Vercel "AI Gateway Leaderboard Data" (CC BY 4.0). CCIR
  calculation; Vercel publishes shares only. Construction: /tokens.
*/
const esc = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET: APIRoute = () => {
  const header =
    'date,vvti_output_usd_per_mtok,open_weight_avg_usd_per_mtok,coverage_pct';
  const body = vvti.series.map((p) =>
    [p.date, p.vvti, p.open_avg, p.coverage].map(esc).join(','),
  );
  return new Response([header, ...body].join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};
