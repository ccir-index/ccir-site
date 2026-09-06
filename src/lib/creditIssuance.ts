/*
  Compute-infrastructure debt issuance by quarter — the ONE derivation shared
  by the /credit page chart (components/CreditIssuanceChart.astro) and the
  share card (pages/og/credit-issuance-*.png.ts), so the two can never drift.

  Read from each row's explicit `collateral_class` (set row by row in the
  2026-08-09 curation pass; no regex classification anywhere):
    gpu             — disclosed GPU/equipment collateral
    operator_campus — operator-issued, named-campus security
    landlord_spv    — non-recourse landlord vehicles & securitizations
  Not charted: chip_lease and secured_undisclosed (we do not chart what
  filings don't state). Line = cumulative GPU-collateralized. Observed only —
  no modeling of drawdowns or amortization.
*/
import creditData from '../data/credit_instruments.json';

export const instruments = (creditData as any).instruments as any[];

export function quarterOf(iso: string): string | null {
  // Match a YYYY-MM anywhere in the string — issuance dates are often prose
  // ("Priced ~2026-04-16", "Reported 2026-02-19", "Closed; PR 2026-01-07").
  const m = /(\d{4})-(\d{2})/.exec(iso || '');
  if (!m) return null;
  const q = +m[2] <= 3 ? 1 : +m[2] <= 6 ? 2 : +m[2] <= 9 ? 3 : 4;
  return `${m[1]}-Q${q}`;
}

// Issuance means issued: a deal recorded as rumored, postponed or not yet
// launched carries `exclude_from_totals` and stays out of the bars and the
// class totals (it is still a ledger row). 2026-09-06.
export const byClass = (cls: string) =>
  instruments.filter((i) => i.collateral_class === cls && !i.exclude_from_totals);
export const gpuRows = byClass('gpu');
export const ocRows = byClass('operator_campus');
export const lsRows = byClass('landlord_spv');
export const clRows = byClass('chip_lease');
export const suRows = byClass('secured_undisclosed');
export const sumB = (rows: any[]) => rows.reduce((a, i) => a + i.size_usd_m, 0) / 1000;

function bucket(rows: any[]) {
  const byQ = new Map<string, number>();
  let undated = 0, undatedUsd = 0;
  for (const i of rows) {
    const q = quarterOf(i.issued);
    if (q === null) { undated++; undatedUsd += i.size_usd_m; continue; }
    byQ.set(q, (byQ.get(q) ?? 0) + i.size_usd_m);
  }
  return { byQ, undated, undatedUsd };
}
export const g = bucket(gpuRows);
export const o = bucket(ocRows);
export const l = bucket(lsRows);

export const WINDOW_START = '2024-Q1';
const allQ = [...new Set([...g.byQ.keys(), ...o.byQ.keys(), ...l.byQ.keys()])].sort();
export const preBaseUsd = [...g.byQ.keys()].filter((q) => q < WINDOW_START).reduce((a, q) => a + g.byQ.get(q)!, 0);
export const preOtherUsd =
  [...o.byQ.keys()].filter((q) => q < WINDOW_START).reduce((a, q) => a + o.byQ.get(q)!, 0) +
  [...l.byQ.keys()].filter((q) => q < WINDOW_START).reduce((a, q) => a + l.byQ.get(q)!, 0);
// Contiguous quarter axis: empty quarters render as empty, never vanish.
const lastQ = allQ[allQ.length - 1];
export const windowQ: string[] = [];
{
  let [y, qn] = [2024, 1];
  while (true) {
    const s = `${y}-Q${qn}`;
    if (s > lastQ) break;
    windowQ.push(s);
    qn === 4 ? (y++, qn = 1) : qn++;
  }
}

export const asOf: string = (creditData as any)._meta?.as_of ?? '';
// The quarter containing the ledger's as-of date is in progress: mark it QTD
// so a part-quarter bar is never read as a full-quarter collapse.
export const currentQ = quarterOf(asOf);

export type Bar = { q: string; gpu_b: number; oc_b: number; ls_b: number; cum_b: number; qtd: boolean };
export const bars: Bar[] = (() => {
  let cum = preBaseUsd;
  return windowQ.map((q) => {
    const gpu = g.byQ.get(q) ?? 0;
    const oc = o.byQ.get(q) ?? 0;
    const ls = l.byQ.get(q) ?? 0;
    cum += gpu;
    return { q, gpu_b: gpu / 1000, oc_b: oc / 1000, ls_b: ls / 1000, cum_b: cum / 1000, qtd: q === currentQ };
  });
})();

// Y scales get headroom above the data max, rounded up to a clean tick
// step so bars and line never touch the chart ceiling.
export const Y_TICKS = 4;
export function axisMax(raw: number): number {
  const target = raw * 1.05;
  const pow = Math.pow(10, Math.floor(Math.log10(target / Y_TICKS)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s * Y_TICKS >= target)!;
  return step * Y_TICKS;
}
export const maxBar = axisMax(Math.max(...bars.map((b) => Math.max(b.gpu_b, b.oc_b, b.ls_b)), 1));
export const maxCum = axisMax(Math.max(...bars.map((b) => b.cum_b), 1));
export const barTicks = Array.from({ length: Y_TICKS + 1 }, (_, k) => Math.round((maxBar / Y_TICKS) * k));
export const cumTicks = Array.from({ length: Y_TICKS + 1 }, (_, k) => Math.round((maxCum / Y_TICKS) * k));
export const qLabel = (q: string) => q.replace('-', ' ');
