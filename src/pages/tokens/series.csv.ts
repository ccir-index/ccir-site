import type { APIRoute } from 'astro';
import { series } from '../../data/vvti';

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
  // The lake carries full precision; this file is the citable artifact, so
  // it publishes at a stated precision instead. 4dp on the price legs keeps
  // every displayed 2dp value recoverable without printing eight digits of
  // false precision on a $/Mtok figure.
  const px = (v: number | null) => (v === null ? '' : v.toFixed(4));
  const body = series.map((p) =>
    [p.date, px(p.vvti), px(p.open_avg), p.coverage.toFixed(2)]
      .map(esc).join(','),
  );
  return new Response([header, ...body].join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};
