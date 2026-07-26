import type { APIRoute } from 'astro';
import { el, toPng } from '../../lib/og';
import { homeOdCell, headlineValue, premiumChipsList, meta } from '../../data/snapshot';
import type { Rate, Tier } from '../../data/types';
import { TIERS, PREMIUM_CHIPS } from '../../data/types';

export const prerender = true;

// Assessment-sheet layout for the home share card, in the site's TERMINAL
// skin (the default theme a visitor lands on). Other OG routes keep the
// shared cream tierTable. Same cell selection and value rule as the
// homepage ladder (homeOdCell / headlineValue) — card and page can never
// disagree. Register: market-infrastructure price sheet — masthead band,
// product title + date block, disciplined rules, featured column tinted.

// Terminal theme tokens, mirrored from src/styles/tokens.css.
const T = {
  bg: '#0b0c0e', surface2: '#14181d',
  ink: '#e8e6e1', dim: '#9a9991', faint: '#6b6a64',
  rule: '#2a2d31', rule2: '#3b3f44',
  accent: '#ff9100',
};
const T2_BAND = 'rgba(255, 145, 0, 0.06)';

const SEGMENTS: Record<string, string> = {
  T1: 'Hyperscaler', T2: 'Neocloud', T3: 'Marketplace',
};
const PAD = 56;
const COL_W = 292;

export const GET: APIRoute = async () => {
  const live = premiumChipsList();
  const chips = live.length > 0 ? live : [...PREMIUM_CHIPS];
  const ladder = chips.map((chip) => ({
    chip,
    cells: TIERS.map((t) => homeOdCell(t as Tier, chip)),
  }));
  const rowH = ladder.length > 5 ? 52 : 60;

  const band = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62, flexShrink: 0, backgroundColor: T.surface2, borderBottom: `1px solid ${T.rule2}`, paddingLeft: PAD, paddingRight: PAD }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 18 }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 26, fontWeight: 600, letterSpacing: 5, color: T.accent }, 'CCIR'),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 13, letterSpacing: 3, color: T.dim }, 'COMPUTE CREDIT INDEX RESEARCH'),
    ]),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 13, letterSpacing: 3, color: T.dim }, 'DAILY REFERENCE RATES'),
  ]);

  const titleRow = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0, marginTop: 28 }, [
    el('div', { display: 'flex', flexDirection: 'column' }, [
      el('div', { display: 'flex', alignItems: 'center', height: 52, fontFamily: 'IBM Plex Serif', fontSize: 40, fontWeight: 600, color: T.ink, letterSpacing: -0.5, lineHeight: 1.15 }, 'GPU rental reference rates'),
      el('div', { display: 'flex', alignItems: 'center', height: 22, fontFamily: 'IBM Plex Mono', fontSize: 16, color: T.dim, marginTop: 4 }, 'USD per GPU-hour · on-demand · by operator segment'),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: 2.5, color: T.faint }, 'AS OF'),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 21, fontWeight: 600, color: T.ink, marginTop: 2 }, meta.as_of_date),
    ]),
  ]);

  const headRow = el('div', { display: 'flex', alignItems: 'stretch', flexShrink: 0, borderBottom: `2.5px solid ${T.rule2}`, marginTop: 24 }, [
    el('div', { display: 'flex', alignItems: 'center', flexGrow: 1, fontFamily: 'IBM Plex Mono', fontSize: 13, fontWeight: 600, letterSpacing: 2.5, color: T.dim, paddingBottom: 9 }, 'SILICON'),
    ...TIERS.map((t) =>
      el('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: COL_W, paddingBottom: 9, fontFamily: 'IBM Plex Mono', fontSize: 13, fontWeight: 600, letterSpacing: 2.5, color: t === 'T2' ? T.accent : T.dim, ...(t === 'T2' ? { backgroundColor: T2_BAND } : {}) }, SEGMENTS[t].toUpperCase()),
    ),
  ]);

  const bodyRows = ladder.map(({ chip, cells }) =>
    el('div', { display: 'flex', alignItems: 'stretch', height: rowH, flexShrink: 0, borderBottom: `1px solid ${T.rule}` }, [
      el('div', { display: 'flex', alignItems: 'center', flexGrow: 1, fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 600, letterSpacing: 1.5, color: T.ink }, chip.replace(/-/g, ' ')),
      ...cells.map((c, i) => {
        const t = TIERS[i];
        return el('div', {
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: COL_W,
          fontFamily: 'IBM Plex Mono', fontSize: 24,
          fontWeight: c && t === 'T2' ? 600 : 400,
          color: !c ? T.faint : t === 'T2' ? T.accent : T.ink,
          ...(t === 'T2' ? { backgroundColor: T2_BAND } : {}),
        }, c ? headlineValue(c as Rate).toFixed(2) : '—');
      }),
    ]),
  );

  const footer = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.rule2}` }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 14, color: T.dim }, 'No positions. Public prices, citable.'),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, fontWeight: 600, letterSpacing: 1, color: T.accent }, 'ccir.io'),
  ]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: T.bg }, [
    band,
    el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, paddingLeft: PAD, paddingRight: PAD, paddingBottom: 26 }, [
      titleRow,
      headRow,
      ...bodyRows,
      footer,
    ]),
  ]);

  const png = await toPng(root);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
