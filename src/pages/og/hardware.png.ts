import type { APIRoute } from 'astro';
import { frame, toPng, el, C } from '../../lib/og';
import { ivCards } from '../../lib/ivmodel';
import { meta } from '../../data/snapshot';

export const prerender = true;

/*
  OG card for /hardware: the model-implied value cards, rendered from
  the SAME computation the page uses (src/lib/ivmodel.ts) — the share card
  can never disagree with the page. Layout mirrors the on-page IV grid:
  headline value, sensitivity band strip with ask/sold/floor marks, and the
  corroborating rows. Replaced the executed-vs-ask table 2026-08-04 when
  the IV cards became the page's lead visual.
*/

const AMBER = C.navy;
const usd = (v: number | null | undefined) =>
  v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US');
const k = (v: number) => (v >= 1000 ? '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + Math.round(v));

// Two cards per row up to four cards; three per row beyond (B300 joined
// 2026-09-24), so the grid stays two rows tall inside the frame.
const GRID_W = 1104, GAP = 16, CARD_H = 186;

function ivCard(v: (typeof ivCards)[number], CARD_W: number) {
  const STRIP_W = CARD_W - 44;
  const p = (x: number) => Math.max(0, Math.min(1, x / v.smax)) * STRIP_W;

  const head = el('div', { display: 'flex', alignItems: 'center', gap: 10 }, [
    el('div', { display: 'flex', fontSize: 15, fontWeight: 600, letterSpacing: 2.5, color: AMBER }, v.label.toUpperCase()),
    ...(v.modeledOnly
      ? [el('div', { display: 'flex', fontSize: 10.5, letterSpacing: 1.5, color: C.faint, border: `1px solid ${C.rule2}`, padding: '2px 7px' }, 'MODELED ONLY')]
      : []),
  ]);

  const value = el('div', { display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Serif', fontSize: 34, fontWeight: 600, color: C.ink }, usd(v.base)),
    el('div', { display: 'flex', fontSize: 12.5, color: C.dim }, `range ${k(v.lo)} – ${k(v.hi)}`),
  ]);

  // Strip carries only the sensitivity band and the model dot (2026-08-04
  // ruling): the corroborating numbers live in the text rows below — mark
  // glyphs without an on-image legend read as noise at share-card size.
  const marks: unknown[] = [
    el('div', { position: 'absolute', left: p(v.lo), top: 6, width: p(v.hi) - p(v.lo), height: 6, backgroundColor: 'rgba(255,145,0,0.26)', borderRadius: 3 }, ''),
    el('div', { position: 'absolute', left: p(v.base) - 5, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: AMBER }, ''),
  ];
  const strip = el('div', { position: 'relative', display: 'flex', width: STRIP_W, height: 18, marginTop: 10 }, marks);

  const items = [
    ...(v.modeledOnly ? [] : [`ask ${usd(v.ask)}`, `sold 90d ${usd(v.t90)}`]),
    ...(v.newCost ? [`new chip ${usd(v.newCost.usd)}`] : []),
    ...(v.intStress != null ? [`stress ${usd(v.intStress)}`] : []),
  ];
  const rows = [
    el('div', { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, fontSize: 12.5, marginTop: 8 },
      items.map((t) => el('div', { display: 'flex', color: C.dim }, t))),
  ];

  const l = v.leg;
  const meta = el('div', { display: 'flex', fontSize: 11.5, color: C.faint, marginTop: 6 },
    `$${l.rate.toFixed(2)}/hr ${l.tenor} · ${l.method === 'signed' ? `signed, ${l.n} deals` : `on-demand less ${Math.round((l.haircut ?? 0) * 100)}%`} · ${v.remaining.toFixed(1)}yr left`);

  return el('div', {
    display: 'flex', flexDirection: 'column', width: CARD_W, height: CARD_H,
    backgroundColor: C.surface, border: `1px solid ${C.rule}`, padding: '14px 22px',
  }, [head, value, strip, ...rows, meta]);
}

export const GET: APIRoute = async () => {
  // A card drops out whenever its inputs do (2026-08-21: the A100 and B200
  // NEOCLOUD 1Y pairs fell below the publish floor and the hard "exactly 4"
  // assertion here failed the whole site build, leaving the live site on
  // the previous day). The share card lays out whatever the model can
  // price today, two per row, and never decides whether the site deploys.
  const cards = ivCards.filter((c): c is NonNullable<typeof c> => c != null);
  const rows: ReturnType<typeof el>[] = [];
  const per = cards.length > 4 ? 3 : 2;
  const cardW = Math.floor((GRID_W - GAP * (per - 1)) / per);
  for (let i = 0; i < cards.length; i += per) {
    rows.push(el('div', { display: 'flex', gap: GAP }, cards.slice(i, i + per).map((c) => ivCard(c, cardW))));
  }
  if (rows.length === 0) {
    rows.push(el('div', { display: 'flex', color: C.dim, fontSize: 16, padding: 24 },
      'Model-implied values are not printable today: the committed curve inputs are below the publish floor.'));
  }
  const body = el('div', { display: 'flex', flexDirection: 'column', gap: 14 }, rows);

  const png = await toPng(frame(
    'Model-implied GPU value',
    'Income model on signed term rates · discount rate grounded in the credit ledger · checked against sales and asks',
    body,
    meta.as_of_date,
  ));
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
