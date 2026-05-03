// Client-side helpers for the /vast deep-dive marketplace observatory.
//
// Data shape (per chip, fetched on demand):
//   - vast_offers_<slug>.csv          — current cycle's per-offer rows (~5-300 each)
//   - vast_distribution_history_<slug>.csv — 30d time-series of percentile bands
//   - vast_geographic_<slug>.csv      — country supply + median for current cycle
// Plus one cross-chip:
//   - vast_summary.csv                — cross-chip headline (n, min/median/max, spread)
//
// Slug convention matches export_vast.py: gpu_name lowercased + spaces→hyphens.
// Distinct from PREMIUM_CHIPS slugs (silicon_id format) used by /marketplace.

export const VAST_HEADLINE_CHIPS = [
  { slug: 'h100-sxm',  gpu_name: 'H100 SXM',  short: 'H100 SXM' },
  { slug: 'h200',      gpu_name: 'H200',      short: 'H200' },
  { slug: 'b200',      gpu_name: 'B200',      short: 'B200' },
  { slug: 'gb200',     gpu_name: 'GB200',     short: 'GB200' },
  { slug: 'a100-sxm4', gpu_name: 'A100 SXM4', short: 'A100 SXM' },
  { slug: 'a100-pcie', gpu_name: 'A100 PCIE', short: 'A100 PCIe' },
] as const;

export const VAST_LONGTAIL_CHIPS = [
  { slug: 'rtx-4090',    gpu_name: 'RTX 4090',    short: 'RTX 4090' },
  { slug: 'rtx-5090',    gpu_name: 'RTX 5090',    short: 'RTX 5090' },
  { slug: 'rtx-3090',    gpu_name: 'RTX 3090',    short: 'RTX 3090' },
  { slug: 'l40s',        gpu_name: 'L40S',        short: 'L40S' },
  { slug: 'l40',         gpu_name: 'L40',         short: 'L40' },
  { slug: 'rtx-6000ada', gpu_name: 'RTX 6000Ada', short: 'RTX 6000 Ada' },
  { slug: 'rtx-a6000',   gpu_name: 'RTX A6000',   short: 'RTX A6000' },
] as const;

export const VAST_ALL_CHIPS = [...VAST_HEADLINE_CHIPS, ...VAST_LONGTAIL_CHIPS] as const;
export type VastChipSlug = typeof VAST_ALL_CHIPS[number]['slug'];

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface VastOfferRow {
  offer_id: number | null;
  machine_id: number | null;
  host_id: number | null;
  gpu_name: string;
  gpu_model: string | null;
  num_gpus: number;
  gpu_frac: number | null;
  dph_total: number | null;
  min_bid: number | null;
  per_gpu_dph: number | null;
  is_bid: boolean | null;
  storage_cost_per_gb_mo: number | null;
  internet_down_cost_per_tb: number | null;
  vram_cost_per_hour: number | null;
  dlperf: number | null;
  dlperf_per_dphtotal: number | null;
  total_flops: number | null;
  verification: string | null;
  reliability: number | null;
  rentable: boolean | null;
  rented: boolean | null;
  hosting_type: number | null;
  inet_down_mbps: number | null;
  inet_up_mbps: number | null;
  bw_nvlink_gbps: number | null;
  pci_gen: number | null;
  geolocation: string | null;
}

export interface VastDistributionRow {
  collected_at: string;
  collected_ms: number;
  gpu_name: string;
  silicon_id: string | null;
  n_offers: number;
  per_gpu_dph_min: number | null;
  per_gpu_dph_p10: number | null;
  per_gpu_dph_p25: number | null;
  per_gpu_dph_p50: number | null;
  per_gpu_dph_p75: number | null;
  per_gpu_dph_p90: number | null;
  per_gpu_dph_max: number | null;
  min_bid_p50: number | null;
  n_verified: number | null;
  n_deverified: number | null;
  median_verified: number | null;
  median_deverified: number | null;
  n_1x: number | null;
  n_2x: number | null;
  n_4x: number | null;
  n_8x: number | null;
  reliability_p50: number | null;
  inet_down_p50_mbps: number | null;
  inet_down_p75_mbps: number | null;
  egress_cost_per_tb_p50: number | null;
}

export interface VastGeoRow {
  geolocation: string;
  n_offers: number;
  median_per_gpu_dph: number | null;
}

export interface VastSummaryRow {
  gpu_name: string;
  chip_slug: string;
  n_offers: number;
  n_rentable: number;
  n_verified: number;
  per_gpu_dph_min: number | null;
  per_gpu_dph_p25: number | null;
  per_gpu_dph_median: number | null;
  per_gpu_dph_p75: number | null;
  per_gpu_dph_max: number | null;
  spread_ratio: number | null;
}

// ---------------------------------------------------------------------------
// CSV parsing helpers
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

// pandas to_csv emits "2026-05-03 14:30:00.123456"; treat as UTC if no zone.
function parseMs(iso: string): number {
  const normalized = iso.replace(' ', 'T');
  return Date.parse(normalized.endsWith('Z') ? normalized : normalized + 'Z');
}

function splitCsvLine(line: string): string[] {
  // CSV without quoting (pandas default) — fine for our numeric/identifier
  // payloads. geolocation can contain commas like "Washington, US" — pandas
  // quotes those. Handle minimal quoted-field case.
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

export function parseVastOffersCsv(text: string): VastOfferRow[] {
  const { header, rows } = rowsFromCsv(text);
  if (rows.length === 0) return [];
  const idx = (col: string) => header.indexOf(col);
  const i = {
    offer: idx('offer_id'), machine: idx('machine_id'), host: idx('host_id'),
    gpu_name: idx('gpu_name'), gpu_model: idx('gpu_model'),
    num_gpus: idx('num_gpus'), gpu_frac: idx('gpu_frac'),
    dph: idx('dph_total'), bid: idx('min_bid'),
    per_gpu: idx('per_gpu_dph'), is_bid: idx('is_bid'),
    storage: idx('storage_cost_per_gb_mo'),
    egress: idx('internet_down_cost_per_tb'),
    vram: idx('vram_cost_per_hour'),
    dlperf: idx('dlperf'), dlperf_per: idx('dlperf_per_dphtotal'),
    flops: idx('total_flops'),
    verification: idx('verification'), reliability: idx('reliability'),
    rentable: idx('rentable'), rented: idx('rented'),
    hosting_type: idx('hosting_type'),
    inet_down: idx('inet_down_mbps'), inet_up: idx('inet_up_mbps'),
    nvlink: idx('bw_nvlink_gbps'), pci: idx('pci_gen'),
    geo: idx('geolocation'),
  };
  return rows.map((c) => ({
    offer_id: parseIntOrNull(c[i.offer] ?? ''),
    machine_id: parseIntOrNull(c[i.machine] ?? ''),
    host_id: parseIntOrNull(c[i.host] ?? ''),
    gpu_name: c[i.gpu_name] ?? '',
    gpu_model: c[i.gpu_model] || null,
    num_gpus: parseIntOrNull(c[i.num_gpus] ?? '') ?? 0,
    gpu_frac: parseFloatOrNull(c[i.gpu_frac] ?? ''),
    dph_total: parseFloatOrNull(c[i.dph] ?? ''),
    min_bid: parseFloatOrNull(c[i.bid] ?? ''),
    per_gpu_dph: parseFloatOrNull(c[i.per_gpu] ?? ''),
    is_bid: parseBoolOrNull(c[i.is_bid] ?? ''),
    storage_cost_per_gb_mo: parseFloatOrNull(c[i.storage] ?? ''),
    internet_down_cost_per_tb: parseFloatOrNull(c[i.egress] ?? ''),
    vram_cost_per_hour: parseFloatOrNull(c[i.vram] ?? ''),
    dlperf: parseFloatOrNull(c[i.dlperf] ?? ''),
    dlperf_per_dphtotal: parseFloatOrNull(c[i.dlperf_per] ?? ''),
    total_flops: parseFloatOrNull(c[i.flops] ?? ''),
    verification: c[i.verification] || null,
    reliability: parseFloatOrNull(c[i.reliability] ?? ''),
    rentable: parseBoolOrNull(c[i.rentable] ?? ''),
    rented: parseBoolOrNull(c[i.rented] ?? ''),
    hosting_type: parseIntOrNull(c[i.hosting_type] ?? ''),
    inet_down_mbps: parseFloatOrNull(c[i.inet_down] ?? ''),
    inet_up_mbps: parseFloatOrNull(c[i.inet_up] ?? ''),
    bw_nvlink_gbps: parseFloatOrNull(c[i.nvlink] ?? ''),
    pci_gen: parseFloatOrNull(c[i.pci] ?? ''),
    geolocation: c[i.geo] || null,
  }));
}

export function parseVastDistributionCsv(text: string): VastDistributionRow[] {
  const { header, rows } = rowsFromCsv(text);
  if (rows.length === 0) return [];
  const idx = (col: string) => header.indexOf(col);
  const i = {
    collected: idx('collected_at'),
    gpu_name: idx('gpu_name'), silicon: idx('silicon_id'),
    n: idx('n_offers'),
    min: idx('per_gpu_dph_min'), p10: idx('per_gpu_dph_p10'),
    p25: idx('per_gpu_dph_p25'), p50: idx('per_gpu_dph_p50'),
    p75: idx('per_gpu_dph_p75'), p90: idx('per_gpu_dph_p90'),
    max: idx('per_gpu_dph_max'),
    bid: idx('min_bid_p50'),
    nv: idx('n_verified'), nd: idx('n_deverified'),
    mv: idx('median_verified'), md: idx('median_deverified'),
    n1: idx('n_1x'), n2: idx('n_2x'), n4: idx('n_4x'), n8: idx('n_8x'),
    rel: idx('reliability_p50'),
    idown: idx('inet_down_p50_mbps'),
    idown75: idx('inet_down_p75_mbps'),
    egress: idx('egress_cost_per_tb_p50'),
  };
  return rows.map((c) => ({
    collected_at: c[i.collected] ?? '',
    collected_ms: parseMs(c[i.collected] ?? ''),
    gpu_name: c[i.gpu_name] ?? '',
    silicon_id: c[i.silicon] || null,
    n_offers: parseIntOrNull(c[i.n] ?? '') ?? 0,
    per_gpu_dph_min: parseFloatOrNull(c[i.min] ?? ''),
    per_gpu_dph_p10: parseFloatOrNull(c[i.p10] ?? ''),
    per_gpu_dph_p25: parseFloatOrNull(c[i.p25] ?? ''),
    per_gpu_dph_p50: parseFloatOrNull(c[i.p50] ?? ''),
    per_gpu_dph_p75: parseFloatOrNull(c[i.p75] ?? ''),
    per_gpu_dph_p90: parseFloatOrNull(c[i.p90] ?? ''),
    per_gpu_dph_max: parseFloatOrNull(c[i.max] ?? ''),
    min_bid_p50: parseFloatOrNull(c[i.bid] ?? ''),
    n_verified: parseIntOrNull(c[i.nv] ?? ''),
    n_deverified: parseIntOrNull(c[i.nd] ?? ''),
    median_verified: parseFloatOrNull(c[i.mv] ?? ''),
    median_deverified: parseFloatOrNull(c[i.md] ?? ''),
    n_1x: parseIntOrNull(c[i.n1] ?? ''),
    n_2x: parseIntOrNull(c[i.n2] ?? ''),
    n_4x: parseIntOrNull(c[i.n4] ?? ''),
    n_8x: parseIntOrNull(c[i.n8] ?? ''),
    reliability_p50: parseFloatOrNull(c[i.rel] ?? ''),
    inet_down_p50_mbps: parseFloatOrNull(c[i.idown] ?? ''),
    inet_down_p75_mbps: parseFloatOrNull(c[i.idown75] ?? ''),
    egress_cost_per_tb_p50: parseFloatOrNull(c[i.egress] ?? ''),
  })).sort((a, b) => a.collected_ms - b.collected_ms);
}

export function parseVastGeoCsv(text: string): VastGeoRow[] {
  const { header, rows } = rowsFromCsv(text);
  if (rows.length === 0) return [];
  const idx = (col: string) => header.indexOf(col);
  const i = { geo: idx('geolocation'), n: idx('n_offers'), med: idx('median_per_gpu_dph') };
  return rows
    .map((c) => ({
      geolocation: c[i.geo] || '(unknown)',
      n_offers: parseIntOrNull(c[i.n] ?? '') ?? 0,
      median_per_gpu_dph: parseFloatOrNull(c[i.med] ?? ''),
    }))
    .sort((a, b) => b.n_offers - a.n_offers);
}

export function parseVastSummaryCsv(text: string): VastSummaryRow[] {
  const { header, rows } = rowsFromCsv(text);
  if (rows.length === 0) return [];
  const idx = (col: string) => header.indexOf(col);
  const i = {
    gpu: idx('gpu_name'), slug: idx('chip_slug'),
    n: idx('n_offers'), nr: idx('n_rentable'), nv: idx('n_verified'),
    min: idx('per_gpu_dph_min'), p25: idx('per_gpu_dph_p25'),
    med: idx('per_gpu_dph_median'), p75: idx('per_gpu_dph_p75'),
    max: idx('per_gpu_dph_max'), sr: idx('spread_ratio'),
  };
  return rows.map((c) => ({
    gpu_name: c[i.gpu] ?? '',
    chip_slug: c[i.slug] ?? '',
    n_offers: parseIntOrNull(c[i.n] ?? '') ?? 0,
    n_rentable: parseIntOrNull(c[i.nr] ?? '') ?? 0,
    n_verified: parseIntOrNull(c[i.nv] ?? '') ?? 0,
    per_gpu_dph_min: parseFloatOrNull(c[i.min] ?? ''),
    per_gpu_dph_p25: parseFloatOrNull(c[i.p25] ?? ''),
    per_gpu_dph_median: parseFloatOrNull(c[i.med] ?? ''),
    per_gpu_dph_p75: parseFloatOrNull(c[i.p75] ?? ''),
    per_gpu_dph_max: parseFloatOrNull(c[i.max] ?? ''),
    spread_ratio: parseFloatOrNull(c[i.sr] ?? ''),
  }));
}

// ---------------------------------------------------------------------------
// Fetch helpers — graceful 404 → empty
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

export async function fetchVastOffers(slug: VastChipSlug): Promise<VastOfferRow[]> {
  return parseVastOffersCsv(await fetchTextOrEmpty(`/data/vast_offers_${slug}.csv`));
}

export async function fetchVastDistribution(slug: VastChipSlug): Promise<VastDistributionRow[]> {
  return parseVastDistributionCsv(await fetchTextOrEmpty(`/data/vast_distribution_history_${slug}.csv`));
}

export async function fetchVastGeo(slug: VastChipSlug): Promise<VastGeoRow[]> {
  return parseVastGeoCsv(await fetchTextOrEmpty(`/data/vast_geographic_${slug}.csv`));
}

export async function fetchVastSummary(): Promise<VastSummaryRow[]> {
  return parseVastSummaryCsv(await fetchTextOrEmpty('/data/vast_summary.csv'));
}

// ---------------------------------------------------------------------------
// Histogram helper — log-scale binning so the long upper tail doesn't crush
// the visible range. Returns evenly-spaced bins in log-$ space.
// ---------------------------------------------------------------------------

export interface HistogramBin {
  lo: number;
  hi: number;
  mid: number;
  count: number;
}

export function logBins(values: number[], nBins = 25): HistogramBin[] {
  const positives = values.filter((v) => Number.isFinite(v) && v > 0);
  if (positives.length === 0) return [];
  const lo = Math.min(...positives);
  const hi = Math.max(...positives);
  if (lo === hi) {
    return [{ lo, hi, mid: lo, count: positives.length }];
  }
  const logLo = Math.log10(lo);
  const logHi = Math.log10(hi);
  const step = (logHi - logLo) / nBins;
  const bins: HistogramBin[] = [];
  for (let i = 0; i < nBins; i++) {
    const a = Math.pow(10, logLo + i * step);
    const b = Math.pow(10, logLo + (i + 1) * step);
    bins.push({ lo: a, hi: b, mid: Math.sqrt(a * b), count: 0 });
  }
  for (const v of positives) {
    let idx = Math.floor((Math.log10(v) - logLo) / step);
    if (idx < 0) idx = 0;
    if (idx >= nBins) idx = nBins - 1;
    bins[idx].count++;
  }
  return bins;
}

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

// Headline chips share their /marketplace tab10 colors for cross-page
// recognition. Long-tail chips get a distinct cooler palette.
const _CHIP_COLORS: Record<string, string> = {
  'h100-sxm':    '#1f77b4',
  'h200':        '#ff7f0e',
  'b200':        '#2ca02c',
  'gb200':       '#d62728',
  'a100-sxm4':   '#9467bd',
  'a100-pcie':   '#8c564b',
  'rtx-4090':    '#e377c2',
  'rtx-5090':    '#7f7f7f',
  'rtx-3090':    '#bcbd22',
  'l40s':        '#17becf',
  'l40':         '#3a8a8a',
  'rtx-6000ada': '#aa6e3f',
  'rtx-a6000':   '#5a4b8a',
};

export function colorForVastChip(slug: string): string {
  return _CHIP_COLORS[slug] ?? '#5b5852';
}

export function shortLabelForVastChip(slug: string): string {
  return VAST_ALL_CHIPS.find((c) => c.slug === slug)?.short ?? slug;
}

export function chipBySlug(slug: string) {
  return VAST_ALL_CHIPS.find((c) => c.slug === slug);
}

// Verified-band color ramp.
export const VERIFIED_COLOR = '#2c8055';
export const DEVERIFIED_COLOR = '#a84040';
export const OTHER_VERIFICATION_COLOR = '#6b7176';
