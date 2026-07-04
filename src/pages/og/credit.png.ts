import type { APIRoute } from 'astro';
import { frame, toPng, el, C } from '../../lib/og';
import creditData from '../../data/credit_instruments.json';

export const prerender = true;

/*
  OG card for /credit: the two headline series as compact tables (GPU-
  collateral SOFR tape, lease-backed project-bond coupons) + coverage
  stats. Display strings mirror the chart config in credit.astro; the id
  guard below fails the build if any underlying instrument leaves the
  dataset so the card can't outlive its data.
*/
const byId = new Map(creditData.instruments.map((i: any) => [i.id, i]));
const need = (id: string) => {
  if (!byId.has(id)) throw new Error(`og/credit: missing instrument id ${id}`);
};
[
  'crwv-ddtl-1', 'crwv-ddtl-2', 'crwv-ddtl-2-1', 'crwv-ddtl-3', 'crwv-ddtl-4',
  'crwv-ddtl-5', 'iren-hw3-ddtl', 'apld-9250-2030', 'wulf-notes-7750-2030',
  'cifr-7125-2030', 'cifr-6125-2031', 'hut-riverbend-6192-2042',
  'hut-beaconpoint-6129-2042', 'cifr-6000-2031', 'iren-hw3-notes',
].forEach(need);

const TAPE: [string, string, string][] = [
  ["'23", 'CRWV DDTL 1.0', '+9.62'],
  ["'24", 'CRWV DDTL 2.0', '+6.00–6.50 / +13'],
  ["'25", 'CRWV DDTL 3.0 · 2.1', '+4.00 / +4.25'],
  ["'26", 'CRWV DDTL 5.0', '+4.50'],
  ["'26", 'CRWV DDTL 4.0 · IREN H3', '+2.25'],
];
const BONDS: [string, string, string][] = [
  ["Nov '25", 'APLD', '9.250'],
  ["Oct '25", 'WULF', '7.750'],
  ["Nov '25", 'CIFR', '7.125'],
  ["Feb '26", 'CIFR', '6.125'],
  ["Apr–Jun '26", 'HUT', '6.192 / 6.129'],
  ["Jun '26", 'CIFR · IREN', '6.000 / 5.96'],
];

const ROW_H = 42;
const panel = (head: string, sub: string, rows: [string, string, string][]) =>
  el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, width: 542, border: `1px solid ${C.rule}`, backgroundColor: C.surface, alignSelf: 'flex-start' }, [
    el('div', { display: 'flex', flexDirection: 'column', backgroundColor: C.head, borderBottom: `1px solid ${C.rule2}`, padding: '10px 16px', gap: 2 }, [
      el('div', { display: 'flex', color: C.ink, fontSize: 16, fontWeight: 600, letterSpacing: 1.5 }, head),
      el('div', { display: 'flex', color: C.faint, fontSize: 12, letterSpacing: 1 }, sub),
    ]),
    ...rows.map(([when, who, val], idx) =>
      el('div', { display: 'flex', alignItems: 'center', height: ROW_H, borderBottom: idx === rows.length - 1 ? 'none' : `1px solid ${C.rule}`, padding: '0 16px' }, [
        el('div', { display: 'flex', width: 118, color: C.faint, fontSize: 14 }, when),
        el('div', { display: 'flex', flexGrow: 1, color: C.dim, fontSize: 15, letterSpacing: 0.5 }, who),
        el('div', { display: 'flex', color: idx === rows.length - 1 ? C.navy : C.ink, fontSize: 19, fontWeight: 600 }, val),
      ])
    ),
  ]);

export const GET: APIRoute = async () => {
  const nInstruments = creditData.instruments.length;
  const nIssuers = new Set(creditData.instruments.map((i: any) => i.issuer)).size;

  const body = el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1 }, [
    el('div', { display: 'flex', gap: 20 }, [
      panel('GPU-COLLATERAL SOFR TAPE', 'SPREAD OVER SOFR AT SIGNING, PP · JUL 2023 – JUN 2026', TAPE),
      panel('PROJECT-BOND COUPONS', 'LEASE-BACKED 144A SENIOR SECURED, % · OCT 2025 – JUN 2026', BONDS),
    ]),
    el('div', { display: 'flex', alignItems: 'flex-end', flexGrow: 1, color: C.dim, fontSize: 14, letterSpacing: 1.5, paddingBottom: 2 },
      `${nInstruments} INSTRUMENTS · ${nIssuers} ISSUERS · FILINGS-AS-FILED · UNDISCLOSED STAYS UNDISCLOSED`),
  ]);

  const png = await toPng(frame(
    'Compute Credit Tracker',
    'The debt stack behind AI compute, as filed — every row links its filing.',
    body,
    creditData._meta.as_of,
  ));
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
