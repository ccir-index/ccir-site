import type { APIRoute } from 'astro';
import { C, el, toPng } from '../../lib/og';
import { homeOdCell, headlineValue, premiumChipsList, meta } from '../../data/snapshot';
import type { Rate, Tier } from '../../data/types';
import { TIERS, PREMIUM_CHIPS } from '../../data/types';

export const prerender = true;

// Dedicated broadsheet layout for the home share card (the other OG routes
// keep the shared tierTable). Same cell selection and value rule as the
// homepage ladder (homeOdCell / headlineValue) — the card and the page it
// links to can never disagree. No panel-depth column, no boxed grid:
// hairline rules, serif headline, small-caps column heads.

const SEGMENTS: Record<string, string> = {
  T1: 'Hyperscaler', T2: 'Neocloud', T3: 'Marketplace',
};
const PAD = 60;
const COL_W = 214;

export const GET: APIRoute = async () => {
  const live = premiumChipsList();
  const chips = live.length > 0 ? live : [...PREMIUM_CHIPS];
  const ladder = chips.map((chip) => ({
    chip,
    cells: TIERS.map((t) => homeOdCell(t as Tier, chip)),
  }));
  const rowH = ladder.length > 5 ? 54 : 62;

  const kicker = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, fontWeight: 600, letterSpacing: 3, color: C.navy }, 'CCIR · COMPUTE CREDIT INDEX RESEARCH'),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, letterSpacing: 1, color: C.dim }, `As of ${meta.as_of_date}`),
  ]);

  const headline = el('div', { display: 'flex', alignItems: 'center', height: 64, flexShrink: 0, fontFamily: 'IBM Plex Serif', fontSize: 44, fontWeight: 600, color: C.ink, letterSpacing: -0.5, lineHeight: 1.2, marginTop: 12 }, 'Independent reference rates for GPU compute.');
  const standfirst = el('div', { display: 'flex', alignItems: 'center', height: 24, flexShrink: 0, fontFamily: 'IBM Plex Mono', fontSize: 17, color: C.dim, lineHeight: 1.2, marginTop: 4, marginBottom: 20 }, 'USD per GPU-hour, on demand, by operator segment.');

  const headRow = el('div', { display: 'flex', alignItems: 'flex-end', paddingBottom: 10, borderBottom: `2.5px solid ${C.ink}` }, [
    el('div', { display: 'flex', flexGrow: 1 }),
    ...TIERS.map((t) =>
      el('div', { display: 'flex', justifyContent: 'flex-end', width: COL_W, fontFamily: 'IBM Plex Mono', fontSize: 14, fontWeight: 600, letterSpacing: 2.5, color: t === 'T2' ? C.navy : C.dim }, SEGMENTS[t].toUpperCase()),
    ),
  ]);

  const bodyRows = ladder.map(({ chip, cells }) =>
    el('div', { display: 'flex', alignItems: 'center', height: rowH, borderBottom: `1px solid ${C.rule}` }, [
      el('div', { display: 'flex', flexGrow: 1, fontFamily: 'IBM Plex Mono', fontSize: 23, fontWeight: 600, letterSpacing: 1.5, color: C.ink }, chip.replace(/-/g, ' ')),
      ...cells.map((c, i) => {
        const t = TIERS[i];
        return el('div', {
          display: 'flex', justifyContent: 'flex-end', width: COL_W,
          fontFamily: 'IBM Plex Mono', fontSize: 25,
          fontWeight: c && t === 'T2' ? 600 : 400,
          color: !c ? C.faint : t === 'T2' ? C.navy : C.ink,
        }, c ? headlineValue(c as Rate).toFixed(2) : '—');
      }),
    ]),
  );

  const footer = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${C.rule2}` }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, color: C.dim }, 'No positions. Observed prices only.'),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 16, fontWeight: 600, letterSpacing: 1, color: C.navy }, 'ccir.io'),
  ]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: C.bg, paddingTop: 36, paddingLeft: PAD, paddingRight: PAD, paddingBottom: 30 }, [
    el('div', { display: 'flex', width: 130, height: 6, flexShrink: 0, backgroundColor: C.navy, marginBottom: 16 }),
    kicker,
    headline,
    standfirst,
    headRow,
    ...bodyRows,
    footer,
  ]);

  const png = await toPng(root);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
