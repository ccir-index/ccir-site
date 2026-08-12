import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { C, el } from '../../lib/og';

export const prerender = true;

/*
  OG for ccir.io/research/two-order-books — the divergence chart, the
  note's hero: customer prepayments as a share of total debt, CoreWeave
  falling 132% -> 28% while Nebius rises to 70%. The two lines cross at
  38% on Dec 31, 2025 and run in opposite directions — the whole note in
  one picture. Figures identical to the page's chart 2 (EDGAR balance
  sheets, computed). ASCII only in text — the mono subset has no arrows.
*/
const BLUE = '#3b82f6', ORANGE = '#c96f06';

// (months since Dec 2023, percent)
const CRWV: [number, number][] = [
  [0, 132], [12, 51], [15, 46], [18, 44], [21, 38], [24, 38], [27, 30], [30, 28],
];
const NBIS: [number, number][] = [
  [18, 2], [21, 0.4], [24, 38], [27, 57], [30, 70],
];

const CW = 1000, CH = 330, PL = 64, PR = 150, PT = 16, PB = 40;
const xs = (m: number) => PL + (m / 30) * (CW - PL - PR);
const ys = (p: number) => PT + (1 - p / 140) * (CH - PT - PB);
const path = (pts: [number, number][]) =>
  pts.map(([m, p], i) => `${i === 0 ? 'M' : 'L'}${xs(m).toFixed(1)},${ys(p).toFixed(1)}`).join(' ');

const TICKS = [
  { m: 0, l: "Dec '23" }, { m: 12, l: "Dec '24" }, { m: 24, l: "Dec '25" }, { m: 30, l: "Jun '26" },
];
const YT = [0, 50, 100];

function chart() {
  const svgKids: any[] = [];
  for (const v of YT) {
    svgKids.push({ type: 'line', props: { x1: PL, y1: ys(v), x2: CW - PR, y2: ys(v), stroke: C.rule, 'stroke-width': 1 } });
  }
  svgKids.push({ type: 'path', props: { d: path(CRWV), fill: 'none', stroke: BLUE, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' } });
  svgKids.push({ type: 'path', props: { d: path(NBIS), fill: 'none', stroke: ORANGE, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' } });
  for (const [m, pv] of [CRWV[0], CRWV[CRWV.length - 1]]) {
    svgKids.push({ type: 'circle', props: { cx: xs(m), cy: ys(pv), r: 6, fill: BLUE } });
  }
  for (const [m, pv] of [NBIS[0], NBIS[NBIS.length - 1]]) {
    svgKids.push({ type: 'circle', props: { cx: xs(m), cy: ys(pv), r: 6, fill: ORANGE } });
  }

  const lab = (left: number, top: number, color: string, size: number, text: string, weight = 400, anchorEnd = false) => {
    const style: Record<string, string | number> = {
      display: 'flex', position: 'absolute', top,
      color, fontSize: size, fontWeight: weight,
      left: anchorEnd ? left - 90 : left,
      justifyContent: anchorEnd ? 'flex-end' : 'flex-start',
    };
    if (anchorEnd) style.width = 90;
    return el('div', style, text);
  };

  const labels = [
    ...YT.map((v) => lab(PL - 14, ys(v) - 10, C.faint, 15, `${v}%`, 400, true)),
    ...TICKS.map((t) => lab(xs(t.m) - 30, CH - 26, C.faint, 15, t.l)),
    lab(xs(30) + 14, ys(28) - 12, BLUE, 19, 'CoreWeave 28%', 600),
    lab(xs(30) + 14, ys(70) - 12, ORANGE, 19, 'Nebius 70%', 600),
    lab(xs(0) - 4, ys(132) - 32, BLUE, 17, '132%'),
  ];

  return el('div', { display: 'flex', position: 'relative', width: CW, height: CH }, [
    {
      type: 'svg',
      props: {
        width: CW, height: CH, viewBox: `0 0 ${CW} ${CH}`,
        style: { position: 'absolute', left: 0, top: 0 },
        children: svgKids,
      },
    },
    ...labels,
  ]);
}

const fontDir = join(process.cwd(), 'node_modules/@fontsource/ibm-plex-mono/files');
const mono400 = readFileSync(join(fontDir, 'ibm-plex-mono-latin-400-normal.woff'));
const mono600 = readFileSync(join(fontDir, 'ibm-plex-mono-latin-600-normal.woff'));

function card() {
  const head = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 12 }, [
      el('div', { display: 'flex', color: C.navy, fontSize: 24, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: C.dim, fontSize: 16 }, 'Market intelligence · note'),
    ]),
    el('div', { display: 'flex', color: C.dim, fontSize: 16 }, 'Q2 2026 · reported Aug 11-12'),
  ]);

  const title = el('div', { display: 'flex', color: C.ink, fontSize: 40, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 },
    'Two Order Books, Two Funding Machines');
  const sub = el('div', { display: 'flex', color: C.dim, fontSize: 18, marginBottom: 14 },
    'Customer prepayments as a share of total debt · computed from EDGAR filings');

  const fig = el('div', { display: 'flex', width: 1104, justifyContent: 'center' }, [chart() as any]);

  const foot = el('div', { display: 'flex', alignItems: 'flex-end', flexGrow: 1, justifyContent: 'space-between', fontSize: 14, letterSpacing: 1.4 }, [
    el('div', { display: 'flex', color: C.navy }, 'ONE DEMAND STORY. OPPOSITE MACHINES.'),
    el('div', { display: 'flex', color: C.faint }, 'ccir.io/research/two-order-books'),
  ]);

  return el('div', {
    display: 'flex', flexDirection: 'column', width: 1200, height: 630,
    backgroundColor: C.bg, padding: 48, fontFamily: 'IBM Plex Mono',
  }, [head, title, sub, fig, foot]);
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
