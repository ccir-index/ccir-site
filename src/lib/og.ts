/*
  Shared Open Graph card renderer. Builds a 1200x630 editorial-cream card
  (CCIR masthead + title + a tier table) from live snapshot data via
  satori -> resvg. Used by /og/tiers.png, /og/home.png, /og/spreads.png.
*/
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fontDir = join(process.cwd(), 'node_modules/@fontsource/ibm-plex-mono/files');
const mono400 = readFileSync(join(fontDir, 'ibm-plex-mono-latin-400-normal.woff'));
const mono600 = readFileSync(join(fontDir, 'ibm-plex-mono-latin-600-normal.woff'));

export const C = {
  bg: '#f5f1e8', surface: '#fbf7ee', head: '#efeadd', rule: '#d4d0c4', rule2: '#b8b3a4',
  ink: '#0d0d0d', dim: '#5b5852', faint: '#8e8a82', navy: '#143055',
};

// satori consumes the React element shape at runtime; build it with plain objects
export const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: children === undefined ? { style } : { style, children },
});

export type Cell = { price_median: number; n_sources: number } | null;
export type LadderRow = { chip: string; cells: Record<string, Cell> };

const W_SILICON = 174;
const W_MED = 222;
const W_N = 88;
const W_TIER = W_MED + W_N; // 310 × 3 + 174 = 1104
const ROW_H = 62;

export function tierTable(opts: {
  tiers: readonly string[];
  labelOf: (t: string) => string;
  ladder: LadderRow[];
  secondaryHeader: string;
  secondary: (cell: Cell, tier: string, cells: Record<string, Cell>) => string;
}) {
  const { tiers, labelOf, ladder, secondaryHeader, secondary } = opts;

  const tierHead = (t: string) =>
    el('div', { display: 'flex', flexDirection: 'column', width: W_TIER, borderLeft: `1px solid ${C.rule}` }, [
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 46, color: t === tiers[0] ? C.navy : C.dim, gap: 2 }, [
        el('div', { display: 'flex', fontSize: 22, fontWeight: 600, letterSpacing: 2 }, t),
        el('div', { display: 'flex', fontSize: 12, fontWeight: 400, letterSpacing: 2, color: C.dim }, labelOf(t).toUpperCase()),
      ]),
      el('div', { display: 'flex', borderTop: `1px solid ${C.rule}` }, [
        el('div', { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: W_MED, height: 30, padding: '0 14px', color: C.faint, fontSize: 11, letterSpacing: 1.5 }, 'MEDIAN $/HR'),
        el('div', { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: W_N, height: 30, padding: '0 14px', color: C.faint, fontSize: 11, letterSpacing: 1.5, borderLeft: `1px solid ${C.rule}` }, secondaryHeader),
      ]),
    ]);

  const headerRow = el('div', { display: 'flex', height: 78, backgroundColor: C.head, borderBottom: `1px solid ${C.rule2}` }, [
    el('div', { display: 'flex', alignItems: 'flex-end', width: W_SILICON, height: '100%', padding: '0 16px 12px', color: C.dim, fontSize: 15, fontWeight: 600, letterSpacing: 2 }, 'SILICON'),
    ...tiers.map((t) => tierHead(t)),
  ]);

  const bodyRows = ladder.map(({ chip, cells }) =>
    el('div', { display: 'flex', height: ROW_H, borderBottom: `1px solid ${C.rule}` }, [
      el('div', { display: 'flex', alignItems: 'center', width: W_SILICON, padding: '0 16px', color: C.ink, fontSize: 19, fontWeight: 600, letterSpacing: 1 }, chip.replace(/-/g, ' ')),
      ...tiers.flatMap((t) => {
        const c = cells[t];
        const med = c ? `$${c.price_median.toFixed(2)}` : '—';
        const medColor = !c ? C.faint : t === tiers[0] ? C.navy : C.ink;
        return [
          el('div', { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: W_MED, height: '100%', padding: '0 14px', borderLeft: `1px solid ${C.rule}`, color: medColor, fontSize: 20, fontWeight: c ? 600 : 400 }, med),
          el('div', { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: W_N, height: '100%', padding: '0 14px', borderLeft: `1px solid ${C.rule}`, color: C.faint, fontSize: 15 }, secondary(c, t, cells)),
        ];
      }),
    ]),
  );

  return el('div', { display: 'flex', flexDirection: 'column', border: `1px solid ${C.rule}`, backgroundColor: C.surface }, [headerRow, ...bodyRows]);
}

export function frame(title: string, sub: string, body: unknown, asOf: string) {
  const top = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 12 }, [
      el('div', { display: 'flex', color: C.navy, fontSize: 24, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: C.dim, fontSize: 16 }, 'Compute Credit Index Research'),
    ]),
    el('div', { display: 'flex', color: C.dim, fontSize: 16 }, `as of ${asOf}`),
  ]);
  const t = el('div', { display: 'flex', alignItems: 'flex-end', height: 44, color: C.ink, fontSize: 33, fontWeight: 600, letterSpacing: 0.5, marginTop: 6, marginBottom: 8 }, title);
  const s = el('div', { display: 'flex', alignItems: 'center', height: 22, color: C.dim, fontSize: 16, marginBottom: 22 }, sub);
  return el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: C.bg, padding: 48, fontFamily: 'IBM Plex Mono' }, [top, t, s, body]);
}

export async function toPng(root: unknown): Promise<Buffer> {
  const svg = await satori(root as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'IBM Plex Mono', data: mono400, weight: 400, style: 'normal' },
      { name: 'IBM Plex Mono', data: mono600, weight: 600, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
