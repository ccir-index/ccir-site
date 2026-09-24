import type { APIRoute } from 'astro';
import { frame, toPng, el, C } from '../../lib/og';
import { asOf, chips, latestByChip } from '../../data/discovery';

export const prerender = true;

/*
  OG card for /discovery, from the same module the page renders from.
  Per chip: series shown, then the cheapest and dearest zone's latest daily
  value. No median (owner ruling: no median note anywhere on this surface). "AWS" appears in plain text only; no logo and no AWS orange.
*/
const COLS = [
  { key: 'chip', label: 'CHIP', w: 300, align: 'flex-start' },
  { key: 'n', label: 'SERIES', w: 200, align: 'flex-end' },
  { key: 'lo', label: 'CHEAPEST ZONE', w: 300, align: 'flex-end' },
  { key: 'hi', label: 'DEAREST ZONE', w: 300, align: 'flex-end' },
] as const;
const usd = (v: number) => `$${v.toFixed(2)}`;

export const GET: APIRoute = async () => {
  const head = el('div', { display: 'flex', height: 36, borderBottom: `1px solid ${C.rule2}`, backgroundColor: C.head },
    COLS.map((c) => el('div', { display: 'flex', width: c.w, justifyContent: c.align, alignItems: 'center', padding: '0 16px', color: C.dim, fontSize: 13, letterSpacing: 1.5 }, c.label)));
  const rows = chips.map((chip) => {
    const s = latestByChip(chip);
    if (!s) return null;
    const cells: Record<string, string> = { chip, n: String(s.n), lo: usd(s.lo), hi: usd(s.hi) };
    return el('div', { display: 'flex', height: 56, borderBottom: `1px solid ${C.rule}` },
      COLS.map((c) => el('div', {
        display: 'flex', width: c.w, justifyContent: c.align, alignItems: 'center', padding: '0 16px',
        fontSize: c.key === 'chip' ? 22 : 24, fontWeight: 600,
        color: c.key === 'n' ? C.dim : C.ink,
      }, cells[c.key])));
  }).filter(Boolean);
  const note = el('div', { display: 'flex', marginTop: 14, color: C.faint, fontSize: 14 },
    'USD per GPU-hour · daily time-weighted average per zone · one day late · ccir.io/discovery');
  const body = el('div', { display: 'flex', flexDirection: 'column', backgroundColor: C.surface, border: `1px solid ${C.rule}` }, [head, ...rows]);
  const png = await toPng(frame(
    'Hyperscaler Interruptible Grade Price Discovery',
    'Global AWS spot prices per GPU-hour, by zone',
    el('div', { display: 'flex', flexDirection: 'column' }, [body, note]),
    asOf,
  ));
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
