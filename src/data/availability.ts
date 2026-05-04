// Client-side helpers for the /availability cross-provider observatory.
//
// Data shape (per chip, fetched on demand):
//   - availability_offers_<slug>.csv          - per-(SKU x region) rows for current cycle
//   - shadeform_availability_history_<slug>.csv - 30d time-series of availability + price stats
//   - shadeform_providers_<slug>.csv          - per-provider summary for current cycle
// Plus one cross-chip:
//   - shadeform_summary.csv                   - cross-chip headline
//
// Slug convention matches export_availability.py: AVAILABILITY_ALL_CHIPS in
// shared/config.py. Distinct from /vast slugs and from /marketplace slugs.

export const AVAILABILITY_HEADLINE_CHIPS = [
  { slug: 'h100-sxm',       short: 'H100 SXM',       label: 'H100 SXM' },
  { slug: 'h100-pcie',      short: 'H100 PCIe',      label: 'H100 PCIe' },
  { slug: 'h200-sxm',       short: 'H200',           label: 'H200 SXM' },
  { slug: 'b200-sxm',       short: 'B200',           label: 'B200 SXM' },
  { slug: 'gb200',          short: 'GB200',          label: 'GB200' },
  { slug: 'a100-sxm-80gb',  short: 'A100 SXM',       label: 'A100 SXM 80GB' },
  { slug: 'a100-pcie-80gb', short: 'A100 PCIe',      label: 'A100 PCIe 80GB' },
] as const;

export const AVAILABILITY_LONGTAIL_CHIPS = [
  { slug: 'b300',         short: 'B300',         label: 'B300' },
  { slug: 'gh200',        short: 'GH200',        label: 'GH200' },
  { slug: 'rtx-pro-6000', short: 'RTX Pro 6000', label: 'RTX Pro 6000' },
  { slug: 'l40s',         short: 'L40S',         label: 'L40S' },
] as const;

export const AVAILABILITY_ALL_CHIPS = [
  ...AVAILABILITY_HEADLINE_CHIPS,
  ...AVAILABILITY_LONGTAIL_CHIPS,
] as const;
export type AvailabilityChipSlug = typeof AVAILABILITY_ALL_CHIPS[number]['slug'];

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface AvailabilityOfferRow {
  shade_instance_type: string;
  cloud_instance_type: string | null;
  cloud: string;
  cloud_display: string;
  chip_slug: string;
  gpu_type: string;
  interconnect: string | null;
  nvlink: boolean | null;
  num_gpus: number;
  vram_per_gpu_in_gb: number | null;
  gpu_manufacturer: string | null;
  vcpus: number | null;
  memory_in_gb: number | null;
  storage_in_gb: number | null;
  hourly_price_dollars: number | null;
  per_gpu_dph: number | null;
  deployment_type: string | null;
  boot_min_seconds: number | null;
  boot_max_seconds: number | null;
  region: string;
  region_display: string | null;
  available: boolean;
}

export interface AvailabilityHistoryRow {
  collected_at: string;
  collected_ms: number;
  chip_slug: string;
  n_total_sku_region: number;
  n_available_now: number;
  pct_available: number | null;
  n_providers_carrying: number;
  n_providers_with_any_availability: number | null;
  n_distinct_regions: number | null;
  per_gpu_dph_min: number | null;
  per_gpu_dph_p25: number | null;
  per_gpu_dph_p50: number | null;
  per_gpu_dph_p75: number | null;
  per_gpu_dph_p90: number | null;
  per_gpu_dph_max: number | null;
  cheapest_available_provider: string | null;
  cheapest_available_per_gpu_dph: number | null;
  median_boot_min_seconds: number | null;
  median_boot_max_seconds: number | null;
}

export interface AvailabilityProviderRow {
  cloud: string;
  cloud_display: string;
  n_skus: number;
  n_distinct_skus: number;
  n_available: number;
  median_per_gpu_dph: number | null;
  min_per_gpu_dph: number | null;
  max_per_gpu_dph: number | null;
  median_boot_min_seconds: number | null;
  median_boot_max_seconds: number | null;
}

export interface AvailabilitySummaryRow {
  chip_slug: string;
  n_sku_regions: number;
  n_available_now: number;
  pct_available: number | null;
  n_providers_carrying: number;
  n_providers_with_any_availability: number;
  n_distinct_regions: number;
  per_gpu_dph_min: number | null;
  per_gpu_dph_p25: number | null;
  per_gpu_dph_median: number | null;
  per_gpu_dph_p75: number | null;
  per_gpu_dph_max: number | null;
  cheapest_available_provider: string | null;
  cheapest_available_per_gpu_dph: number | null;
}

// ---------------------------------------------------------------------------
// CSV parsing helpers (copied from vast.ts pattern; same shape, no shared util module)
// ---------------------------------------------------------------------------

function parseFloatOrNull(v: string): number | null {
  if (v === '' || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(v: string): number | null {
  if (v === '' || v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseBoolOrNull(v: string): boolean | null {
  if (v === '' || v === undefined) return null;
  const lo = v.toLowerCase();
  if (lo === 'true' || lo === '1') return true;
  if (lo === 'false' || lo === '0') return false;
  return null;
}

function parseMs(iso: string): number {
  const normalized = iso.replace(' ', 'T');
  return Date.parse(normalized.endsWith('Z') ? normalized : normalized + 'Z');
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = false; }
      } else {
        cur += ch;
      }
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else if (ch === '"') {
      inQ = true;
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function rowsFromCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return { header: [], rows: [] };
  const header = splitCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let li = 1; li < lines.length; li++) {
    rows.push(splitCsvLine(lines[li]));
  }
  return { header, rows };
}

// ---------------------------------------------------------------------------
// Per-CSV parsers
// ---------------------------------------------------------------------------

export function parseAvailabilityOffersCsv(text: string): AvailabilityOfferRow[] {
  const { header, rows } = rowsFromCsv(text);
  if (rows.length === 0) return [];
  const idx = (col: string) => header.indexOf(col);
  const i = {
    sit: idx('shade_instance_type'), cit: idx('cloud_instance_type'),
    cloud: idx('cloud'), cd: idx('cloud_display'),
    cs: idx('chip_slug'), gt: idx('gpu_type'),
    ic: idx('interconnect'), nvl: idx('nvlink'),
    ng: idx('num_gpus'), vram: idx('vram_per_gpu_in_gb'),
    gm: idx('gpu_manufacturer'),
    vc: idx('vcpus'), mem: idx('memory_in_gb'), stor: idx('storage_in_gb'),
    hp: idx('hourly_price_dollars'), pg: idx('per_gpu_dph'),
    dt: idx('deployment_type'),
    bmi: idx('boot_min_seconds'), bma: idx('boot_max_seconds'),
    reg: idx('region'), rd: idx('region_display'),
    av: idx('available'),
  };
  return rows.map((c) => ({
    shade_instance_type: c[i.sit] ?? '',
    cloud_instance_type: c[i.cit] || null,
    cloud: c[i.cloud] ?? '',
    cloud_display: c[i.cd] || c[i.cloud] || '',
    chip_slug: c[i.cs] ?? '',
    gpu_type: c[i.gt] ?? '',
    interconnect: c[i.ic] || null,
    nvlink: parseBoolOrNull(c[i.nvl] ?? ''),
    num_gpus: parseIntOrNull(c[i.ng] ?? '') ?? 0,
    vram_per_gpu_in_gb: parseIntOrNull(c[i.vram] ?? ''),
    gpu_manufacturer: c[i.gm] || null,
    vcpus: parseIntOrNull(c[i.vc] ?? ''),
    memory_in_gb: parseIntOrNull(c[i.mem] ?? ''),
    storage_in_gb: parseIntOrNull(c[i.stor] ?? ''),
    hourly_price_dollars: parseFloatOrNull(c[i.hp] ?? ''),
    per_gpu_dph: parseFloatOrNull(c[i.pg] ?? ''),
    deployment_type: c[i.dt] || null,
    boot_min_seconds: parseIntOrNull(c[i.bmi] ?? ''),
    boot_max_seconds: parseIntOrNull(c[i.bma] ?? ''),
    region: c[i.reg] ?? '',
    region_display: c[i.rd] || null,
    available: parseBoolOrNull(c[i.av] ?? '') === true,
  }));
}

export function parseAvailabilityHistoryCsv(text: string): AvailabilityHistoryRow[] {
  const { header, rows } = rowsFromCsv(text);
  if (rows.length === 0) return [];
  const idx = (col: string) => header.indexOf(col);
  const i = {
    collected: idx('collected_at'), cs: idx('chip_slug'),
    nt: idx('n_total_sku_region'), na: idx('n_available_now'),
    pct: idx('pct_available'),
    np: idx('n_providers_carrying'), npa: idx('n_providers_with_any_availability'),
    nr: idx('n_distinct_regions'),
    min: idx('per_gpu_dph_min'), p25: idx('per_gpu_dph_p25'),
    p50: idx('per_gpu_dph_p50'), p75: idx('per_gpu_dph_p75'),
    p90: idx('per_gpu_dph_p90'), max: idx('per_gpu_dph_max'),
    cap: idx('cheapest_available_provider'), capph: idx('cheapest_available_per_gpu_dph'),
    bmi: idx('median_boot_min_seconds'), bma: idx('median_boot_max_seconds'),
  };
  return rows.map((c) => ({
    collected_at: c[i.collected] ?? '',
    collected_ms: parseMs(c[i.collected] ?? ''),
    chip_slug: c[i.cs] ?? '',
    n_total_sku_region: parseIntOrNull(c[i.nt] ?? '') ?? 0,
    n_available_now: parseIntOrNull(c[i.na] ?? '') ?? 0,
    pct_available: parseFloatOrNull(c[i.pct] ?? ''),
    n_providers_carrying: parseIntOrNull(c[i.np] ?? '') ?? 0,
    n_providers_with_any_availability: parseIntOrNull(c[i.npa] ?? ''),
    n_distinct_regions: parseIntOrNull(c[i.nr] ?? ''),
    per_gpu_dph_min: parseFloatOrNull(c[i.min] ?? ''),
    per_gpu_dph_p25: parseFloatOrNull(c[i.p25] ?? ''),
    per_gpu_dph_p50: parseFloatOrNull(c[i.p50] ?? ''),
    per_gpu_dph_p75: parseFloatOrNull(c[i.p75] ?? ''),
    per_gpu_dph_p90: parseFloatOrNull(c[i.p90] ?? ''),
    per_gpu_dph_max: parseFloatOrNull(c[i.max] ?? ''),
    cheapest_available_provider: c[i.cap] || null,
    cheapest_available_per_gpu_dph: parseFloatOrNull(c[i.capph] ?? ''),
    median_boot_min_seconds: parseFloatOrNull(c[i.bmi] ?? ''),
    median_boot_max_seconds: parseFloatOrNull(c[i.bma] ?? ''),
  })).sort((a, b) => a.collected_ms - b.collected_ms);
}

export function parseAvailabilityProvidersCsv(text: string): AvailabilityProviderRow[] {
  const { header, rows } = rowsFromCsv(text);
  if (rows.length === 0) return [];
  const idx = (col: string) => header.indexOf(col);
  const i = {
    cloud: idx('cloud'), cd: idx('cloud_display'),
    ns: idx('n_skus'), nds: idx('n_distinct_skus'), na: idx('n_available'),
    med: idx('median_per_gpu_dph'),
    min: idx('min_per_gpu_dph'), max: idx('max_per_gpu_dph'),
    bmi: idx('median_boot_min_seconds'), bma: idx('median_boot_max_seconds'),
  };
  return rows
    .map((c) => ({
      cloud: c[i.cloud] ?? '',
      cloud_display: c[i.cd] || c[i.cloud] || '',
      n_skus: parseIntOrNull(c[i.ns] ?? '') ?? 0,
      n_distinct_skus: parseIntOrNull(c[i.nds] ?? '') ?? 0,
      n_available: parseIntOrNull(c[i.na] ?? '') ?? 0,
      median_per_gpu_dph: parseFloatOrNull(c[i.med] ?? ''),
      min_per_gpu_dph: parseFloatOrNull(c[i.min] ?? ''),
      max_per_gpu_dph: parseFloatOrNull(c[i.max] ?? ''),
      median_boot_min_seconds: parseFloatOrNull(c[i.bmi] ?? ''),
      median_boot_max_seconds: parseFloatOrNull(c[i.bma] ?? ''),
    }))
    .sort((a, b) => b.n_skus - a.n_skus);
}

export function parseAvailabilitySummaryCsv(text: string): AvailabilitySummaryRow[] {
  const { header, rows } = rowsFromCsv(text);
  if (rows.length === 0) return [];
  const idx = (col: string) => header.indexOf(col);
  const i = {
    cs: idx('chip_slug'),
    nsr: idx('n_sku_regions'), na: idx('n_available_now'),
    pct: idx('pct_available'),
    npc: idx('n_providers_carrying'),
    npa: idx('n_providers_with_any_availability'),
    ndr: idx('n_distinct_regions'),
    min: idx('per_gpu_dph_min'), p25: idx('per_gpu_dph_p25'),
    med: idx('per_gpu_dph_median'), p75: idx('per_gpu_dph_p75'),
    max: idx('per_gpu_dph_max'),
    cap: idx('cheapest_available_provider'),
    capph: idx('cheapest_available_per_gpu_dph'),
  };
  return rows.map((c) => ({
    chip_slug: c[i.cs] ?? '',
    n_sku_regions: parseIntOrNull(c[i.nsr] ?? '') ?? 0,
    n_available_now: parseIntOrNull(c[i.na] ?? '') ?? 0,
    pct_available: parseFloatOrNull(c[i.pct] ?? ''),
    n_providers_carrying: parseIntOrNull(c[i.npc] ?? '') ?? 0,
    n_providers_with_any_availability: parseIntOrNull(c[i.npa] ?? '') ?? 0,
    n_distinct_regions: parseIntOrNull(c[i.ndr] ?? '') ?? 0,
    per_gpu_dph_min: parseFloatOrNull(c[i.min] ?? ''),
    per_gpu_dph_p25: parseFloatOrNull(c[i.p25] ?? ''),
    per_gpu_dph_median: parseFloatOrNull(c[i.med] ?? ''),
    per_gpu_dph_p75: parseFloatOrNull(c[i.p75] ?? ''),
    per_gpu_dph_max: parseFloatOrNull(c[i.max] ?? ''),
    cheapest_available_provider: c[i.cap] || null,
    cheapest_available_per_gpu_dph: parseFloatOrNull(c[i.capph] ?? ''),
  }));
}

// ---------------------------------------------------------------------------
// Fetch helpers - graceful 404 -> empty
// ---------------------------------------------------------------------------

async function fetchTextOrEmpty(url: string): Promise<string> {
  try {
    const r = await fetch(url);
    if (!r.ok) return '';
    return await r.text();
  } catch {
    return '';
  }
}

export async function fetchAvailabilityOffers(slug: AvailabilityChipSlug): Promise<AvailabilityOfferRow[]> {
  return parseAvailabilityOffersCsv(await fetchTextOrEmpty(`/data/availability_offers_${slug}.csv`));
}

export async function fetchAvailabilityHistory(slug: AvailabilityChipSlug): Promise<AvailabilityHistoryRow[]> {
  return parseAvailabilityHistoryCsv(await fetchTextOrEmpty(`/data/shadeform_availability_history_${slug}.csv`));
}

export async function fetchAvailabilityProviders(slug: AvailabilityChipSlug): Promise<AvailabilityProviderRow[]> {
  return parseAvailabilityProvidersCsv(await fetchTextOrEmpty(`/data/shadeform_providers_${slug}.csv`));
}

export async function fetchAvailabilitySummary(): Promise<AvailabilitySummaryRow[]> {
  return parseAvailabilitySummaryCsv(await fetchTextOrEmpty('/data/shadeform_summary.csv'));
}

// ---------------------------------------------------------------------------
// Color palette per chip
// ---------------------------------------------------------------------------

const _CHIP_COLORS: Record<string, string> = {
  'h100-sxm':       '#1f77b4',
  'h100-pcie':      '#aec7e8',
  'h200-sxm':       '#ff7f0e',
  'b200-sxm':       '#2ca02c',
  'gb200':          '#d62728',
  'a100-sxm-80gb':  '#9467bd',
  'a100-pcie-80gb': '#c5b0d5',
  'b300':           '#8c564b',
  'gh200':          '#e377c2',
  'rtx-pro-6000':   '#7f7f7f',
  'l40s':           '#17becf',
};

export function colorForAvailabilityChip(slug: string): string {
  return _CHIP_COLORS[slug] ?? '#5b5852';
}

export function shortLabelForAvailabilityChip(slug: string): string {
  return AVAILABILITY_ALL_CHIPS.find((c) => c.slug === slug)?.short ?? slug;
}

export function labelForAvailabilityChip(slug: string): string {
  return AVAILABILITY_ALL_CHIPS.find((c) => c.slug === slug)?.label ?? slug;
}

// Availability state colors
export const AVAILABLE_COLOR = '#2c8055';
export const UNAVAILABLE_COLOR = '#a84040';
