import type { APIRoute } from 'astro';
import { el, toPng } from '../../lib/og';
import { homeOdCell, homeIntCell, headlineValue, premiumChipsList, meta } from '../../data/snapshot';
import type { Rate, Tier } from '../../data/types';
import { TIERS, PREMIUM_CHIPS } from '../../data/types';

export const prerender = true;

// Two-grade assessment sheet for the home share card, TERMINAL skin —
// mirrors the 2026-08-05 landing redesign: interruptible LEFT, guaranteed
// RIGHT (the commitment axis), each grade a full segment ladder. Same cell
// selection and value rules as the homepage (homeIntCell / homeOdCell /
// headlineValue) — card and page can never disagree. Below-floor cells
// print an em dash, exactly like the page.

const T = {
  bg: '#0b0c0e', surface2: '#14181d',
  ink: '#e8e6e1', dim: '#9a9991', faint: '#6b6a64',
  rule: '#2a2d31', rule2: '#3b3f44',
  accent: '#ff9100',
};
const T2_BAND = 'rgba(255, 145, 0, 0.06)';

const SEGMENTS: Record<string, string> = {
  T1: 'HYP', T2: 'NEO', T3: 'MKT',
};
const PAD = 56;
const TABLE_W = 512;
const SIL_W = 122;
const COL_W = (TABLE_W - SIL_W) / 3; // 130

type CellFn = (t: Tier, chip: string) => Rate | undefined;

function gradeTable(
  title: string,
  definition: string,
  chips: string[],
  cellOf: CellFn,
  rowH: number,
) {
  const rows = chips.map((chip) => ({
    chip,
    cells: TIERS.map((t) => cellOf(t as Tier, chip)),
  }));

  const head = el('div', { display: 'flex', flexDirection: 'column', flexShrink: 0 }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 17, fontWeight: 600, letterSpacing: 3, color: T.ink }, title),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12.5, color: T.dim, marginTop: 5 }, definition),
  ]);

  const cols = el('div', { display: 'flex', alignItems: 'stretch', flexShrink: 0, borderBottom: `2px solid ${T.rule2}`, marginTop: 14 }, [
    el('div', { display: 'flex', alignItems: 'center', width: SIL_W, fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, letterSpacing: 2, color: T.dim, paddingBottom: 7 }, 'SILICON'),
    ...TIERS.map((t) =>
      el('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: COL_W, paddingBottom: 7, fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, letterSpacing: 2, color: t === 'T2' ? T.accent : T.dim, ...(t === 'T2' ? { backgroundColor: T2_BAND } : {}) }, SEGMENTS[t]),
    ),
  ]);

  const body = rows.map(({ chip, cells }) =>
    el('div', { display: 'flex', alignItems: 'stretch', height: rowH, flexShrink: 0, borderBottom: `1px solid ${T.rule}` }, [
      el('div', { display: 'flex', alignItems: 'center', width: SIL_W, fontFamily: 'IBM Plex Mono', fontSize: 17, fontWeight: 600, letterSpacing: 1, color: T.ink }, chip.replace(/-/g, ' ')),
      ...cells.map((c, i) => {
        const t = TIERS[i];
        return el('div', {
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: COL_W,
          fontFamily: 'IBM Plex Mono', fontSize: 19,
          fontWeight: c && t === 'T2' ? 600 : 400,
          color: !c ? T.faint : t === 'T2' ? T.accent : T.ink,
          ...(t === 'T2' ? { backgroundColor: T2_BAND } : {}),
        }, c ? headlineValue(c as Rate).toFixed(2) : '—');
      }),
    ]),
  );

  return el('div', { display: 'flex', flexDirection: 'column', width: TABLE_W }, [head, cols, ...body]);
}

export const GET: APIRoute = async () => {
  const live = premiumChipsList();
  const chips = live.length > 0 ? live : [...PREMIUM_CHIPS];
  const rowH = chips.length > 5 ? 44 : 50;

  const band = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62, flexShrink: 0, backgroundColor: T.surface2, borderBottom: `1px solid ${T.rule2}`, paddingLeft: PAD, paddingRight: PAD }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 18 }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 26, fontWeight: 600, letterSpacing: 5, color: T.accent }, 'CCIR'),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 13, letterSpacing: 3, color: T.dim }, 'COMPUTE CREDIT INDEX RESEARCH'),
    ]),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 13, letterSpacing: 3, color: T.dim }, 'DAILY REFERENCE RATES'),
  ]);

  const titleRow = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0, marginTop: 24 }, [
    el('div', { display: 'flex', flexDirection: 'column' }, [
      el('div', { display: 'flex', alignItems: 'center', height: 46, fontFamily: 'IBM Plex Serif', fontSize: 36, fontWeight: 600, color: T.ink, letterSpacing: -0.5, lineHeight: 1.1 }, 'GPU rental reference rates, two grades'),
      el('div', { display: 'flex', alignItems: 'center', height: 20, fontFamily: 'IBM Plex Mono', fontSize: 15, color: T.dim, marginTop: 3 }, 'USD per GPU-hour · on-demand · by operator segment · same panel construction, never blended'),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: 2.5, color: T.faint }, 'AS OF'),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 21, fontWeight: 600, color: T.ink, marginTop: 2 }, meta.as_of_date),
    ]),
  ]);

  const tables = el('div', { display: 'flex', justifyContent: 'space-between', flexShrink: 0, marginTop: 22 }, [
    gradeTable('INTERRUPTIBLE', 'what spare capacity is priced at', chips, homeIntCell, rowH),
    el('div', { display: 'flex', width: 1, backgroundColor: T.rule2, marginTop: 8, marginBottom: 8 }, ''),
    gradeTable('GUARANTEED', 'what committed capacity is priced at', chips, homeOdCell, rowH),
  ]);

  const footer = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.rule2}` }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 14, color: T.dim }, 'No positions. Public prices, citable. — below the publication floor.'),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, fontWeight: 600, letterSpacing: 1, color: T.accent }, 'ccir.io'),
  ]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: T.bg }, [
    band,
    el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, paddingLeft: PAD, paddingRight: PAD, paddingBottom: 24 }, [
      titleRow,
      tables,
      footer,
    ]),
  ]);

  const png = await toPng(root);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
