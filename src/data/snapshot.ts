/*
  Loads the current snapshot from a bundled CSV. The CSV carries the
  7-segment series_id grammar (CRI-{tier}-{chip}-{form}-{int}-{term}-{region})
  with two parallel taxonomies in the `factory_type` column:

    - HEADLINE rows: T1IF / T2IF / T3IF on the 6 premium silicons. These
      drive the homepage, /tiers, and /rates.
    - INDICATIVE rows: legacy source-class codes (HIF / IIF / SIF / DIF) on
      long-tail chips with no algorithmic tier coverage. These ride along
      as reference rates only — surfaced on /explorer Section 2 with no
      tier badge and no tier filter.
*/
import csvText from './rates_daily.csv?raw';
import shadowCsvText from './rates_shadow.csv?raw';
import prevCsvText from './rates_daily_prev.csv?raw';
import historyCsvText from './indices_history.csv?raw';
import metaJson from './meta.json';
import type {
  Rate, Tier, Confidence, PromotionStatus, Term, SnapshotMeta,
  FormFactor, Interruptibility, Region,
} from './types';
import { TIERS } from './types';

const TIER_SET = new Set<string>(TIERS);
function isTier(v: string): v is Tier {
  return TIER_SET.has(v);
}

function parseRow(line: string, headers: string[]): Rate {
  const cells = line.split(',');
  const get = (k: string) => cells[headers.indexOf(k)];
  const num = (k: string) => Number(get(k));
  const numOrNull = (k: string) => {
    const v = get(k);
    if (v === undefined || v === '' || v === 'null') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const ft = get('factory_type')!;
  const isHeadline = isTier(ft);
  return {
    series_id: get('series_id')!,
    as_of_date: get('as_of_date')!,
    scope: isHeadline ? 'headline' : 'indicative',
    tier: isHeadline ? (ft as Tier) : undefined,
    legacy_class: isHeadline ? undefined : ft,
    factory_type: ft,
    gpu_model: get('gpu_model')!,
    form_factor: get('form_factor') as FormFactor,
    interruptibility: get('interruptibility') as Interruptibility,
    region: get('region') as Region,
    commitment_term: get('commitment_term') as Term,
    headline_window_days: num('headline_window_days'),
    price_mean: num('price_mean_usd_per_gpu_hour'),
    price_median: num('price_median'),
    price_headline: numOrNull('price_headline'),
    headline_stat: (() => { const v = get('headline_stat'); return v === undefined || v === '' ? null : v; })(),
    price_p25: num('price_p25'),
    price_p75: num('price_p75'),
    price_min: num('price_min'),
    price_max: num('price_max'),
    price_mean_1d: num('price_mean_1d'),
    price_mean_3d: num('price_mean_3d'),
    price_mean_7d: num('price_mean_7d'),
    n_sources: num('n_sources'),
    n_observations: num('n_observations'),
    hhi: numOrNull('hhi'),
    confidence_level: get('confidence_level') as Confidence,
    promotion_status: get('promotion_status') as PromotionStatus,
    window_start: get('window_start')!,
    window_end: get('window_end')!,
    methodology_version: get('methodology_version')!,
  };
}

function parseAllRows(text: string): Rate[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0]!.split(',');
  return lines.slice(1)
    .filter((l) => l.trim().length > 0)
    .map((line) => parseRow(line, headers))
    .filter((r) => r.series_id && r.factory_type && r.gpu_model);
}

function parseCsv(text: string): Rate[] {
  // OD-only for the benchmark pools: no committed-term row can leak into the
  // tier ladders or explorer tables. Committed-term surfaces ONLY through the
  // dedicated market-intelligence band below (committedBandCell), which is
  // badged "not a citable reference rate" wherever it renders.
  // NEOCLOUD band rows are excluded at EVERY term — the band's OD companion
  // anchor (product_class=market_intelligence upstream) must not flow into
  // the citable/indicative pools; it surfaces only via neocloudOdCell.
  // The retired GRADE taxonomy (T1IF/T2IF/T3IF) and the NEOCLOUD/STRIPPED
  // market-intelligence bands ship in the same CSV as duplicate series; drop
  // them here so only the operator-segment headline (T1/T2/T3) flows through.
  const DROP_FACTORY_TYPES = new Set([
    'NEOCLOUD', 'STRIPPED', 'T1IF', 'T2IF', 'T3IF',
  ]);
  return parseAllRows(text).filter(
    (r) => r.commitment_term === 'OnDemand' && !DROP_FACTORY_TYPES.has(r.factory_type),
  );
}

const publishedRates: Rate[] = parseCsv(csvText);
const shadowRates: Rate[] = parseCsv(shadowCsvText);

// Committed-term MARKET INTELLIGENCE band (gating note 2026-06-27, live PR
// #37). CRI-NEOCLOUD-* = T2IF+T3IF committed pooled per chip × tenor,
// global-USD scope. Tier-2 product: every surface that renders these MUST
// badge "market intelligence — not a citable reference rate". Published +
// Provisional only (Shadow band cells — e.g. B300 at n=1 — stay dark).
const committedBandRates: Rate[] = parseAllRows(csvText).filter(
  (r) => r.factory_type === 'NEOCLOUD' && r.commitment_term !== 'OnDemand',
);

// Operator-tier T2 (Neocloud) committed rows — the /term source that replaces
// the retired NEOCLOUD band. Uses parseAllRows (NOT parseCsv) so committed
// terms aren't stripped by the OnDemand-only gate that headlineRates rides on.
const t2CommittedRates: Rate[] = parseAllRows(csvText).filter(
  (r) => r.factory_type === 'T2' && r.commitment_term !== 'OnDemand',
);

// T1 (Hyperscaler) committed cells — the strict T1 cell IS the T1 band
// (Azure/GCP reserved schedule). Same MI badge rule. Thin today (mostly n<=2).
const t1ifCommittedRates: Rate[] = parseAllRows(csvText).filter(
  (r) => r.factory_type === 'T1' && r.commitment_term !== 'OnDemand',
);

// NEOCLOUD band OD companion — the same pooled T2IF+T3IF global-USD panel
// as the committed band, at on-demand. The apples-to-apples OD anchor for
// the /term par curve (both sides of the OD→1M step draw one panel). MI,
// never citable. Absent on snapshots predating the gold emit (PR #41) —
// callers fall back to the T2IF headline.
const neocloudOdRates: Rate[] = parseAllRows(csvText).filter(
  (r) => r.factory_type === 'NEOCLOUD' && r.commitment_term === 'OnDemand',
);

export function neocloudOdCell(chip: string): Rate | undefined {
  return neocloudOdRates
    .filter(
      (r) => r.gpu_model === chip && r.form_factor === 'ALL' &&
             r.region === 'ALL' && r.promotion_status !== 'Shadow',
    )
    .sort((a, b) => variantRank(a) - variantRank(b) || (b.n_sources ?? 0) - (a.n_sources ?? 0))[0];
}

export type GeoToken = 'ALL' | 'US' | 'EU';

// NEOCLOUD band cell for (chip, tenor) — baseline axes (form/region pooled).
export function committedBandCell(chip: string, term: Term): Rate | undefined {
  return committedBandRates
    .filter(
      (r) => r.gpu_model === chip && r.commitment_term === term &&
             r.form_factor === 'ALL' && r.region === 'ALL',
    )
    .sort((a, b) => variantRank(a) - variantRank(b) || (b.n_sources ?? 0) - (a.n_sources ?? 0))[0];
}

export function t1ifCommittedCell(chip: string, term: Term): Rate | undefined {
  return t1ifCommittedRates
    .filter(
      (r) => r.gpu_model === chip && r.commitment_term === term &&
             r.form_factor === 'ALL' && r.region === 'ALL',
    )
    .sort((a, b) => variantRank(a) - variantRank(b) || (b.n_sources ?? 0) - (a.n_sources ?? 0))[0];
}

// Every tenor with at least one non-Shadow band cell, in curve order.
export function committedBandTenors(): Term[] {
  const order: Term[] = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y'];
  return order.filter((t) => committedBandRates.some((r) => r.commitment_term === t));
}

// OD headline cell per (tier, chip, geo). region=US/EU cells ride the
// geo-split series (#32); Provisional geo cells surface with their status
// (Shadow never does). Published+Provisional pool — the strict
// Published-only flagship rule stays for region=ALL flagship views;
// the geo cuts are explicitly allowed to be Provisional-badged.
export function tierOdCell(tier: Tier, chip: string, region: GeoToken): Rate | undefined {
  return headlineRates
    .filter(
      (r) => r.tier === tier && r.gpu_model === chip &&
             r.commitment_term === 'OnDemand' && r.form_factor === 'ALL' &&
             r.interruptibility === 'GTD' && r.region === region &&
             r.promotion_status !== 'Shadow',
    )
    .sort((a, b) => variantRank(a) - variantRank(b) || (b.n_sources ?? 0) - (a.n_sources ?? 0))[0];
}

// T2IF OD — the seam-consistent OD companion for the committed band (same
// market segment on both sides of the row; a T1IF OD next to a neocloud
// committed number would recreate the cross-seam comparison the gating
// removed).
export function t2ifOdCell(chip: string, region: GeoToken): Rate | undefined {
  return tierOdCell('T2', chip, region);
}

// Previous-day medians per series_id. Drives the ticker arrows: today's
// price_median vs prior-day price_median. Empty map on bootstrap days when
// no prior CSV is bundled yet (loader treats absence as "indeterminate"
// which surfaces as the flat glyph).
export const prevMedians: Map<string, number> = (() => {
  const out = new Map<string, number>();
  // parseCsv filters to OnDemand only, but the previous CSV also has
  // committed terms — re-parse minimally without that filter so the lookup
  // covers every series the current snapshot might reference.
  const text = prevCsvText.trim();
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  const headers = lines[0]!.split(',');
  const idIdx = headers.indexOf('series_id');
  const medIdx = headers.indexOf('price_median');
  if (idIdx === -1 || medIdx === -1) return out;
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(',');
    const id = cells[idIdx];
    const med = Number(cells[medIdx]);
    if (id && Number.isFinite(med)) out.set(id, med);
  }
  return out;
})();

// Per-series price-median history bundled at sync time. Keyed by series_id;
// each value is sorted ascending by date. Powers the Sparkline component on
// the rates table and /tiers ladder.
export interface HistoryPoint { date: string; median: number }

const _seriesHistory: Map<string, HistoryPoint[]> = (() => {
  const out = new Map<string, HistoryPoint[]>();
  const text = historyCsvText.trim();
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  const headers = lines[0]!.split(',');
  const idIdx = headers.indexOf('series_id');
  const dateIdx = headers.indexOf('as_of_date');
  const medIdx = headers.indexOf('price_median');
  if (idIdx === -1 || dateIdx === -1 || medIdx === -1) return out;
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(',');
    const id = cells[idIdx];
    const d = cells[dateIdx];
    const med = Number(cells[medIdx]);
    if (!id || !d || !Number.isFinite(med)) continue;
    let arr = out.get(id);
    if (!arr) { arr = []; out.set(id, arr); }
    arr.push({ date: d, median: med });
  }
  for (const arr of out.values()) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
})();

export function seriesHistory(seriesId: string): HistoryPoint[] {
  return _seriesHistory.get(seriesId) ?? [];
}

// Full series set — Published + Shadow. Already filtered to OnDemand only
// by parseCsv above.
export const rates: Rate[] = [...publishedRates, ...shadowRates];

// HEADLINE rows: premium-chip T1IF/T2IF/T3IF taxonomy. Drives /explorer
// Section 1 (Published + Shadow visible there with Shadow flagged in UI).
export const headlineRates: Rate[] = rates.filter((r) => r.scope === 'headline');

// FLAGSHIP rows: Published-only subset of headline. Drives the homepage
// chip ladder, /tiers per-silicon table, and /spreads matrix. Below-gate
// Shadow series do not surface in flagship views — the explorer is the
// place to see them.
export const flagshipRates: Rate[] = headlineRates.filter(
  (r) => r.promotion_status === 'Published',
);

// INDICATIVE rows: long-tail chips, no tier coverage. Drives /explorer
// Section 2 only.
export const indicativeRates: Rate[] = rates.filter((r) => r.scope === 'indicative');

// Headline value per the n-rule, preferring the gold-derived column when the
// snapshot carries it. n>=10 → mean (deep panel), else median (thin, outlier-
// fragile). One place; pages call this instead of reimplementing the rule.
export function headlineValue(r: Rate): number {
  if (r.price_headline != null) return r.price_headline;
  return (r.n_sources ?? 0) >= 10 ? r.price_mean : r.price_median;
}
export function headlineStatOf(r: Rate): 'mean' | 'median' {
  if (r.headline_stat === 'mean' || r.headline_stat === 'median') return r.headline_stat;
  return (r.n_sources ?? 0) >= 10 ? 'mean' : 'median';
}

// Operator-tier T2 (Neocloud) committed cell per (chip, tenor) — the committed
// term-structure source that replaces the retired NEOCLOUD grade band. Prefer
// GTD (committed is guaranteed by nature), form + region pooled, non-Shadow.
export function neocloudCommittedCell(chip: string, term: Term): Rate | undefined {
  return t2CommittedRates
    .filter((r) => r.gpu_model === chip &&
                   r.commitment_term === term && r.form_factor === 'ALL' &&
                   r.region === 'ALL' && r.interruptibility === 'GTD' &&
                   r.promotion_status !== 'Shadow')
    .sort((a, b) => variantRank(a) - variantRank(b) || (b.n_sources ?? 0) - (a.n_sources ?? 0))[0];
}

// Tenors with at least one operator-tier T2 committed cell, in curve order.
export function neocloudCommittedTenors(): Term[] {
  const order: Term[] = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y'];
  return order.filter((t) => t2CommittedRates.some(
    (r) => r.commitment_term === t &&
           r.form_factor === 'ALL' && r.region === 'ALL' &&
           r.interruptibility === 'GTD' && r.promotion_status !== 'Shadow'));
}

// Native-product rule for the T-tier headline cells: all three tiers
// (T1IF/T2IF/T3IF) are GTD-only — apples-to-apples guaranteed-grade marks.
// (T3IF used to pool GTD+INT for marketplace spot, but the one live/executable
// venue, Vast, is now pulled from the rate panel and shown on /basis as the
// clearing-vs-list overlay; the residual T3IF list-ask pool is GTD anyway.)
// Falls back to the fully-pooled ('ALL') series if a GTD-only series is absent
// (e.g. a transitional snapshot before the gold change lands).
function preferredInterruptibility(_tier: Tier): Interruptibility {
  return 'GTD';
}

// Variant-specific series (e.g. CRI-T2IF-A100-40GB-…) carry a NNGB token the
// pooled headline lacks; they share gpu_model/form_factor with the pooled row
// so a plain find() can grab them by CSV sort order (40GB < ALL — this put the
// n=3 A100-40GB sub-series in the homepage A100 slot on 2026-06-11). Rank
// variant rows after pooled, then prefer breadth.
function variantRank(r: Rate): number {
  return /-\d+GB-/.test(r.series_id) ? 1 : 0;
}

function findHeadline(tier: Tier, chip: string, term: Term, pool: Rate[]): Rate | undefined {
  const want = preferredInterruptibility(tier);
  const match = (intCheck: Interruptibility) => {
    const candidates = pool.filter(
      (r) => r.tier === tier && r.gpu_model === chip && r.commitment_term === term &&
             r.form_factor === 'ALL' && r.interruptibility === intCheck && r.region === 'ALL',
    );
    return candidates.sort(
      (a, b) => variantRank(a) - variantRank(b) || (b.n_sources ?? 0) - (a.n_sources ?? 0),
    )[0];
  };
  return match(want) ?? (want === 'GTD' ? match('ALL') : undefined);
}

// Baseline = flagship rate per (tier, chip, term) under the native-product
// rule. Published-only — Shadow rows are not surfaced in flagship views.
export const baselineRates: Rate[] = (() => {
  const out: Rate[] = [];
  const seen = new Set<string>();
  for (const r of flagshipRates) {
    if (r.form_factor !== 'ALL' || r.region !== 'ALL') continue;
    if (!r.tier) continue;
    const key = `${r.tier}|${r.gpu_model}|${r.commitment_term}`;
    if (seen.has(key)) continue;
    const headline = findHeadline(r.tier, r.gpu_model, r.commitment_term, flagshipRates);
    if (!headline) continue;
    seen.add(key);
    out.push(headline);
  }
  return out;
})();

// Compute sources_by_tier from the loaded headline rows. Pick the max
// observed n_sources per tier across pooled OD rows — the simplest measure
// of how broad each tier's panel is.
function computeSourcesByTier(): Record<Tier, number> {
  const out: Record<Tier, number> = { T1: 0, T2: 0, T3: 0 };
  for (const r of headlineRates) {
    if (!r.tier) continue;
    if (r.commitment_term !== 'OnDemand') continue;
    if (r.form_factor !== 'ALL' || r.region !== 'ALL') continue;
    if (r.n_sources > out[r.tier]) out[r.tier] = r.n_sources;
  }
  return out;
}

export const meta: SnapshotMeta = {
  ...metaJson,
  sources_by_tier: computeSourcesByTier(),
};

// Newest → oldest by generation. Premium-scope silicon first
// (Blackwell → Hopper → Ampere), then long-tail / indicative chips
// in same generation order, DC-grade before consumer within each gen.
const CHIP_ORDER = [
  // Premium scope (algorithmic tier coverage; B300/GB300 promoted to
  // PREMIUM_CHIPS 2026-07-01 on the GB200 precedent). GB200 leads (flagship
  // rack-scale, deepest panel); GB300 slots beside it when it publishes.
  'GB200', 'GB300',         // Blackwell rack-scale
  'B300', 'B200',           // Blackwell / Blackwell Ultra SXM
  'H200', 'H100',           // Hopper (2023)
  'A100',                   // Ampere (2020)
  // Long-tail / indicative
  'L40S', 'L40', 'L4',      // Ada DC (2022-2023)
  '5090', '4090',           // Blackwell/Ada consumer
  'A40', 'A10',             // Ampere DC long-tail
  '3090',                   // Ampere consumer
  'T4',                     // Turing (2018)
  'V100',                   // Volta (2017)
];
const TERM_ORDER: Term[] = ['OnDemand', '1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y'];

function chipRank(c: string) {
  const direct = CHIP_ORDER.indexOf(c);
  if (direct !== -1) return direct;
  const base = c.split('-')[0]!;
  const baseRank = CHIP_ORDER.indexOf(base);
  return baseRank === -1 ? 999 : baseRank + 0.5;
}
function termRank(t: Term) {
  const i = TERM_ORDER.indexOf(t);
  return i === -1 ? 999 : i;
}
function tierRank(t: Tier) {
  return TIERS.indexOf(t);
}

export const ratesSorted: Rate[] = [...baselineRates].sort((a, b) => {
  return (
    tierRank(a.tier!) - tierRank(b.tier!) ||
    chipRank(a.gpu_model) - chipRank(b.gpu_model) ||
    termRank(a.commitment_term) - termRank(b.commitment_term)
  );
});

export interface TierGroup {
  tier: Tier;
  rates: Rate[];
}

export function ratesByTier(): TierGroup[] {
  return TIERS.map((tier) => ({
    tier,
    rates: ratesSorted.filter((r) => r.tier === tier),
  }));
}

export const publishedChips: string[] = (() => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  // Headline silicons first
  for (const c of CHIP_ORDER) {
    if (ratesSorted.some((r) => r.gpu_model === c)) {
      if (!seen.has(c)) { seen.add(c); ordered.push(c); }
    }
  }
  for (const r of ratesSorted) {
    if (!seen.has(r.gpu_model)) { seen.add(r.gpu_model); ordered.push(r.gpu_model); }
  }
  return ordered;
})();

export interface ChipTierView {
  tier: Tier;
  rates_by_term: Partial<Record<Term, Rate>>;
}

export function chipMatrix(chip: string): ChipTierView[] {
  const isHeadline = headlineRates.some((r) => r.gpu_model === chip);
  const pool = isHeadline ? headlineRates : indicativeRates;
  return TIERS.map((tier) => {
    const termMap: Partial<Record<Term, Rate>> = {};
    for (const r of pool) {
      if (r.gpu_model !== chip) continue;
      if (isHeadline && r.tier !== tier) continue;
      if (r.form_factor !== 'ALL' || r.region !== 'ALL') continue;
      // Headline tiers (T1IF/T2IF/T3IF) are all GTD-only now (Vast pulled to
      // the /basis overlay). Indicative (long-tail) pool prefers ALL. Both fall
      // back to whatever exists if the preferred grade is absent.
      const wantInt: Interruptibility = isHeadline ? 'GTD' : 'ALL';
      if (r.interruptibility !== wantInt) {
        if (termMap[r.commitment_term]) continue;
      }
      const existing = termMap[r.commitment_term];
      if (!existing) { termMap[r.commitment_term] = r; continue; }
      if (r.interruptibility === wantInt && existing.interruptibility !== wantInt) {
        termMap[r.commitment_term] = r;
      }
    }
    return { tier, rates_by_term: termMap };
  });
}

export function chipAvailableTerms(chip: string): Term[] {
  const isHeadline = headlineRates.some((r) => r.gpu_model === chip);
  const pool = isHeadline ? headlineRates : indicativeRates;
  const seen = new Set<Term>();
  const ordered: Term[] = [];
  for (const t of TERM_ORDER) {
    if (pool.some((r) => r.gpu_model === chip && r.commitment_term === t)) {
      if (!seen.has(t)) { seen.add(t); ordered.push(t); }
    }
  }
  return ordered;
}

export interface SpreadCell {
  rate: Rate;
  absolute_from_t1if: number | null;
  pct_discount_from_t1if: number | null;
}

export interface SpreadRow {
  chip: string;
  term: Term;
  cells: Partial<Record<Tier, SpreadCell>>;
  t1if_baseline: number | null;
  available_tiers: Tier[];
}

// chip token spans multiple hyphen segments (e.g., A100-40GB). Last 4
// segments are always form/int/term/region; strip them + the CRI/tier prefix.
function chipTokenFromSeriesId(series_id: string): string {
  const parts = series_id.split('-');
  return parts.slice(2, parts.length - 4).join('-');
}

export function spreadMatrix(): SpreadRow[] {
  const groups = new Map<string, Rate[]>();
  for (const r of baselineRates) {
    const chipToken = chipTokenFromSeriesId(r.series_id);
    const key = `${chipToken}|${r.commitment_term}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const rows: SpreadRow[] = [];
  for (const [key, rs] of groups) {
    const [chip, term] = key.split('|') as [string, Term];
    const t1 = rs.find((r) => r.tier === 'T1');
    const baseline = t1?.price_median ?? null;
    const cells: Partial<Record<Tier, SpreadCell>> = {};
    for (const tier of TIERS) {
      const r = rs.find((x) => x.tier === tier);
      if (!r) continue;
      cells[tier] = {
        rate: r,
        absolute_from_t1if: baseline == null ? null : r.price_median - baseline,
        pct_discount_from_t1if:
          baseline == null ? null : 1 - r.price_median / baseline,
      };
    }
    rows.push({
      chip,
      term,
      cells,
      t1if_baseline: baseline,
      available_tiers: rs.map((r) => r.tier!).filter(Boolean),
    });
  }

  return rows.sort(
    (a, b) => chipRank(a.chip) - chipRank(b.chip) || termRank(a.term) - termRank(b.term),
  );
}

// Per-silicon ladder for the T-tier matrix — OD baseline cell for each of
// T1IF/T2IF/T3IF (form=int=region all pooled, term=OnDemand). Cells may be
// undefined when a tier has no Published row for the chip.
export type TierMatrixView = Record<Tier, Rate | undefined>;

export function tierMatrix(chip: string): TierMatrixView {
  const out: TierMatrixView = { T1: undefined, T2: undefined, T3: undefined };
  for (const tier of ['T1', 'T2', 'T3'] as Tier[]) {
    const wantInt: Interruptibility = 'GTD';
    const candidates = flagshipRates.filter(
      (r) => r.tier === tier && r.gpu_model === chip && r.commitment_term === 'OnDemand' &&
             r.form_factor === 'ALL' && r.region === 'ALL',
    );
    // Preference order: native interruptibility, then the variant-POOLED
    // series over NNGB sub-variants (same first-match-by-sort bug as
    // findHeadline — the A100-40GB n=3 row shadowed the pooled n=10 row on
    // 2026-06-11), then breadth.
    out[tier] = candidates.sort(
      (a, b) =>
        (a.interruptibility === wantInt ? 0 : 1) - (b.interruptibility === wantInt ? 0 : 1) ||
        variantRank(a) - variantRank(b) ||
        (b.n_sources ?? 0) - (a.n_sources ?? 0),
    )[0];
  }
  return out;
}

// Premium-chip silicon list: only chips with at least one Published T-tier
// row in today's snapshot, in the canonical order from PREMIUM_CHIPS.
export function premiumChipsList(): string[] {
  const present = new Set<string>();
  for (const r of headlineRates) {
    if (r.promotion_status !== 'Published') continue;
    if (!r.tier) continue;
    if (r.tier !== 'T1' && r.tier !== 'T2') continue;
    present.add(r.gpu_model);
  }
  return [...PREMIUM_CHIPS].filter((c) => present.has(c));
}

import { PREMIUM_CHIPS } from './types';

// Long-tail (indicative) chip list — every chip that appears only in
// indicative rows and never in headline rows. Used by /explorer Section 2.
export function indicativeChipsList(): string[] {
  const headlineChips = new Set(headlineRates.map((r) => r.gpu_model));
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const c of CHIP_ORDER) {
    if (!headlineChips.has(c) && indicativeRates.some((r) => r.gpu_model === c)) {
      if (!seen.has(c)) { seen.add(c); ordered.push(c); }
    }
  }
  for (const r of indicativeRates) {
    if (headlineChips.has(r.gpu_model)) continue;
    if (!seen.has(r.gpu_model)) { seen.add(r.gpu_model); ordered.push(r.gpu_model); }
  }
  return ordered;
}

export interface RegionalCell {
  region: Region;
  price_mean: number;
  price_median: number;
  n_sources: number;
  n_observations: number;
}

export function regionalBreakdown(baselineSeriesId: string): RegionalCell[] | null {
  const baseline = rates.find((r) => r.series_id === baselineSeriesId);
  if (!baseline) return null;
  if (baseline.region !== 'ALL' || baseline.form_factor !== 'ALL' || baseline.interruptibility !== 'ALL') {
    return null;
  }
  const siblings = rates.filter(
    (r) =>
      r.factory_type === baseline.factory_type &&
      r.gpu_model === baseline.gpu_model &&
      r.commitment_term === baseline.commitment_term &&
      r.form_factor === 'ALL' &&
      r.interruptibility === 'ALL' &&
      r.region !== 'ALL' &&
      r.promotion_status === 'Published',
  );
  if (siblings.length === 0) return null;
  const regionOrder: Region[] = ['US', 'EU', 'APAC', 'Other'];
  return siblings
    .slice()
    .sort((a, b) => regionOrder.indexOf(a.region) - regionOrder.indexOf(b.region))
    .map((r) => ({
      region: r.region,
      price_mean: r.price_mean,
      price_median: r.price_median,
      n_sources: r.n_sources,
      n_observations: r.n_observations,
    }));
}
