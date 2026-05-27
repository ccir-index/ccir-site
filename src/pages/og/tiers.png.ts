import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tierMatrix, premiumChipsList, meta } from '../../data/snapshot';
import { TIERS, PREMIUM_CHIPS, TIER_LABELS_SHORT } from '../../data/types';

export const prerender = true;

// IBM Plex Mono (matches the site's data tables). .woff is satori-compatible.
const fontDir = join(process.cwd(), 'node_modules/@fontsource/ibm-plex-mono/files');
const mono400 = readFileSync(join(fontDir, 'ibm-plex-mono-latin-400-normal.woff'));
const mono600 = readFileSync(join(fontDir, 'ibm-plex-mono-latin-600-normal.woff'));

// Editorial-cream palette (mirrors tokens.css editorial theme).
const C = {
  bg: '#f5f1e8',
  surface: '#fbf7ee',
  head: '#efeadd',
  rule: '#d4d0c4',
  rule2: '#b8b3a4',
  ink: '#0d0d0d',
  dim: '#5b5852',
  faint: '#8e8a82',
  navy: '#143055',
};

// column geometry (inner width 1104 after 48px padding each side)
const W_SILICON = 174;
const W_MED = 234;
const W_N = 76;
const W_TIER = W_MED + W_N; // 310 × 3 = 930  (+174 = 1104)
const ROW_H = 62;

// tiny element helper — satori consumes the React element shape at runtime
const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: children === undefined ? { style } : { style, children },
});

const fmt = (n: number) => `$${n.toFixed(2)}`;

export const GET: APIRoute = async () => {
  const chips = (() => {
    const live = premiumChipsList();
    return live.length > 0 ? live : [...PREMIUM_CHIPS];
  })();
  const ladder = chips.map((chip) => ({ chip, cells: tierMatrix(chip) }));

  // ---- header row (two-tier: tier code over [MEDIAN $/HR | N]) ----
  const headSilicon = el(
    'div',
    {
      display: 'flex', alignItems: 'flex-end', width: W_SILICON, height: '100%',
      padding: '0 16px 12px', color: C.dim, fontSize: 15, fontWeight: 600, letterSpacing: 2,
    },
    'SILICON',
  );

  const tierHead = (t: typeof TIERS[number]) =>
    el('div', { display: 'flex', flexDirection: 'column', width: W_TIER, borderLeft: `1px solid ${C.rule}` }, [
      el('div', {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 46, color: t === 'T1IF' ? C.navy : C.dim, gap: 2,
      }, [
        el('div', { display: 'flex', fontSize: 22, fontWeight: 600, letterSpacing: 2 }, t),
        el('div', { display: 'flex', fontSize: 12, fontWeight: 400, letterSpacing: 2, color: C.dim }, TIER_LABELS_SHORT[t].toUpperCase()),
      ]),
      el('div', { display: 'flex', borderTop: `1px solid ${C.rule}` }, [
        el('div', { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: W_MED, height: 30, padding: '0 14px', color: C.faint, fontSize: 11, letterSpacing: 1.5 }, 'MEDIAN $/HR'),
        el('div', { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: W_N, height: 30, padding: '0 14px', color: C.faint, fontSize: 11, letterSpacing: 1.5, borderLeft: `1px solid ${C.rule}` }, 'N'),
      ]),
    ]);

  const headerRow = el(
    'div',
    { display: 'flex', height: 78, backgroundColor: C.head, borderBottom: `1px solid ${C.rule2}` },
    [headSilicon, ...TIERS.map((t) => tierHead(t))],
  );

  // ---- body rows ----
  const bodyRows = ladder.map(({ chip, cells }) =>
    el('div', { display: 'flex', height: ROW_H, borderBottom: `1px solid ${C.rule}` }, [
      el('div', {
        display: 'flex', alignItems: 'center', width: W_SILICON, padding: '0 16px',
        color: C.ink, fontSize: 19, fontWeight: 600, letterSpacing: 1,
      }, chip.replace(/-/g, ' ')),
      ...TIERS.flatMap((t) => {
        const c = cells[t];
        const medText = c ? fmt(c.price_median) : '—';
        const nText = c ? String(c.n_sources) : '—';
        const medColor = !c ? C.faint : t === 'T1IF' ? C.navy : C.ink;
        return [
          el('div', {
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: W_MED, height: '100%',
            padding: '0 14px', borderLeft: `1px solid ${C.rule}`, color: medColor,
            fontSize: 20, fontWeight: c ? 600 : 400,
          }, medText),
          el('div', {
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: W_N, height: '100%',
            padding: '0 14px', borderLeft: `1px solid ${C.rule}`, color: C.faint, fontSize: 15,
          }, nText),
        ];
      }),
    ]),
  );

  // ---- masthead + titles ----
  const top = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 12 }, [
      el('div', { display: 'flex', color: C.navy, fontSize: 24, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: C.dim, fontSize: 16 }, 'Compute Credit Index Research'),
    ]),
    el('div', { display: 'flex', color: C.dim, fontSize: 16 }, `as of ${meta.as_of_date}`),
  ]);

  const title = el('div', { display: 'flex', alignItems: 'flex-end', height: 44, color: C.ink, fontSize: 33, fontWeight: 600, letterSpacing: 0.5, marginTop: 6, marginBottom: 8 }, 'Same chip — three rates.');
  const sub = el('div', { display: 'flex', alignItems: 'center', height: 22, color: C.dim, fontSize: 16, marginBottom: 22 }, 'Median USD / GPU-hour across the Intelligence Factory tiers.');

  const table = el('div', { display: 'flex', flexDirection: 'column', border: `1px solid ${C.rule}`, backgroundColor: C.surface }, [headerRow, ...bodyRows]);

  const root = el('div', {
    display: 'flex', flexDirection: 'column', width: 1200, height: 630,
    backgroundColor: C.bg, padding: 48, fontFamily: 'IBM Plex Mono',
  }, [top, title, sub, table]);

  const svg = await satori(root as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'IBM Plex Mono', data: mono400, weight: 400, style: 'normal' },
      { name: 'IBM Plex Mono', data: mono600, weight: 600, style: 'normal' },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};
