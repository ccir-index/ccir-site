import type { APIRoute } from 'astro';
import { frame, toPng, el, C } from '../../lib/og';
import creditData from '../../data/credit_instruments.json';
import { bars, barTicks, cumTicks, maxBar, maxCum, gpuRows, ocRows, lsRows, sumB, qLabel } from '../../lib/creditIssuance';

export const prerender = true;

/*
  OG card for /credit (2026-09-06, John: "the bar chart with the growing
  debt"): the issuance-by-quarter chart from the page, drawn with satori
  primitives (absolutely positioned divs; the cumulative line is a chain of
  rotated 2px segments) so the card and the page read one derivation
  (lib/creditIssuance.ts). The file name carries the date on purpose: X
  caches og:image by URL, so a new card needs a new link.
*/
const AS_OF =
  creditData.instruments
    .map((i: any) => i.as_of)
    .filter(Boolean)
    .sort()
    .at(-1) ?? creditData._meta.as_of;

// --- chart geometry (card pixels) ------------------------------------------
const CW = 1104, CH = 372;
const M = { top: 22, right: 112, bottom: 34, left: 58 };
const x0 = M.left, x1 = CW - M.right, y0 = M.top, y1 = CH - M.bottom;
const n = bars.length;
const band = (x1 - x0) / n;
const barW = Math.min(band * 0.24, 20);
const bx = (i: number) => x0 + band * (i + 0.5);
const byBar = (v: number) => y1 - (v / maxBar) * (y1 - y0);
const byCum = (v: number) => y1 - (v / maxCum) * (y1 - y0);

const ACCENT = C.navy;          // GPU-collateralized (site --accent)
const BLUE = '#3b82f6';         // landlord SPV & securitization (page color)
const SLATE = '#94a3b8';        // operator campus-secured (page color)

const abs = (style: Record<string, unknown>, children?: unknown) =>
  el('div', { position: 'absolute', display: 'flex', ...style }, children);

const nodes: unknown[] = [];
// gridlines + left ticks
for (const t of barTicks) {
  const y = byBar(t);
  nodes.push(abs({ left: x0, top: y, width: x1 - x0, height: 1, backgroundColor: C.rule }));
  nodes.push(abs({ left: 0, top: y - 9, width: x0 - 10, justifyContent: 'flex-end', color: C.dim, fontSize: 14 }, String(t)));
}
for (const t of cumTicks) {
  nodes.push(abs({ left: x1 + 10, top: byCum(t) - 9, color: C.dim, fontSize: 14 }, String(t)));
}
nodes.push(abs({ left: 0, top: y0 - 24, width: 160, color: C.faint, fontSize: 12, letterSpacing: 1 }, '$B ISSUED / QTR'));
nodes.push(abs({ left: x1 - 40, top: y0 - 24, width: 152, justifyContent: 'flex-end', color: C.faint, fontSize: 12, letterSpacing: 1 }, 'CUMULATIVE $B'));

// bars
bars.forEach((b, i) => {
  const trio: [number, string][] = [[b.gpu_b, ACCENT], [b.oc_b, SLATE], [b.ls_b, BLUE]];
  trio.forEach(([v, color], k) => {
    const h = Math.max(0, y1 - byBar(v));
    if (h <= 0) return;
    const left = bx(i) - barW * 1.5 - 2 + k * (barW + 2);
    nodes.push(abs({ left, top: y1 - h, width: barW, height: h, backgroundColor: color, opacity: b.qtd ? 0.55 : 0.9 }));
  });
  nodes.push(abs({ left: bx(i) - band / 2, top: y1 + 10, width: band, justifyContent: 'center', color: C.dim, fontSize: 13 },
    qLabel(b.q) + (b.qtd ? '*' : '')));
});

// cumulative line: rotated segments between consecutive points, then dots
for (let i = 1; i < n; i++) {
  const ax = bx(i - 1), ay = byCum(bars[i - 1].cum_b);
  const cx = bx(i), cy = byCum(bars[i].cum_b);
  const len = Math.hypot(cx - ax, cy - ay);
  const ang = (Math.atan2(cy - ay, cx - ax) * 180) / Math.PI;
  // satori rotates about the element's center: position the segment by
  // its midpoint, then rotate.
  const mx = (ax + cx) / 2, my = (ay + cy) / 2;
  nodes.push(abs({ left: mx - len / 2, top: my - 1, width: len, height: 2, backgroundColor: C.ink, opacity: 0.8,
    transform: `rotate(${ang.toFixed(2)}deg)` }));
}
bars.forEach((b, i) => {
  nodes.push(abs({ left: bx(i) - 4, top: byCum(b.cum_b) - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink }));
});
// end label on the line
const last = bars[n - 1];
nodes.push(abs({ left: bx(n - 1) - 60, top: byCum(last.cum_b) - 30, width: 120, justifyContent: 'center',
  color: C.ink, fontSize: 15, fontWeight: 600 }, `$${last.cum_b.toFixed(0)}B`));

const chart = el('div', { position: 'relative', display: 'flex', width: CW, height: CH }, nodes);

const sw = (color: string, label: string) =>
  el('div', { display: 'flex', alignItems: 'center', gap: 8, paddingRight: 22, color: C.dim, fontSize: 14 }, [
    el('div', { display: 'flex', width: 12, height: 12, backgroundColor: color }),
    el('div', { display: 'flex' }, label),
  ]);
const legend = el('div', { display: 'flex', alignItems: 'center', marginTop: 6 }, [
  sw(ACCENT, `GPU-collateralized · $${sumB(gpuRows).toFixed(0)}B`),
  sw(SLATE, `Operator campus-secured · $${sumB(ocRows).toFixed(0)}B`),
  sw(BLUE, `Landlord SPV & securitization · $${sumB(lsRows).toFixed(0)}B`),
  el('div', { display: 'flex', color: C.faint, fontSize: 13 }, '* current quarter, partial'),
]);

export const GET: APIRoute = async () => {
  const nInstruments = creditData.instruments.length;
  const nIssuers = new Set(creditData.instruments.map((i: any) => i.issuer)).size;
  const body = el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1 }, [
    chart,
    legend,
    el('div', { display: 'flex', alignItems: 'flex-end', flexGrow: 1, color: C.faint, fontSize: 13, letterSpacing: 1.5 },
      `${nInstruments} INSTRUMENTS · ${nIssuers} ISSUERS · FILINGS AS FILED · OBSERVED ISSUANCE, NO MODELING`),
  ]);
  const png = await toPng(frame(
    'Compute Credit Tracker',
    'Compute-infrastructure debt issuance by quarter, by collateral seat. Line: cumulative GPU-collateralized.',
    body,
    AS_OF,
  ));
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
