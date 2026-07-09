import type { APIRoute } from 'astro';
import { toPng, el, C } from '../../lib/og';

export const prerender = true;

/*
  OG card for /research/itel-1979. Custom layout (the title is too long for
  the shared frame's single-line slot): masthead, two-line display title,
  four-row timeline, footer. All figures mirror the page.
*/

const ROWS: [string, string, string][] = [
  ['1978', 'Record profit reported — restated under audit, against residual values', '$47.2M -> $21.5M'],
  ['Jan 30, 1979', 'IBM announces the 4300: ~3.2× the performance, up to 30% cheaper', ''],
  ['FY 1979', 'Net loss — about $2.0B in 2026 dollars — ~$370M landing in H2', '−$433.3M'],
  ['Jan 19, 1981', 'Chapter 11 — among the largest U.S. bankruptcies to that date', ''],
];

export const GET: APIRoute = async () => {
  const top = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 26 }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 12 }, [
      el('div', { display: 'flex', color: C.navy, fontSize: 24, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: C.dim, fontSize: 16 }, 'Research · historical record'),
    ]),
    el('div', { display: 'flex', color: C.dim, fontSize: 16 }, 'Itel, 1975–1983'),
  ]);

  const title = el('div', { display: 'flex', flexDirection: 'column', marginBottom: 10, gap: 2 }, [
    el('div', { display: 'flex', color: C.ink, fontSize: 44, fontWeight: 600, letterSpacing: 0.5 }, 'The Company That Insured Itself'),
    el('div', { display: 'flex', color: C.ink, fontSize: 44, fontWeight: 600, letterSpacing: 0.5 }, 'Against Technological Change'),
  ]);

  const sub = el('div', { display: 'flex', color: C.dim, fontSize: 17, marginBottom: 24 },
    'The market repriced the machines in one day; the books caught up one contract at a time.');

  const table = el('div', { display: 'flex', flexDirection: 'column', border: `1px solid ${C.rule}`, backgroundColor: C.surface }, [
    ...ROWS.map(([when, what, fig], i) =>
      el('div', { display: 'flex', alignItems: 'center', height: 58, borderBottom: i === ROWS.length - 1 ? 'none' : `1px solid ${C.rule}`, padding: '0 20px' }, [
        el('div', { display: 'flex', width: 158, color: C.ink, fontSize: 17, fontWeight: 600 }, when),
        el('div', { display: 'flex', flexGrow: 1, color: C.dim, fontSize: 16.5 }, what),
        el('div', { display: 'flex', color: C.navy, fontSize: 20, fontWeight: 600 }, fig),
      ])
    ),
  ]);

  const foot = el('div', { display: 'flex', alignItems: 'flex-end', flexGrow: 1, justifyContent: 'space-between', color: C.faint, fontSize: 14, letterSpacing: 1.5 }, [
    el('div', { display: 'flex' }, 'FROM THE CONTEMPORANEOUS RECORD — NYT · UPI · SEC FILINGS'),
    el('div', { display: 'flex' }, 'ccir.io/research/itel-1979'),
  ]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: C.bg, padding: 48, fontFamily: 'IBM Plex Mono' }, [
    top, title, sub, table, foot,
  ]);

  const png = await toPng(root);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
