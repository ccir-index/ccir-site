/*
  Loads the current snapshot from a bundled CSV. The CSV carries the
  7-segment series_id grammar (CRI-{tier}-{chip}-{form}-{int}-{term}-{region})
  with two parallel taxonomies in the `factory_type` column:

    - HEADLINE rows: T1IF / T2IF / T3IF on the 6 premium silicons. These
      drive the homepage, /tiers, /spreads, /applications.
    - INDICATIVE rows: legacy source-class codes (HIF / IIF / SIF / DIF) on
      long-tail chips with no algorithmic tier coverage. These ride along
      as reference rates only — surfaced on /explorer Section 2 with no
      tier badge and no tier filter.
*/
import csvText from './rates_daily.csv?raw';
import shadowCsvText from './rates_shadow.csv?raw';
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

function parseCsv(text: string): Rate[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0]!.split(',');
  return lines.slice(1)
    .filter((l) => l.trim().length > 0)
    .map((line) => parseRow(line, headers))
    .filter((r) => r.series_id && r.factory_type && r.gpu_model)
    // OD-only site: drop every committed-term row at the loader so no
    // 1M / 3M / 6M / 1Y / 2Y / 3Y / 5Y series can leak into any page or
    // explorer table. CSVs still carry them; the site never surfaces them.
    .filter((r) => r.commitment_term === 'OnDemand');
}

const publishedRates: Rate[] = parseCsv(csvText);
const shadowRates: Rate[] = parseCsv(shadowCsvText);

// Full series set — Published + Shadow. Already filtered to OnDemand only
// by parseCsv above.
export const rates: Rate[] = [...publishedRates, ...shadowRates];

// HEADLINE rows: premium-chip T1IF/T2IF/T3IF taxonomy. Drives the front of
// the site (homepage, /tiers, /spreads, /applications).
export const headlineRates: Rate[] = rates.filter((r) => r.scope === 'headline');

// INDICATIVE rows: long-tail chips, no tier coverage. Drives /explorer
// Section 2 only.
export const indicativeRates: Rate[] = rates.filter((r) => r.scope === 'indicative');

// Native-product rule for the T-tier headline cells: T1IF/T2IF prefer
// GTD-only on-demand; T3IF pools GTD + INT (genuine market signal at the
// marketplace tier). Falls back to fully-pooled when the GTD-only series
// doesn't exist.
function preferredInterruptibility(tier: Tier): Interruptibility {
  return tier === 'T3IF' ? 'ALL' : 'GTD';
}

function findHeadline(tier: Tier, chip: string, term: Term, pool: Rate[]): Rate | undefined {
  const want = preferredInterruptibility(tier);
  const match = (intCheck: Interruptibility) => pool.find(
    (r) => r.tier === tier && r.gpu_model === chip && r.commitment_term === term &&
           r.form_factor === 'ALL' && r.interruptibility === intCheck && r.region === 'ALL',
  );
  return match(want) ?? (want === 'GTD' ? match('ALL') : undefined);
}

// Baseline = headline rate per (tier, chip, term) under the native-product
// rule. Headline-only.
export const baselineRates: Rate[] = (() => {
  const out: Rate[] = [];
  const seen = new Set<string>();
  for (const r of headlineRates) {
    if (r.form_factor !== 'ALL' || r.region !== 'ALL') continue;
    if (!r.tier) continue;
    const key = `${r.tier}|${r.gpu_model}|${r.commitment_term}`;
    if (seen.has(key)) continue;
    const headline = findHeadline(r.tier, r.gpu_model, r.commitment_term, headlineRates);
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
  const out: Record<Tier, number> = { T1IF: 0, T2IF: 0, T3IF: 0 };
  for (const r of headlineRates) {
    if (!r.tier) continue;
    if (r.commitment_term !== 'OnDemand') continue;
    if (r.form_factor !== 'ALL' || r.region !== 'ALL') continue;
    if (r.n_sources > out[r.tier]) out[r.tier] = r.n_sources;
  }
  return out;
}

export const meta: SnapshotMeta = {
  as_of_date: '2026-04-26',
  published_at_ct: '2026-04-26T08:05:25-05:00',
  published_at_utc: '2026-04-26T13:05:25+00:00',
  run_id: 'export-20260426T130522Z-cd2eeeb4',
  methodology_version: 'v2.0.0',
  independence_declaration: 'All inputs publicly observable. No solicited quotes.',
  contributing_today: 25,
  sources_by_tier: computeSourcesByTier(),
};

// Newest → oldest by generation. Premium-scope silicon first
// (Blackwell → Hopper → Ampere), then long-tail / indicative chips
// in same generation order, DC-grade before consumer within each gen.
const CHIP_ORDER = [
  // Premium scope (v2.0 algorithmic tier coverage)
  'GB200', 'B200',          // Blackwell (2024) — GB200 NVL72 leads (flagship)
  'H200', 'H100',           // Hopper (2023)
  'A100',                   // Ampere (2020)
  // Long-tail / indicative
  'GB300', 'B300',          // Blackwell Ultra (2025)
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
      // For non-T3IF prefer GTD; for T3IF prefer ALL (pooled). For
      // indicative pool, prefer ALL.
      const wantInt: Interruptibility = isHeadline
        ? (tier === 'T3IF' ? 'ALL' : 'GTD')
        : 'ALL';
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
    const t1 = rs.find((r) => r.tier === 'T1IF');
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
  const out: TierMatrixView = { T1IF: undefined, T2IF: undefined, T3IF: undefined };
  for (const r of headlineRates) {
    if (!r.tier) continue;
    if (r.gpu_model !== chip) continue;
    if (r.commitment_term !== 'OnDemand') continue;
    if (r.form_factor !== 'ALL' || r.region !== 'ALL') continue;
    const wantInt: Interruptibility = r.tier === 'T3IF' ? 'ALL' : 'GTD';
    if (r.interruptibility !== wantInt && out[r.tier]) continue;
    const existing = out[r.tier];
    if (!existing
        || (existing.promotion_status === 'Shadow' && r.promotion_status === 'Published')
        || (existing.interruptibility !== wantInt && r.interruptibility === wantInt)) {
      out[r.tier] = r;
    }
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
    if (r.tier !== 'T1IF' && r.tier !== 'T2IF') continue;
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
