import type { APIRoute } from 'astro';
import { frame, toPng, el, C } from '../../lib/og';
import hw from '../../data/hardware_panels.json';

export const prerender = true;

/*
  OG card for /hardware (The Secondary Market): executed vs posted-ask
  tape for the headline models, derived from the same hardware_panels.json
  the page renders, so the card cannot drift from the page. ASCII only.
*/
const PICK = ['H100-80-SXM5', 'H200-141', 'A100-80-SXM4', 'A100-40', 'V100-32', 'V100-16'];
const byKey = new Map(hw.models.map((m: any) => [m.key, m]));
PICK.forEach((k) => { if (!byKey.has(k)) throw new Error(`og/hardware: missing model ${k}`); });

const usd = (v: number | null) =>
  v == null ? '-' : '$' + Math.round(v).toLocaleString('en-US');

const rows: [string, string, string, string][] = PICK.map((k) => {
  const m: any = byKey.get(k);
  const pct = m.pct_of_launch != null ? m.pct_of_launch.toFixed(0) + '%' : '-';
  return [m.label, usd(m.t90.med), usd(m.ask.med), pct];
});

const ROW_H = 46;
const table = el('div', { display: 'flex', flexDirection: 'column', width: 1104, border: `1px solid ${C.rule}`, backgroundColor: C.surface }, [
  el('div', { display: 'flex', alignItems: 'center', backgroundColor: C.head, borderBottom: `1px solid ${C.rule2}`, padding: '10px 18px' }, [
    el('div', { display: 'flex', width: 320, color: C.faint, fontSize: 13, letterSpacing: 1.5 }, 'MODEL'),
    el('div', { display: 'flex', width: 260, color: C.faint, fontSize: 13, letterSpacing: 1.5 }, 'EXECUTED MEDIAN (90D)'),
    el('div', { display: 'flex', width: 260, color: C.faint, fontSize: 13, letterSpacing: 1.5 }, 'POSTED ASK MEDIAN'),
    el('div', { display: 'flex', color: C.faint, fontSize: 13, letterSpacing: 1.5 }, '% OF LAUNCH'),
  ]),
  ...rows.map(([label, ex, ask, pct], idx) =>
    el('div', { display: 'flex', alignItems: 'center', height: ROW_H, borderBottom: idx === rows.length - 1 ? 'none' : `1px solid ${C.rule}`, padding: '0 18px' }, [
      el('div', { display: 'flex', width: 320, color: C.ink, fontSize: 19, fontWeight: 600 }, label),
      el('div', { display: 'flex', width: 260, color: C.navy, fontSize: 20, fontWeight: 600 }, ex),
      el('div', { display: 'flex', width: 260, color: C.dim, fontSize: 19 }, ask),
      el('div', { display: 'flex', color: C.dim, fontSize: 19 }, pct),
    ])
  ),
]);

export const GET: APIRoute = async () => {
  const units = hw.models.reduce((s: number, m: any) => s + m.vol3y.units, 0);
  const vol = hw.models.reduce((s: number, m: any) => s + m.vol3y.usd, 0);

  const body = el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1 }, [
    table,
    el('div', { display: 'flex', alignItems: 'flex-end', flexGrow: 1, color: C.dim, fontSize: 14, letterSpacing: 1.5, paddingBottom: 2 },
      `${units.toLocaleString('en-US')} UNITS · $${(vol / 1e6).toFixed(1)}M EXECUTED · JUL 2023 - JUL 2026 · OBSERVED PRICES, NOT VALUATIONS`),
  ]);

  const png = await toPng(frame(
    'The Secondary Market',
    'What datacenter GPUs are listed at - and execute at - over time.',
    body,
    hw.as_of,
  ));
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
