import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { C, el } from '../../lib/og';

export const prerender = true;

/*
  OG for ccir.io/research/the-nearer-frontier — the pivot, as two donuts.

  Chosen over the roll and bar cards because it illustrates the TITLE
  ("SpaceX's Turn to Selling Compute"). X shows either an attached image or
  a link card, never both, so the card has to carry everything: the donuts
  give the scale of the turn, the footer carries the finding.

  Same segment order and color in both rings so the AI wedge reads across.
  Figures: 10-Q segment revenue disaggregation and Note 18 segment capex.
  ASCII only — the mono subset has no arrows or em-dashes.
*/
const AI = '#c96f06', CONN = '#3b82f6', SPACE = '#059669';
const RINGS = [
  {
    head: 'REVENUE', tot: '$7.81B',
    rows: [
      { k: 'Starlink / Connectivity', v: 4.291, c: CONN },
      { k: 'AI (selling compute)', v: 2.561, c: AI },
      { k: 'Space (launch)', v: 0.962, c: SPACE },
    ],
  },
  {
    head: 'CAPITAL EXPENDITURE', tot: '$18.37B',
    rows: [
      { k: 'Starlink / Connectivity', v: 1.367, c: CONN },
      { k: 'AI (building compute)', v: 15.828, c: AI },
      { k: 'Space (launch)', v: 1.174, c: SPACE },
    ],
  },
];

const R = 74, SW = 30, CIRC = 2 * Math.PI * R;

const fontDir = join(process.cwd(), 'node_modules/@fontsource/ibm-plex-mono/files');
const mono400 = readFileSync(join(fontDir, 'ibm-plex-mono-latin-400-normal.woff'));
const mono600 = readFileSync(join(fontDir, 'ibm-plex-mono-latin-600-normal.woff'));

function ring(spec: typeof RINGS[number]) {
  const tot = spec.rows.reduce((s, d) => s + d.v, 0);
  let acc = 0;
  const arcs = spec.rows.map((d) => {
    const frac = d.v / tot;
    const a = { ...d, frac, off: acc * CIRC };
    acc += frac;
    return a;
  });
  const box = R * 2 + SW + 8;
  return el('div', { display: 'flex', flexDirection: 'column', width: 500, alignItems: 'center' }, [
    el('div', { display: 'flex', color: C.faint, fontSize: 13, letterSpacing: 1.5, marginBottom: 14 }, spec.head),
    el('div', { display: 'flex', position: 'relative', width: box, height: box, alignItems: 'center', justifyContent: 'center' }, [
      {
        type: 'svg',
        props: {
          width: box, height: box, viewBox: `0 0 ${box} ${box}`,
          style: { position: 'absolute', left: 0, top: 0 },
          children: arcs.map((a) => ({
            type: 'circle',
            props: {
              cx: box / 2, cy: box / 2, r: R, fill: 'none', stroke: a.c, 'stroke-width': SW,
              'stroke-dasharray': `${Math.max(a.frac * CIRC - 3, 1)} ${CIRC}`,
              'stroke-dashoffset': -a.off,
              transform: `rotate(-90 ${box / 2} ${box / 2})`,
            },
          })),
        },
      },
      el('div', { display: 'flex', color: C.ink, fontSize: 22, fontWeight: 600 }, spec.tot),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', marginTop: 16, gap: 7 },
      arcs.map((a) =>
        el('div', { display: 'flex', alignItems: 'center', gap: 9 }, [
          el('div', { display: 'flex', width: 10, height: 10, borderRadius: 2, backgroundColor: a.c }, ''),
          el('div', { display: 'flex', color: C.dim, fontSize: 15, width: 236 }, a.k),
          el('div', { display: 'flex', color: a.c === AI ? AI : C.ink, fontSize: 15, fontWeight: 600 }, `${Math.round(a.frac * 100)}%`),
        ]),
      )),
  ]);
}

function card() {
  const head = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 12 }, [
      el('div', { display: 'flex', color: C.navy, fontSize: 24, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: C.dim, fontSize: 16 }, 'Market intelligence · note'),
    ]),
    el('div', { display: 'flex', color: C.dim, fontSize: 16 }, 'Q2 2026 · reported'),
  ]);

  const title = el('div', { display: 'flex', color: C.ink, fontSize: 42, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 },
    "The Nearer Frontier");
  const sub = el('div', { display: 'flex', color: C.dim, fontSize: 18, marginBottom: 22 },
    'A third of what comes in. Most of what goes out.');

  const rings = el('div', { display: 'flex', justifyContent: 'space-between', width: 1104 }, RINGS.map(ring));

  const foot = el('div', { display: 'flex', alignItems: 'flex-end', flexGrow: 1, justifyContent: 'space-between', fontSize: 14, letterSpacing: 1.4 }, [
    el('div', { display: 'flex', color: C.navy }, 'THE TURBINES POWERING IT HOLD NO PERMIT'),
    el('div', { display: 'flex', color: C.faint }, 'ccir.io/research/the-nearer-frontier'),
  ]);

  return el('div', {
    display: 'flex', flexDirection: 'column', width: 1200, height: 630,
    backgroundColor: C.bg, padding: 48, fontFamily: 'IBM Plex Mono',
  }, [head, title, sub, rings, foot]);
}

export const GET: APIRoute = async () => {
  const svg = await satori(card() as any, {
    width: 1200, height: 630,
    fonts: [
      { name: 'IBM Plex Mono', data: mono400, weight: 400, style: 'normal' },
      { name: 'IBM Plex Mono', data: mono600, weight: 600, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
