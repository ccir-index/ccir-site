/*
  Premium-chip algorithmic taxonomy. Three deployment tiers — T1IF, T2IF,
  T3IF — classified per-SKU from a capability bundle (fabric, host topology,
  bundle depth). The merged v2.0 methodology covers ONLY this 3-tier model
  on the 6 premium silicons. Long-tail chips (L4, L40, L40S, A40, T4, V100,
  3090, 4090, 5090, etc.) appear in the data as INDICATIVE rates with no
  tier coverage — the algorithmic classifier doesn't fire on them.
*/
export type Tier = 'T1IF' | 'T2IF' | 'T3IF';
export type Term = 'OnDemand' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y';
export type Confidence = 'High' | 'Medium' | 'Low';
export type PromotionStatus = 'Published' | 'Shadow';

// Axis tokens — `ALL` is the pooled sentinel per the 7-segment grammar.
export type FormFactor = 'SXM' | 'PCIe' | 'NVL' | 'ALL';
export type Interruptibility = 'GTD' | 'INT' | 'ALL';
export type Region = 'US' | 'EU' | 'APAC' | 'Other' | 'ALL';

// Scope tag — added at load time. Headline rows fall inside the v2.0
// algorithmic tier scope (T1IF/T2IF/T3IF on the 6 premium silicons).
// Indicative rows are panel medians for long-tail chips that ride along
// with no tier classification.
export type Scope = 'headline' | 'indicative';

export interface Rate {
  series_id: string;
  as_of_date: string;
  // Scope: 'headline' for premium-chip T-tier rows, 'indicative' for
  // long-tail chips with no tier coverage.
  scope: Scope;
  // Tier is defined ONLY for headline rows.
  tier?: Tier;
  // For indicative rows we keep the legacy source-class tag (HIF/IIF/SIF/DIF)
  // for internal grouping, but it is never surfaced in user-facing copy.
  legacy_class?: string;
  // factory_type retained for migration history — same value as tier on
  // headline rows, same value as legacy_class on indicative rows.
  factory_type: string;
  gpu_model: string;
  form_factor: FormFactor;
  interruptibility: Interruptibility;
  region: Region;
  commitment_term: Term;
  headline_window_days: number;
  price_mean: number;
  price_median: number;
  price_p25: number;
  price_p75: number;
  price_min: number;
  price_max: number;
  price_mean_1d: number;
  price_mean_3d: number;
  price_mean_7d: number;
  n_sources: number;
  n_observations: number;
  hhi: number | null;
  confidence_level: Confidence;
  promotion_status: PromotionStatus;
  window_start: string;
  window_end: string;
  methodology_version: string;
}

export interface SnapshotMeta {
  as_of_date: string;
  published_at_ct: string;
  published_at_utc: string;
  run_id: string;
  methodology_version: string;
  independence_declaration: string;
  contributing_today: number;
  sources_by_tier: Record<Tier, number>;
}

export const TIERS: readonly Tier[] = ['T1IF', 'T2IF', 'T3IF'] as const;

export const TIER_LABELS: Record<Tier, string> = {
  T1IF: 'Tier 1 Intelligence Factory',
  T2IF: 'Tier 2 Intelligence Factory',
  T3IF: 'Tier 3 Intelligence Factory',
};

// Compact form for narrow contexts (table column headers, etc.) where the
// full Intelligence Factory name would wrap.
export const TIER_LABELS_SHORT: Record<Tier, string> = {
  T1IF: 'Tier 1 IF',
  T2IF: 'Tier 2 IF',
  T3IF: 'Tier 3 IF',
};

// Crude-oil grade parallels. Body-prose flavor only — never a card subtitle.
// Three quality grades quoted side by side because they price distinct
// feedstock grades — same logic for compute deployment tiers.
export const TIER_OIL_GRADES: Record<Tier, string> = {
  T1IF: 'Light Sweet Crude',
  T2IF: 'Medium Crude',
  T3IF: 'Heavy Sour Crude',
};

// Premium silicons covered by the merged v2.0 algorithmic taxonomy. Tokens
// match the CSV `gpu_model` column. Form factor (SXM / PCIe / NVL) is a
// separate axis carried in `form_factor`. The brief calls out 6 SKUs;
// the data uses 5 chip tokens — A100 spans both 80GB and 40GB variants
// (A100-40GB appears as a tail token within a few series_ids), GB200 is
// the NVL-form Blackwell.
export const PREMIUM_CHIPS: readonly string[] = [
  'GB200',
  'B200',
  'H200',
  'H100',
  'A100',
] as const;

const PREMIUM_CHIP_SET = new Set<string>(PREMIUM_CHIPS);
export function isPremiumChip(c: string): boolean {
  return PREMIUM_CHIP_SET.has(c);
}

export const TERM_DISPLAY: Record<string, string> = {
  OnDemand: 'OD',
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  '1Y': '1Y',
  '2Y': '2Y',
  '3Y': '3Y',
  '5Y': '5Y',
};

export const INT_LABELS: Record<Interruptibility, string> = {
  GTD: 'Guaranteed',
  INT: 'Interruptible',
  ALL: 'Pooled',
};

export const REGION_LABELS: Record<Region, string> = {
  US: 'US',
  EU: 'EU',
  APAC: 'APAC',
  Other: 'RoW',
  ALL: 'Pooled',
};
