import type { APIRoute } from 'astro';
import { frame, toPng, el, C } from '../../lib/og';
import { ivCards } from '../../lib/ivmodel';
import hw from '../../data/hardware_panels.json';

export const prerender = true;

/*
  OG card for /hardware: the four model-implied value cards, rendered from
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

const CARD_W = 544, CARD_H = 186, STRIP_W = CARD_W - 44;

function ivCard(v: (typeof ivCards)[number]) {
  const p = (x: number) => Math.max(0, Math.min(1, x / v.smax)) * STRIP_W;

  const head = el('div', { display: 'flex', alignItems: 'center', gap: 10 }, [
    el('div', { display: 'flex', fontSize: 15, fontWeight: 600, letterSpacing: 2.5, color: AMBER }, v.label.toUpperCase()),
    ...(v.modeledOnly
      ? [el('div', { display: 'flex', fontSize: 10.5, letterSpacing: 1.5, color: C.faint, border: `1px solid ${C.rule2}`, padding: '2px 7px' }, 'MODELED ONLY')]
      : []),
  ]);

  const value = el('div', { display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }, [
    el('div', { display: 'flex', fontFamily: 'IBM Plex Serif', fontSize: 34, fontWeight: 600, color: C.ink }, usd(v.base)),
    el('div', { display: 'flex', fontSize: 12.5, color: C.dim }, `sensitivity ${k(v.lo)} – ${k(v.hi)}`),
  ]);

  const marks: unknown[] = [
    el('div', { position: 'absolute', left: p(v.lo), top: 6, width: p(v.hi) - p(v.lo), height: 6, backgroundColor: 'rgba(255,145,0,0.26)', borderRadius: 3 }, ''),
    el('div', { position: 'absolute', left: p(v.base) - 5, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: AMBER }, ''),
  ];
  if (v.intStress != null)
    marks.push(el('div', { position: 'absolute', left: p(v.intStress) - 5, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: C.surface, border: `2px solid ${C.dim}` }, ''));
  if (v.ask != null)
    marks.push(el('div', { position: 'absolute', left: p(v.ask) - 1, top: 1, width: 2.5, height: 16, backgroundColor: C.ink }, ''));
  if (v.t90 != null)
    marks.push(el('div', { position: 'absolute', left: p(v.t90) - 4.5, top: 4.5, width: 9, height: 9, backgroundColor: C.dim, transform: 'rotate(45deg)' }, ''));
  const strip = el('div', { position: 'relative', display: 'flex', width: STRIP_W, height: 18, marginTop: 10 }, marks);

  const rows = v.modeledOnly
    ? [
        el('div', { display: 'flex', fontSize: 12.5, color: C.faint, marginTop: 8 },
          `not triangulated — no ask or executed lane yet · no-contract floor ${usd(v.intStress)}`),
      ]
    : [
        el('div', { display: 'flex', alignItems: 'center', gap: 18, fontSize: 12.5, marginTop: 8 }, [
          el('div', { display: 'flex', color: C.dim }, `ask ${usd(v.ask)}`),
          el('div', { display: 'flex', color: C.dim }, `sold 90d ${usd(v.t90)}`),
          ...(v.intStress != null ? [el('div', { display: 'flex', color: C.dim }, `no-contract floor ${usd(v.intStress)}`)] : []),
        ]),
      ];

  const meta = el('div', { display: 'flex', fontSize: 11.5, color: C.faint, marginTop: 6 },
    `rate leg $${v.spot.toFixed(2)}/hr · curve to ${v.curveTo} · ${v.remaining.toFixed(1)}yr remaining at 6yr life`);

  return el('div', {
    display: 'flex', flexDirection: 'column', width: CARD_W, height: CARD_H,
    backgroundColor: C.surface, border: `1px solid ${C.rule}`, padding: '14px 22px',
  }, [head, value, strip, ...rows, meta]);
}

export const GET: APIRoute = async () => {
  if (ivCards.length !== 4) throw new Error(`og/hardware: expected 4 IV cards, got ${ivCards.length}`);
  const [c1, c2, c3, c4] = ivCards;
  const body = el('div', { display: 'flex', flexDirection: 'column', gap: 14 }, [
    el('div', { display: 'flex', gap: 16 }, [ivCard(c1!), ivCard(c2!)]),
    el('div', { display: 'flex', gap: 16 }, [ivCard(c3!), ivCard(c4!)]),
  ]);

  const png = await toPng(frame(
    'Model-implied GPU value',
    'Income model on the CRI rate · discount rate grounded in the credit ledger · corroborated by sales and asks',
    body,
    hw.as_of,
  ));
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
