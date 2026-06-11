// Client-side helpers for /utilization (implied blocking) and the /basis
// measured-occupancy section.
//
// CSVs under public/data/:
//   utilization_implied_<chip>.csv  daily blocking series per scope
//                                   (global / tier:T1..T4 / geo:US|EU),
//                                   two bounds: any-configuration + 8x-node
//   utilization_sources.csv         per (source x chip) coverage + signal type
//   utilization_macro.csv           provider breadth + idle inventory +
//                                   measured marketplace utilization
//   vast_occupancy_<chip>.csv       per-cycle measured occupancy series
//
// Chip ids here are IMU slugs (h100-sxm), NOT the silicon_id form the rate
// pages use — utilization is an IMU-domain product.

export const UTIL_CHIPS = [
  { id: 'h100-sxm',     label: 'H100 SXM',     short: 'H100' },
  { id: 'h200-sxm',     label: 'H200 SXM',     short: 'H200' },
  { id: 'b200-sxm',     label: 'B200 SXM',     short: 'B200' },
  { id: 'gb200',        label: 'GB200',        short: 'GB200' },
  { id: 'a100-sxm-80gb', label: 'A100 SXM 80G', short: 'A100-80' },
  { id: 'a100-sxm-40gb', label: 'A100 SXM 40G', short: 'A100-40' },
] as const;

export type UtilChipId = typeof UTIL_CHIPS[number]['id'];

// Occupancy files carry Vast's own variant grain. Vast cannot split A100
// 80GB/40GB, so A100 is published as the single 'a100-sxm' slug.
export const OCC_CHIPS = [
  { id: 'all',       label: 'All chips', short: 'ALL' },
  { id: 'h100-sxm',  label: 'H100 SXM',  short: 'H100' },
  { id: 'h100-pcie', label: 'H100 PCIe', short: 'H100-P' },
  { id: 'h200-sxm',  label: 'H200 SXM',  short: 'H200' },
  { id: 'b200-sxm',  label: 'B200 SXM',  short: 'B200' },
  { id: 'a100-sxm',  label: 'A100 SXM',  short: 'A100' },
] as const;

export type OccChipId = typeof OCC_CHIPS[number]['id'];

const OPERATOR_CLASS_LABEL: Record<string, string> = {
  T1: 'Tier 1 operators (hyperscaler)',
  T2: 'Tier 2 operators (neocloud)',
  T3: 'Tier 3 operators (value cloud)',
  T4: 'Tier 4 operators (distributed)',
};

export function operatorClassLabel(t: string): string {
  return OPERATOR_CLASS_LABEL[t] ?? t;
}

// ---------------------------------------------------------------------------
// CSV parsing (split-on-comma is safe: no field in these files contains one)
// ---------------------------------------------------------------------------

function rowsOf(text: string): { header: string[]; lines: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return { header: [], lines: [] };
  return { header: lines[0].split(','), lines: lines.slice(1).map((l) => l.split(',')) };
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

export interface ImpliedRow {
  as_of_date: string;
  date_ms: number;
  scope: string;                  // 'global' | 'tier:T1'.. | 'geo:US' | 'geo:EU'
  n_sources: number;
  n_sources_8x: number;
  blocking_any_mean: number | null;
  blocking_any_min: number | null;
  blocking_any_max: number | null;
  blocking_8x_mean: number | null;
  n_cycles_median: number | null;
}

export function parseImpliedCsv(text: string): ImpliedRow[] {
  const { header, lines } = rowsOf(text);
  const i = (c: string) => header.indexOf(c);
  const out: ImpliedRow[] = [];
  for (const c of lines) {
    const d = c[i('as_of_date')];
    if (!d) continue;
    out.push({
      as_of_date: d,
      date_ms: Date.parse(d + 'T00:00:00Z'),
      scope: c[i('scope')],
      n_sources: num(c[i('n_sources')]) ?? 0,
      n_sources_8x: num(c[i('n_sources_8x')]) ?? 0,
      blocking_any_mean: num(c[i('blocking_any_mean')]),
      blocking_any_min: num(c[i('blocking_any_min')]),
      blocking_any_max: num(c[i('blocking_any_max')]),
      blocking_8x_mean: num(c[i('blocking_8x_mean')]),
      n_cycles_median: num(c[i('n_cycles_median')]),
    });
  }
  return out;
}

export interface SourceRow {
  source: string;
  chip_slug: string;
  operator_class: string;
  geo_buckets: string;
  signal_type: string;
  shape_disclosed: boolean;
  series_start: string;
  n_days: number;
  blocking_any: number | null;
  blocking_8x: number | null;
}

export function parseSourcesCsv(text: string): SourceRow[] {
  const { header, lines } = rowsOf(text);
  const i = (c: string) => header.indexOf(c);
  return lines
    .filter((c) => c[i('source')])
    .map((c) => ({
      source: c[i('source')],
      chip_slug: c[i('chip_slug')],
      operator_class: c[i('operator_class')] || '—',
      geo_buckets: c[i('geo_buckets')] || '—',
      signal_type: c[i('signal_type')],
      shape_disclosed: c[i('shape_disclosed')] === 'True',
      series_start: c[i('series_start')],
      n_days: num(c[i('n_days')]) ?? 0,
      blocking_any: num(c[i('blocking_any')]),
      blocking_8x: num(c[i('blocking_8x')]),
    }));
}

export interface MacroRow {
  as_of_date: string;
  chip_slug: string;
  n_providers_tracked: number;
  n_providers_blocked_any: number;
  n_providers_8x_pool: number;
  n_providers_blocked_8x: number;
  idle_gpus_observable: number | null;
  n_inventory_sources: number;
  measured_marketplace_utilization: number | null;
}

export function parseMacroCsv(text: string): MacroRow[] {
  const { header, lines } = rowsOf(text);
  const i = (c: string) => header.indexOf(c);
  return lines
    .filter((c) => c[i('as_of_date')])
    .map((c) => ({
      as_of_date: c[i('as_of_date')],
      chip_slug: c[i('chip_slug')],
      n_providers_tracked: num(c[i('n_providers_tracked')]) ?? 0,
      n_providers_blocked_any: num(c[i('n_providers_blocked_any')]) ?? 0,
      n_providers_8x_pool: num(c[i('n_providers_8x_pool')]) ?? 0,
      n_providers_blocked_8x: num(c[i('n_providers_blocked_8x')]) ?? 0,
      idle_gpus_observable: num(c[i('idle_gpus_observable')]),
      n_inventory_sources: num(c[i('n_inventory_sources')]) ?? 0,
      measured_marketplace_utilization: num(c[i('measured_marketplace_utilization')]),
    }));
}

export interface OccupancyRow {
  as_of_date: string;
  cycle: string;
  cycle_ms: number;
  utilization: number | null;
  total_gpus: number;
  idle_gpus: number;
  n_machines: number;
  n_machines_fully_rented: number;
  n_machines_idle_ge_8: number;
}

function cycleMs(cycle: string): number {
  // "YYYY-MM-DD-HHMM" in CT. Render as a UTC-ish timestamp at the cycle hour;
  // exact zone alignment doesn't matter for a multi-week daily-scale chart.
  const m = /^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})$/.exec(cycle);
  if (!m) return Date.parse(cycle);
  return Date.parse(`${m[1]}T${m[2]}:${m[3]}:00Z`);
}

export function parseOccupancyCsv(text: string): OccupancyRow[] {
  const { header, lines } = rowsOf(text);
  const i = (c: string) => header.indexOf(c);
  return lines
    .filter((c) => c[i('cycle')])
    .map((c) => ({
      as_of_date: c[i('as_of_date')],
      cycle: c[i('cycle')],
      cycle_ms: cycleMs(c[i('cycle')]),
      utilization: num(c[i('utilization')]),
      total_gpus: num(c[i('total_gpus')]) ?? 0,
      idle_gpus: num(c[i('idle_gpus')]) ?? 0,
      n_machines: num(c[i('n_machines')]) ?? 0,
      n_machines_fully_rented: num(c[i('n_machines_fully_rented')]) ?? 0,
      n_machines_idle_ge_8: num(c[i('n_machines_idle_ge_8')]) ?? 0,
    }));
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

function fetchCsv<T>(path: string, parse: (t: string) => T[]): Promise<T[]> {
  return fetch(path)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(parse);
}

export function fetchImplied(chip: UtilChipId): Promise<ImpliedRow[]> {
  return fetchCsv(`/data/utilization_implied_${chip}.csv`, parseImpliedCsv);
}

export function fetchSources(): Promise<SourceRow[]> {
  return fetchCsv('/data/utilization_sources.csv', parseSourcesCsv);
}

export function fetchMacro(): Promise<MacroRow[]> {
  return fetchCsv('/data/utilization_macro.csv', parseMacroCsv);
}

export function fetchOccupancy(chip: OccChipId): Promise<OccupancyRow[]> {
  const name = chip === 'all' ? 'vast_occupancy_all.csv' : `vast_occupancy_${chip}.csv`;
  return fetchCsv(`/data/${name}`, parseOccupancyCsv);
}
