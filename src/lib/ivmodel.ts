/*
  Income-derived, model-implied value per chip — the single source of truth
  shared by /hardware (the IV cards) and /og/hardware.png (the share card),
  so the card can never disagree with the page. Extracted verbatim from
  hardware.astro on 2026-08-04 when the OG moved to the four-card layout.

  Base case and the alternatives grid are DISCLOSED on the page; the value
  is a model output, never presented as a transacted price.
*/
import hw from '../data/hardware_panels.json';
import ivRatesRaw from '../data/rates_daily.csv?raw';
import ivCmiRaw from '../data/committed_mi.csv?raw';

const ivParse = (raw: string) => {
  const [head, ...lines] = raw.trim().split(/\r?\n/);
  const cols = head!.split(',');
  return lines.map((l) => {
    const cells = l.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ''])) as Record<string, string>;
  });
};
const ivRates = ivParse(ivRatesRaw);
const ivCmi = ivParse(ivCmiRaw);
const IV_HOURS = 8766;
// g (decay beyond the observed curve) is MEASURED, not assumed — calibrated
// 2026-07-27 from the wayback prior-gen rate panel (2020–2024 archived
// provider prints, repricer tier, OD only) spliced with the live record:
// through-cycle pooled A100+V100 −15.1%/yr; from the 2024 cycle peak A100
// −19.4%/yr, H100 −15.8%/yr. Base 0.18 sits inside that bracket. The old
// 0.30 base equals the worst case on record (V100 from its scarcity peak)
// and stays as the conservative bound of IV_G.
export const IV_BASE = { u: 0.75, m: 0.65, r: 0.15, g: 0.18, life: 6 };
const IV_G = [0.10, 0.18, 0.30];
const IV_NOW = 2026 + (7 - 0.5) / 12;
const IV_SPEC = [
  { key: 'H100-80-SXM5', label: 'H100 SXM', model: 'H100', silicon: 'h100-sxm-80gb', vintage: 2023 + 2 / 12, modeledOnly: false },
  { key: 'H200-141', label: 'H200', model: 'H200', silicon: 'h200-sxm-141gb', vintage: 2024 + 5 / 12, modeledOnly: false },
  { key: 'A100-80-SXM4', label: 'A100 80GB', model: 'A100', silicon: 'a100-sxm-80gb', vintage: 2021 + 5 / 12, modeledOnly: false },
  // Modeled-only: no secondary-market record exists for this chip yet, so
  // the value is published without ask/executed triangulation (disclosed on
  // the card and in Method). Committed curve observed to 1Y only — decay
  // applies from the end of the observed curve. Vintage = volume
  // availability, stated as assumed.
  { key: 'B200-180-SXM6', label: 'B200 SXM', model: 'B200', silicon: 'b200-sxm-180gb', vintage: 2025 + 2 / 12, modeledOnly: true },
];
function ivValue(spot: number, d: Record<string, number>, r: number, life: number, age: number,
                 g = IV_BASE.g, u = IV_BASE.u, m = IV_BASE.m): number {
  const c = (T: string) => spot * (1 - d[T]!);
  // Bootstrap yearly average rates off the committed curve; decay applies
  // beyond the LAST OBSERVED tenor (year 3 where the curve reaches 3Y,
  // year 1 where it stops at 1Y) — never a flat extension of missing tenors.
  // 2026-08-21 (John, option A): when no 1Y pair prints, year 1 is
  // bootstrapped from the LONGEST observed shorter tenor (6M, then 3M,
  // then 1M) and decay applies from year 1 — one more rung of the same
  // disclosed-degradation rule that already handles a curve stopping at
  // 1Y or 2Y. The card says "curve to 6M". Spot alone is never the anchor.
  const shortT = (['6M', '3M', '1M'] as const).find((t) => d[t] != null);
  const y1 = d['1Y'] != null ? c('1Y') : shortT ? c(shortT) : spot;
  const y2 = d['2Y'] != null ? 2 * c('2Y') - y1 : d['3Y'] != null ? (3 * c('3Y') - y1) / 2 : y1;
  const y3 = d['3Y'] != null && d['2Y'] != null ? 3 * c('3Y') - 2 * c('2Y') : y2;
  const lastYr = d['3Y'] != null ? 3 : d['2Y'] != null ? 2 : 1;
  const yObs = [y1, y2, y3];
  const rem = Math.max(0, life - age);
  const full = Math.floor(rem), frac = rem - full;
  let pv = 0;
  for (let i = 0; i < full + (frac > 0 ? 1 : 0); i++) {
    const yr = i + 1;
    const rate = yr <= lastYr ? yObs[i]! : yObs[lastYr - 1]! * Math.pow(1 - g, yr - lastYr);
    const fy = i < full ? 1 : frac;
    pv += (rate * IV_HOURS * fy * u * m) / Math.pow(1 + r, i + 0.5);
  }
  return pv;
}
export const ivCards = IV_SPEC.map((s) => {
  const rrow = ivRates.find((r) => r['series_id'] === `CRI-T2-${s.model}-ALL-GTD-OD-US`);
  const spot = rrow ? Number(rrow['price_headline']) : NaN;
  const d: Record<string, number> = {};
  for (const r of ivCmi)
    if (r['band'] === 'NEOCLOUD' && r['silicon_id'] === s.silicon && r['metric'] === 'spread_to_spot')
      d[r['tenor']!] = -Number(r['value']);
  const hwm = hw.models.find((m: any) => m.key === s.key) as any;
  // A committed leg of SOME tenor is required; the anchor is never spot alone.
  const hasCurve = ['3Y', '2Y', '1Y', '6M', '3M', '1M'].some((t) => d[t] != null);
  if (!rrow || !Number.isFinite(spot) || !hasCurve) return null;
  // Curve extent is DISCLOSED, not required (2026-08-05): the bootstrap
  // already decays beyond the last observed tenor by construction, and the
  // hard 3Y gate silently dropped A100/H200 when the neocloud panel's 3Y
  // pairs stopped printing (A100 curve now reaches 1Y, H200 2Y). Each card
  // states "curve to {tenor}"; a shorter curve widens model reliance on
  // the decay assumption rather than hiding the chip.
  if (!s.modeledOnly && !hwm) return null;
  const age = IV_NOW - s.vintage;
  const base = ivValue(spot, d, IV_BASE.r, IV_BASE.life, age);
  // One-at-a-time sensitivity: each assumption varied around base with the
  // others held at base — no stacking of jointly optimistic/pessimistic
  // corners (a full cross doubles the band with scenarios nobody holds).
  // The band carries RATE assumptions only (discount rate, decay). Service
  // life is a discrete structural scenario, not parameter noise — the 5y/7y
  // values are returned as named points (lifePts) and rendered as labeled
  // marks beside the band (John, 2026-08-25: folding a ±1y life leg into
  // the min–max made A100's band read 90% of base while hiding that the
  // whole question is one-vs-two remaining earning years). Life bounds at
  // or below the chip's current age are omitted: a zero-year PV is the
  // salvage question, not a rate-model output.
  const combos: number[] = [ivValue(spot, d, IV_BASE.r, IV_BASE.life, age)];
  // r band re-anchored 2026-08-25 (John): top bound 25% -> 20%. The 25% leg
  // carried 2023-era debt (~15% all-in) + equity premium; the 2026 ledger
  // prints GPU-backed debt at 5.45%-9.875%, so the top bound is now the
  // costliest current debt (~10%) + the same equity spread.
  for (const rr of [0.10, 0.20]) combos.push(ivValue(spot, d, rr, IV_BASE.life, age));
  for (const gg of IV_G) combos.push(ivValue(spot, d, IV_BASE.r, IV_BASE.life, age, gg));
  const lifePts = [5, 7].filter((lf) => lf > age)
    .map((lf) => ({ life: lf, v: ivValue(spot, d, IV_BASE.r, lf, age) }));
  const ask = hwm?.ask?.med ?? null;
  const t90 = hwm?.t90?.med ?? null;
  // No-contract floor: the same income model with the published Neocloud
  // interruptible cell as the earning path — what the asset is worth if it
  // never wins a contract and earns the revocable-occupancy rate from day
  // one (flat year 1, decay beyond — no committed curve by construction).
  // The observable form of the re-leasing downside.
  const intRow = ivRates.find((r) => r['series_id'] === `CRI-T2-${s.model}-ALL-INT-OD-ALL`
                                     && r['promotion_status'] === 'Published');
  const intRate = intRow ? Number(intRow['price_headline']) : NaN;
  const intStress = Number.isFinite(intRate)
    ? ivValue(intRate, {}, IV_BASE.r, IV_BASE.life, age) : null;
  // Strip scale: zero-anchored so mark positions read as magnitudes.
  const smax = Math.max(...combos, ...lifePts.map((q) => q.v), base,
                        ask ?? 0, t90 ?? 0, intStress ?? 0) * 1.06;
  return {
    ...s, spot, base, lo: Math.min(...combos), hi: Math.max(...combos), smax, lifePts,
    intStress, intRate: Number.isFinite(intRate) ? intRate : null,
    intN: intRow ? Number(intRow['n_sources']) || null : null,
    remaining: Math.max(0, IV_BASE.life - age),
    ask, askN: hwm?.ask?.n ?? null, askSources: hwm?.ask?.sources ?? null,
    t90, t90N: hwm?.t90?.n ?? null,
    basis: hwm?.basis?.usd ?? null, rateAsOf: rrow['as_of_date'],
    curveTo: (['3Y', '2Y', '1Y', '6M', '3M', '1M'] as const).find((t) => d[t] != null) ?? '1Y',
    rateN: Number(rrow['n_sources']) || null,
    rateStatus: rrow['promotion_status'] ?? '',
  };
}).filter((x): x is NonNullable<typeof x> => x != null)
  .sort((a, b) => b.base - a.base);

export type IvCard = (typeof ivCards)[number];
