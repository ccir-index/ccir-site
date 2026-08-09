import type { APIRoute } from 'astro';
import { el, toPng } from '../../lib/og';
import { homeOdCell, homeIntCell, headlineValue, premiumChipsList, meta } from '../../data/snapshot';
import type { Rate, Tier } from '../../data/types';
import { TIERS, PREMIUM_CHIPS } from '../../data/types';

export const prerender = true;

// Share card for /rates, TERMINAL skin.
//
// REPLACES public/og/rates-live.png, a HAND-MADE PNG last written 2026-07-11
// that shipped as this page's social preview for a month. By 2026-08-08 it was
// wrong three ways: a month-stale date, month-stale prices (H100 T1 $9.15
// against $10.53), and every series id `-OD-US` under a subtitle reading
// "Guaranteed on-demand · US · ...", after the page moved to the pooled
// US & EU core. A static card cannot notice any of that.
//
// This one reads `homeOdCell` / `headlineValue` — the SAME exported selectors
// the page renders from — so card and page cannot disagree, which is the
// contract home.png.ts already keeps. Below-floor cells print an em dash
// exactly like the page.
//
// The distinguishing content vs the home card is the SERIES ID under every
// price: /rates is the citable surface, and the id is what makes a number
// quotable. That was the one genuinely good idea in the old static card and it
// is kept.

const T = {
  bg: '#0b0c0e', surface2: '#14181d',
  ink: '#e8e6e1', dim: '#9a9991', faint: '#6b6a64',
  rule: '#2a2d31', rule2: '#3b3f44',
  accent: '#ff9100',
};
const T2_BAND = 'rgba(255, 145, 0, 0.06)';

const SEGMENTS: Record<string, string> = {
  T1: 'HYPERSCALER', T2: 'NEOCLOUD', T3: 'MARKETPLACE',
};
const PAD = 56;
const CONTENT_W = 1200 - PAD * 2;   // 1088
const SIL_W = 148;
const COL_W = (CONTENT_W - SIL_W) / 3;

export const GET: APIRoute = async () => {
  const live = premiumChipsList();
  const chips = (live.length > 0 ? live : [...PREMIUM_CHIPS]).slice(0, 5);
  const rowH = chips.length > 4 ? 62 : 70;

  const band = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58, flexShrink: 0, backgroundColor: T.surface2, borderBottom: `1px solid ${T.rule2}`, paddingLeft: PAD, paddingRight: PAD }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 18 }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 25, fontWeight: 600, letterSpacing: 5, color: T.accent }, 'CCIR'),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: 3, color: T.dim }, 'COMPUTE CREDIT INDEX RESEARCH'),
    ]),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, letterSpacing: 3, color: T.dim }, 'DAILY FIXING'),
  ]);

  const titleRow = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0, marginTop: 20 }, [
    el('div', { display: 'flex', flexDirection: 'column' }, [
      el('div', { display: 'flex', alignItems: 'center', height: 42, fontFamily: 'IBM Plex Serif', fontSize: 34, fontWeight: 600, color: T.ink, letterSpacing: -0.5 }, 'Reference Rates'),
      el('div', { display: 'flex', alignItems: 'center', height: 19, fontFamily: 'IBM Plex Mono', fontSize: 14, color: T.dim, marginTop: 2 }, 'Guaranteed on-demand · US & EU · median per operator segment'),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }, [
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: 2.5, color: T.faint }, 'AS OF'),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 600, color: T.ink, marginTop: 2 }, meta.as_of_date),
      el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, color: T.faint, marginTop: 3 }, 'USD per GPU-hour'),
    ]),
  ]);

  const cols = el('div', { display: 'flex', alignItems: 'stretch', flexShrink: 0, borderBottom: `2px solid ${T.rule2}`, marginTop: 18 }, [
    el('div', { display: 'flex', alignItems: 'center', width: SIL_W, fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 600, letterSpacing: 2, color: T.dim, paddingBottom: 8 }, 'SILICON'),
    ...TIERS.map((t) =>
      el('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: COL_W, paddingBottom: 8, fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 600, letterSpacing: 2, color: t === 'T2' ? T.accent : T.dim, ...(t === 'T2' ? { backgroundColor: T2_BAND } : {}) }, SEGMENTS[t]),
    ),
  ]);

  const body = chips.map((chip) => {
    const cells = TIERS.map((t) => homeOdCell(t as Tier, chip));
    return el('div', { display: 'flex', alignItems: 'stretch', height: rowH, flexShrink: 0, borderBottom: `1px solid ${T.rule}` }, [
      el('div', { display: 'flex', alignItems: 'center', width: SIL_W, fontFamily: 'IBM Plex Mono', fontSize: 17, fontWeight: 600, letterSpacing: 1, color: T.ink }, chip.replace(/-/g, ' ')),
      ...cells.map((c, i) => {
        const t = TIERS[i];
        return el('div', {
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: COL_W,
          ...(t === 'T2' ? { backgroundColor: T2_BAND } : {}),
        }, [
          el('div', {
            display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 20,
            fontWeight: c && t === 'T2' ? 600 : 400,
            color: !c ? T.faint : t === 'T2' ? T.accent : T.ink,
          }, c ? `$${headlineValue(c as Rate).toFixed(2)}` : '—'),
          // The series id is the point of this card: it is what makes the
          // number citable. Omitted when the cell is below the floor.
          el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 10, color: T.faint, marginTop: 3 },
            c ? (c as Rate).series_id : ''),
        ]);
      }),
    ]);
  });

  // Interruptible is a second ladder ON the page. Naming its T1 prints keeps
  // the card from implying /rates carries only the guaranteed grade, without
  // a second table this layout has no room for.
  const intBits = chips
    .map((chip) => ({ chip, c: homeIntCell('T1' as Tier, chip) }))
    .filter((x) => x.c)
    .map((x) => `${x.chip.replace(/-/g, ' ')} $${headlineValue(x.c as Rate).toFixed(2)}`);
  const intLine = intBits.length > 0
    ? `Interruptible, Hyperscaler · ${intBits.join('  ·  ')}`
    : 'Interruptible ladder on the page';

  const footer = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${T.rule2}` }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 12, color: T.dim }, intLine),
    el('div', { display: 'flex', fontFamily: 'IBM Plex Mono', fontSize: 15, fontWeight: 600, letterSpacing: 1, color: T.accent }, 'ccir.io/rates'),
  ]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: T.bg }, [
    band,
    el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, paddingLeft: PAD, paddingRight: PAD, paddingBottom: 20 }, [
      titleRow,
      cols,
      ...body,
      footer,
    ]),
  ]);

  const png = await toPng(root);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
