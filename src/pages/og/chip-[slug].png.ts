import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { el } from '../../lib/og';
import { homeOdCell, homeIntCell, headlineValue, meta } from '../../data/snapshot';
import hw from '../../data/hardware_panels.json';
import { CHIPS } from '../../data/chips';

export const prerender = true;

/*
  Share card for /chip/<slug> — one generator for every registry chip.

  Reads the SAME selectors the page renders from (homeOdCell / homeIntCell /
  hardware ask median), so card and page cannot disagree; a below-floor cell
  prints an em dash exactly like the page. Few words: chip name, identity
  line, three figures with lane labels, as-of date.

  Committed is deliberately absent: it is market intelligence and the card
  format has no room for the mandatory not-citable mark.

  Type mirrors the baked-in design: Space Grotesk 600 carries the chip name
  (display face), IBM Plex Mono the data and chrome (the card generators'
  bundled mono).
*/

const T = {
  bg: '#0b0c0e', surface2: '#14181d',
  ink: '#e8e6e1', dim: '#9a9991', faint: '#6b6a64',
  rule: '#2a2d31', rule2: '#3b3f44',
  accent: '#ff9100',
};

const monoDir = join(process.cwd(), 'node_modules/@fontsource/ibm-plex-mono/files');
const mono400 = readFileSync(join(monoDir, 'ibm-plex-mono-latin-400-normal.woff'));
const mono600 = readFileSync(join(monoDir, 'ibm-plex-mono-latin-600-normal.woff'));
const skDir = join(process.cwd(), 'node_modules/@fontsource/space-grotesk/files');
const sk600 = readFileSync(join(skDir, 'space-grotesk-latin-600-normal.woff'));

export function getStaticPaths() {
  return CHIPS.map((c) => ({ params: { slug: c.slug }, props: { def: c } }));
}

const PAD = 56;

export const GET: APIRoute = async ({ props }) => {
  const def = props.def as (typeof CHIPS)[number];
  const spot = homeOdCell('T2', def.id);
  const intr = homeIntCell('T2', def.id);
  const hwModel = (hw.models as any[]).find((m) => m.key === def.hwKey);
  const askMed: number | null = hwModel?.ask?.med ?? null;
  const askN: number = hwModel?.ask?.n ?? 0;

  const fig = (lane: string, value: string, unit: string, metaLine: string) =>
    el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, flexBasis: 0, padding: '26px 28px', borderLeft: `1px solid ${T.rule}` }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, fontWeight: 600, letterSpacing: 2, color: T.dim }, lane),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 54, fontWeight: 600, color: T.accent, marginTop: 14 }, value),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 14, letterSpacing: 2, color: T.faint, marginTop: 8 }, unit),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 13, color: T.dim, marginTop: 14 }, metaLine),
    ]);

  const band = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58, flexShrink: 0, backgroundColor: T.surface2, borderBottom: `1px solid ${T.rule2}`, paddingLeft: PAD, paddingRight: PAD }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 18 }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 25, fontWeight: 600, letterSpacing: 5, color: T.accent }, 'CCIR'),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: 3, color: T.dim }, 'COMPUTE CREDIT INDEX RESEARCH'),
    ]),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: 3, color: T.dim }, 'CHIP INSTRUMENT'),
  ]);

  const head = el('div', { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: `34px ${PAD}px 26px` }, [
    el('div', { display: 'flex', flexDirection: 'column' }, [
      el('div', { display: 'flex', fontFamily: 'Space Grotesk', fontSize: 66, fontWeight: 600, color: T.ink, letterSpacing: -1 }, def.name),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 16, letterSpacing: 3, color: T.dim, marginTop: 10 },
        `${def.formFactor} ${def.memory} · ${def.generation.toUpperCase()} · INTRODUCED ${def.introduced.slice(0, 4)}`),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: 2.5, color: T.faint }, 'AS OF'),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 21, fontWeight: 600, color: T.ink, marginTop: 2 }, meta.as_of_date),
    ]),
  ]);

  const figures = el('div', { display: 'flex', flexGrow: 1, marginLeft: PAD, marginRight: PAD, border: `1px solid ${T.rule}`, backgroundColor: '#111418' }, [
    fig('SPOT · GUARANTEED · T2',
      spot ? `$${headlineValue(spot).toFixed(2)}` : '—',
      'USD / GPU-HR',
      spot ? `on-demand ask · n=${spot.n_sources}` : 'below the publication floor'),
    fig('INTERRUPTIBLE · T2',
      intr ? `$${headlineValue(intr).toFixed(2)}` : '—',
      'USD / GPU-HR',
      intr ? `revocable occupancy · n=${intr.n_sources}` : 'below the publication floor'),
    fig('SECONDARY ASK',
      askMed != null ? `$${Math.round(askMed).toLocaleString('en-US')}` : '—',
      'USD / UNIT',
      askMed != null ? `${def.hwLabel} · n=${askN} asks` : 'no posted-ask panel'),
  ]);

  const foot = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `22px ${PAD}px 30px` }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 14, color: T.dim }, 'No positions. Public prices, citable.'),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, fontWeight: 600, letterSpacing: 1, color: T.accent }, `ccir.io/chip/${def.slug}`),
  ]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: T.bg }, [band, head, figures, foot]);

  const svg = await satori(root as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'IBM Plex Mono', data: mono400, weight: 400, style: 'normal' },
      { name: 'IBM Plex Mono', data: mono600, weight: 600, style: 'normal' },
      { name: 'Space Grotesk', data: sk600, weight: 600, style: 'normal' },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
