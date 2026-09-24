/*
  Income-derived, model-implied value per chip: the single source of truth
  shared by /hardware (the IV cards), /og/hardware.png (the share card),
  /chips and the chip pages, so no surface can disagree with the page.

  Construction ruled by John 2026-09-24 (supersedes the v2.4.0 posted
  committed-ask rate leg and the 6-year life):

  RATE LEG per chip, from signed term deals (src/data/term_b.ts
  signedDeals: trailing 12 months to the snapshot, options, subsidized and
  program deals out, bundled deals only at their GPU-only estimate).
    - Anchor tenor = the tenor with the most GPUs signed.
    - >= 3 deals at the anchor: GPU-weighted least-squares line through
      the deals (x = signing date), read at the LAST deal date, never
      extrapolated to today. Band = UNWEIGHTED 25th and 75th percentile
      residuals added to that rate (John, 2026-09-24: unweighted, so the
      two largest deals do not set the band alone).
    - Else FALLBACK: posted global neocloud on-demand (bCurve(chip).od)
      x (1 - haircut). Haircut measured at build: median over every card
      chip x tenor of signed median / posted on-demand. Band = the haircut
      at the min and max observed ratio. Anchor = the chip's own signed
      anchor tenor if it has any deal, else 2Y.
  INCOME PATH: contract years earn the rate on every hour (take-or-pay,
  u = 1.0). After the contract: re-lease at rate x (1 - g)^(yr - T) at 75%
  utilization. Margin 0.65, discount 15%, 8,766 h/yr, mid-year discounting.
  SERVICE LIFE 7 years for every chip. No replacement-cost cap: a new-cost
  basis prints beside the value where known.

  The value is a model output, never presented as a transacted price.
*/
import hw from '../data/hardware_panels.json';
import ivRatesRaw from '../data/rates_daily.csv?raw';
import { bCurve, signedDeals, type SignedDeal } from '../data/term_b';
import { meta } from '../data/snapshot';


const ivParse = (raw: string) => {
  const [head, ...lines] = raw.trim().split(/\r?\n/);
  const cols = head!.split(',');
  return lines.map((l) => {
    const cells = l.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ''])) as Record<string, string>;
  });
};
const ivRates = ivParse(ivRatesRaw);

// Stress path utilization (John, 2026-09-24): a fixed, deliberately low
// utilization for the interruptible (hourly-rental) path, set as a stress
// case and NOT tied to measured market utilization today.
export const IV_STRESS_U = 0.40;
const IV_HOURS = 8766;
// g (decay after the contract) is MEASURED, not assumed: calibrated
// 2026-07-27 from the wayback prior-gen rate panel spliced with the live
// record (through-cycle pooled A100+V100 -15.1%/yr; from the 2024 cycle
// peak A100 -19.4%/yr, H100 -15.8%/yr). Base 0.18 sits inside that bracket;
// 0.30 (V100 from its scarcity peak) stays as the conservative bound.
// uContract = 1.0: take-or-pay contract years bill every hour (disclosed).
export const IV_BASE = { u: 0.75, uContract: 1.0, m: 0.65, r: 0.15, g: 0.18, life: 7 };
const IV_G = [0.10, 0.30];
const IV_R = [0.10, 0.20];
const FALLBACK_TENOR = '2Y';
const TENOR_YEARS: Record<string, number> = {
  '1M': 1 / 12, '3M': 0.25, '6M': 0.5, '1Y': 1, '2Y': 2, '3Y': 3, '4Y': 4, '5Y': 5,
};

// Valuation date = the snapshot date (decimal year).
const IV_NOW = (() => {
  const [y, m, d] = meta.as_of_date.split('-').map(Number);
  const t = Date.UTC(y!, m! - 1, d!);
  return y! + (t - Date.UTC(y!, 0, 1)) / (Date.UTC(y! + 1, 0, 1) - Date.UTC(y!, 0, 1));
})();

interface NewCost { usd: number; label: string; grade: string }
interface Spec {
  key: string; label: string; model: string; silicon: string; vintage: number;
  modeledOnly: boolean; vintageAssumed: boolean; newCost?: NewCost;
}
// New-cost basis (John, 2026-09-24): H100 keeps its hardware_panels basis
// (DGX teardown / 8, grade B). B200 and B300 carry a system basis: 8-GPU
// server price / 8, grade C, reseller range. Other chips print none.
const IV_SPEC: Spec[] = [
  { key: 'H100-80-SXM5', label: 'H100 SXM', model: 'H100', silicon: 'h100-sxm-80gb', vintage: 2023 + 2 / 12, modeledOnly: false, vintageAssumed: false },
  // H200 is modeled-only since 2026-08-31, when the sold record split by
  // form factor: the SXM secondary record is too thin to publish, and the
  // NVL record that does publish is a different good. Never triangulate
  // an SXM value against NVL marks.
  { key: 'H200-141-SXM5', label: 'H200 SXM', model: 'H200', silicon: 'h200-sxm-141gb', vintage: 2024 + 5 / 12, modeledOnly: true, vintageAssumed: false },
  { key: 'A100-80-SXM4', label: 'A100 80GB', model: 'A100', silicon: 'a100-sxm-80gb', vintage: 2021 + 5 / 12, modeledOnly: false, vintageAssumed: false },
  // Modeled-only: no secondary-market record yet. Vintage = volume
  // availability, stated as assumed.
  { key: 'B200-180-SXM6', label: 'B200 SXM', model: 'B200', silicon: 'b200-sxm-180gb', vintage: 2025 + 2 / 12, modeledOnly: true, vintageAssumed: true,
    newCost: { usd: 50000, label: '8-GPU server price / 8, reseller range', grade: 'C' } },
  { key: 'B300-288-SXM6', label: 'B300 SXM', model: 'B300', silicon: 'b300-sxm-288gb', vintage: 2026, modeledOnly: true, vintageAssumed: true,
    newCost: { usd: 54000, label: '8-GPU server price / 8, reseller range', grade: 'C' } },
];

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const dayNum = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86400000;

// Weighted percentile, linear between cumulative-weight midpoints.
function wPct(vals: number[], ws: number[], q: number): number {
  const idx = vals.map((_, i) => i).sort((a, b) => vals[a]! - vals[b]!);
  const W = ws.reduce((a, b) => a + b, 0);
  let cum = 0;
  const pts = idx.map((i) => { const p = (cum + ws[i]! / 2) / W; cum += ws[i]!; return { p, v: vals[i]! }; });
  if (q <= pts[0]!.p) return pts[0]!.v;
  for (let k = 1; k < pts.length; k++) {
    if (q <= pts[k]!.p) {
      const a = pts[k - 1]!, b = pts[k]!;
      return a.v + ((q - a.p) / (b.p - a.p)) * (b.v - a.v);
    }
  }
  return pts[pts.length - 1]!.v;
}

// Anchor tenor = the tenor with the most GPUs signed (longer tenor on a tie).
function anchorTenor(ds: SignedDeal[]): string | null {
  const g = new Map<string, number>();
  for (const d of ds) g.set(d.tenor, (g.get(d.tenor) ?? 0) + d.gpus);
  let best: string | null = null;
  for (const [t, n] of g) {
    if (best == null || n > g.get(best)! || (n === g.get(best)! && (TENOR_YEARS[t] ?? 0) > (TENOR_YEARS[best] ?? 0))) best = t;
  }
  return best;
}

// --- measured posted-to-signed haircut ---------------------------------------
// Every card chip x tenor with signed deals in the window: signed median
// (GPU-only, bundled at estimate) over the chip's posted global neocloud
// on-demand. Haircut = 1 - median ratio.
const odOf = (s: Spec) => bCurve(s.model, s.silicon).od;
const hcCells = IV_SPEC.flatMap((s) => {
  const od = odOf(s);
  if (!od) return [];
  const ds = signedDeals(s.model);
  return [...new Set(ds.map((d) => d.tenor))].map((t) => ({
    chip: s.model, tenor: t, ratio: median(ds.filter((d) => d.tenor === t).map((d) => d.value)) / od.value,
  }));
});
const hcRatios = hcCells.map((c) => c.ratio);
export const IV_HAIRCUT = hcRatios.length
  ? { haircut: 1 - median(hcRatios), lo: 1 - Math.max(...hcRatios), hi: 1 - Math.min(...hcRatios), cells: hcCells }
  : null;

interface RateLeg {
  method: 'signed' | 'haircut';
  rate: number; lo: number; hi: number;
  tenor: string; years: number;
  n: number; gpus: number; lastDate: string | null; estimated: number;
  od: number; odSellers: number; haircut: number | null;
}
function rateLeg(s: Spec): RateLeg | null {
  const od = odOf(s);
  const ds = signedDeals(s.model);
  const t = anchorTenor(ds);
  const at = t ? ds.filter((d) => d.tenor === t) : [];
  if (t && at.length >= 3) {
    const ws = at.map((d) => d.gpus), xs = at.map((d) => dayNum(d.signed)), ys = at.map((d) => d.value);
    const W = ws.reduce((a, b) => a + b, 0);
    const xb = xs.reduce((a, x, i) => a + ws[i]! * x, 0) / W;
    const yb = ys.reduce((a, y, i) => a + ws[i]! * y, 0) / W;
    const sxx = xs.reduce((a, x, i) => a + ws[i]! * (x - xb) ** 2, 0);
    const sxy = xs.reduce((a, x, i) => a + ws[i]! * (x - xb) * (ys[i]! - yb), 0);
    const b = sxx > 0 ? sxy / sxx : 0;
    const xLast = Math.max(...xs);
    const rate = yb + b * (xLast - xb);
    const res = ys.map((y, i) => y - (yb + b * (xs[i]! - xb)));
    const lastDate = at.map((d) => d.signed).sort().at(-1)!;
    return {
      method: 'signed', rate, lo: rate + wPct(res, res.map(() => 1), 0.25), hi: rate + wPct(res, res.map(() => 1), 0.75),
      tenor: t, years: TENOR_YEARS[t]!, n: at.length, gpus: W, lastDate,
      estimated: at.filter((d) => d.estimated).length,
      od: od?.value ?? NaN, odSellers: od?.sellers ?? 0, haircut: null,
    };
  }
  if (!od || !IV_HAIRCUT) return null;
  const tenor = t ?? FALLBACK_TENOR;
  return {
    method: 'haircut', rate: od.value * (1 - IV_HAIRCUT.haircut),
    lo: od.value * (1 - IV_HAIRCUT.hi), hi: od.value * (1 - IV_HAIRCUT.lo),
    tenor, years: TENOR_YEARS[tenor]!, n: at.length, gpus: at.reduce((a, d) => a + d.gpus, 0),
    lastDate: null, estimated: 0, od: od.value, odSellers: od.sellers, haircut: IV_HAIRCUT.haircut,
  };
}

// Present value of one earning path. Contract share of each year earns
// `rate` at uC; the rest re-leases at rate x (1 - g)^(yr - T) at u.
function ivValue(rate: number, T: number, age: number, r = IV_BASE.r, g = IV_BASE.g,
                 uC = IV_BASE.uContract, u = IV_BASE.u, m = IV_BASE.m, life = IV_BASE.life): number {
  const rem = Math.max(0, life - age);
  const full = Math.floor(rem), frac = rem - full;
  let pv = 0;
  for (let i = 0; i < full + (frac > 0 ? 1 : 0); i++) {
    const yr = i + 1;
    const c = Math.max(0, Math.min(1, T - i));
    const inc = rate * uC * c + rate * Math.pow(1 - g, Math.max(0, yr - T)) * u * (1 - c);
    const fy = i < full ? 1 : frac;
    pv += (inc * IV_HOURS * fy * m) / Math.pow(1 + r, i + 0.5);
  }
  return pv;
}

const ivRaw = IV_SPEC.map((s) => {
  const hwm = hw.models.find((m: any) => m.key === s.key) as any;
  if (!s.modeledOnly && !hwm) return null;
  const leg = rateLeg(s);
  if (!leg) return null;
  const age = IV_NOW - s.vintage;
  const T = leg.years;
  const base = ivValue(leg.rate, T, age);
  // One-at-a-time sensitivity around base: discount rate, decay, and the
  // rate band. Corners are never stacked. Life, utilization and margin are
  // held at base.
  const combos: number[] = [base];
  for (const rr of IV_R) combos.push(ivValue(leg.rate, T, age, rr));
  for (const gg of IV_G) combos.push(ivValue(leg.rate, T, age, IV_BASE.r, gg));
  const bandLo = ivValue(leg.lo, T, age), bandHi = ivValue(leg.hi, T, age);
  combos.push(bandLo, bandHi);
  const ask = hwm?.ask?.med ?? null;
  const t90 = hwm?.t90?.med ?? null;
  // Stress path: no term contract, the published Neocloud interruptible
  // cell as the earning path from day one at IV_STRESS_U utilization: flat
  // year 1, decay beyond.
  const intRow = ivRates.find((r) => r['series_id'] === `CRI-T2-${s.model}-ALL-INT-OD-ALL`
                                     && r['promotion_status'] === 'Published');
  const intRate = intRow ? Number(intRow['price_headline']) : NaN;
  const intStress = Number.isFinite(intRate) ? ivValue(intRate, 1, age, IV_BASE.r, IV_BASE.g, IV_STRESS_U, IV_STRESS_U) : null;
  const newCost: NewCost | null = s.newCost
    // Label kept source-neutral on the page (no third-party names); the
    // dollar figure and grade come from hardware_panels.
    ?? (s.key === 'H100-80-SXM5' && hwm?.basis?.usd ? { usd: hwm.basis.usd, label: 'DGX system teardown / 8', grade: hwm.basis.grade } : null);
  const lo = Math.min(...combos), hi = Math.max(...combos);
  // Strip scale: zero-anchored so mark positions read as magnitudes.
  const smax = Math.max(hi, base, ask ?? 0, t90 ?? 0, intStress ?? 0, newCost?.usd ?? 0) * 1.06;
  return {
    key: s.key, label: s.label, model: s.model, silicon: s.silicon,
    modeledOnly: s.modeledOnly, vintageAssumed: s.vintageAssumed,
    base, lo, hi, smax, bandLo, bandHi, leg,
    intStress, intRate: Number.isFinite(intRate) ? intRate : null,
    intN: intRow ? Number(intRow['n_sources']) || null : null,
    intUtil: IV_STRESS_U,
    remaining: Math.max(0, IV_BASE.life - age),
    ask, askN: hwm?.ask?.n ?? null, askSources: hwm?.ask?.sources ?? null,
    t90, t90N: hwm?.t90?.n ?? null,
    newCost, aboveCost: newCost != null && base > newCost.usd,
  };
}).filter((x): x is NonNullable<typeof x> => x != null);

// GPU VALUE (John, 2026-09-24): the income stream above values a DEPLOYED,
// earning position. A GPU alone is worth that less its share of the rest of
// the system (server, networking) and the cost of getting it earning.
// Calibrated at every build on chips with executed sales (sold 90d median):
// k = 1 - mean(sold / deployed value). Sep-24: H100 0.754, A100 0.864 -> k 19%.
// One published value per chip = deployed x (1 - k); the stress path takes
// the same k. Chips with no sales record inherit the calibrated k.
const calib = ivRaw.filter((c) => !c.modeledOnly && c.t90 != null && c.base > 0)
  .map((c) => ({ chip: c.label, ratio: c.t90! / c.base }));
export const IV_CALIB = {
  k: calib.length ? 1 - calib.reduce((a, c) => a + c.ratio, 0) / calib.length : 0.2,
  chips: calib,
};
const keep = 1 - IV_CALIB.k;
export const ivCards = ivRaw.map((c) => {
  const base = c.base * keep, lo = c.lo * keep, hi = c.hi * keep;
  const intStress = c.intStress != null ? c.intStress * keep : null;
  const smax = Math.max(base, c.ask ?? 0, c.t90 ?? 0, intStress ?? 0, c.newCost?.usd ?? 0) * 1.06;
  return {
    ...c, deployed: c.base, base, lo, hi, intStress, smax,
    aboveCost: c.newCost != null && base > c.newCost.usd,
  };
}).sort((a, b) => b.base - a.base);

export type IvCard = (typeof ivCards)[number];

// Plain-words label for a card's rate leg, shared by page and share card.
export function legText(v: IvCard): string {
  const l = v.leg;
  return l.method === 'signed'
    ? `signed trend (${l.n} deals, ${l.gpus.toLocaleString('en-US')} GPUs)`
    : `posted on-demand less measured haircut (${Math.round((l.haircut ?? 0) * 100)}%)`;
}
