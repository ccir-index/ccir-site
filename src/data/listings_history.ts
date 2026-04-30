// Client-side helpers for the /markets per-provider time-series view.
//
// The 6 listings_history_<silicon_id>.csv files live under public/data/ and
// are fetched on demand when the user picks a chip. Files are 90-day rolling
// windows of all observations (global panel), one row per (date × provider ×
// commitment_term × interruptibility × region × bundled).
//
// /markets surfaces rack rates only (commitment_term=OnDemand). Reserved
// rows are kept in the source data for a future term-structure view but not
// surfaced here. Interruptibility (GTD vs INT) is the differentiator within
// rack rates — solid lines for guaranteed, dashed for interruptible.

export const PREMIUM_CHIPS = [
  { id: 'h100-sxm-80gb',  label: 'H100 SXM',     short: 'H100' },
  { id: 'h200-sxm-141gb', label: 'H200 SXM',     short: 'H200' },
  { id: 'b200-sxm-180gb', label: 'B200 SXM',     short: 'B200' },
  { id: 'gb200-nvl-nvl',  label: 'GB200 NVL',    short: 'GB200' },
  { id: 'a100-sxm-80gb',  label: 'A100 SXM 80G', short: 'A100-80' },
  { id: 'a100-sxm-40gb',  label: 'A100 SXM 40G', short: 'A100-40' },
] as const;

export type ChipId = typeof PREMIUM_CHIPS[number]['id'];

export type Interruptibility = 'GTD' | 'INT';

export interface ListingRow {
  as_of_date: string;          // YYYY-MM-DD
  source_name: string;
  silicon_id: string;
  gpu_model: string;
  form_factor: string;
  commitment_term: string;     // OnDemand | 1M | 3M | 6M | 1Y | 2Y | 3Y | 5Y
  interruptibility_raw: string; // NonInterruptible | Interruptible | Preemptible
  interruptibility: Interruptibility;
  region: string;
  region_country: string;
  price_usd_per_hour: number;
  bundled: boolean;
  bundled_inclusions: string;  // ";"-delimited from the CSV writer
  availability_state: string;
}

const _INT_VALUES = new Set(['Interruptible', 'Preemptible']);

// Naive CSV parser. The export pipeline doesn't quote fields and our values
// are clean (no commas, no embedded quotes), so a split on commas suffices.
export function parseListingsCsv(text: string): ListingRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  const idx = (col: string) => header.indexOf(col);
  const i = {
    date: idx('as_of_date'),
    src: idx('source_name'),
    sil: idx('silicon_id'),
    chip: idx('gpu_model'),
    form: idx('form_factor'),
    term: idx('commitment_term'),
    interrupt: idx('interruptibility'),
    region: idx('region'),
    country: idx('region_country'),
    price: idx('price_usd_per_hour'),
    bundled: idx('bundled'),
    bundled_items: idx('bundled_inclusions'),
    avail: idx('availability_state'),
  };
  const rows: ListingRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const c = lines[li].split(',');
    const price = parseFloat(c[i.price]);
    if (Number.isNaN(price)) continue;
    // Filter to rack rates only — Reserved rows are excluded from /markets.
    if (c[i.term] !== 'OnDemand') continue;
    const intRaw = c[i.interrupt];
    rows.push({
      as_of_date: c[i.date],
      source_name: c[i.src],
      silicon_id: c[i.sil],
      gpu_model: c[i.chip],
      form_factor: c[i.form],
      commitment_term: c[i.term],
      interruptibility_raw: intRaw,
      interruptibility: _INT_VALUES.has(intRaw) ? 'INT' : 'GTD',
      region: c[i.region] || '',
      region_country: c[i.country] || '',
      price_usd_per_hour: price,
      bundled: c[i.bundled] === 'True' || c[i.bundled] === 'true',
      bundled_inclusions: c[i.bundled_items] || '',
      availability_state: c[i.avail] || '',
    });
  }
  return rows;
}

export interface FilterOpts {
  include_interruptible: boolean;
  include_bundled: boolean;
}

export function filterRows(rows: ListingRow[], opts: FilterOpts): ListingRow[] {
  return rows.filter((r) => {
    if (!opts.include_interruptible && r.interruptibility === 'INT') return false;
    if (!opts.include_bundled && r.bundled) return false;
    return true;
  });
}

// Group rows by (source_name × interruptibility) → date → median price across
// regions on that day. Median (not mean) keeps outliers from dragging the
// line; one provider listing four regions doesn't quadruple its weight.
export interface ProviderSeries {
  source_name: string;
  interruptibility: Interruptibility;
  // Stable identifier "<source>::<int>" used as the chart dataset label and
  // legend row key. Display name strips the "::GTD" suffix for the common
  // case (most providers publish only GTD).
  series_key: string;
  display_name: string;
  // Points use ms-since-epoch on x for Chart.js's time scale.
  points: { x: number; y: number }[];
  bundled_any: boolean;
  latest_price: number;
  prev7_price: number | null;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return s[(n - 1) / 2];
  return (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function buildSeries(rows: ListingRow[]): ProviderSeries[] {
  // key = "<source>::<INT_label>" so a provider that publishes both GTD
  // and INT shows up as two separate lines.
  const byKey = new Map<string, Map<string, number[]>>();
  const bundledAny = new Map<string, boolean>();
  const meta = new Map<string, { source: string; int: Interruptibility }>();

  for (const r of rows) {
    const key = `${r.source_name}::${r.interruptibility}`;
    if (!meta.has(key)) {
      meta.set(key, { source: r.source_name, int: r.interruptibility });
    }
    let dateMap = byKey.get(key);
    if (!dateMap) {
      dateMap = new Map();
      byKey.set(key, dateMap);
    }
    const arr = dateMap.get(r.as_of_date) || [];
    arr.push(r.price_usd_per_hour);
    dateMap.set(r.as_of_date, arr);
    if (r.bundled) bundledAny.set(key, true);
  }

  const out: ProviderSeries[] = [];
  for (const [key, dateMap] of byKey) {
    const m = meta.get(key)!;
    const dates = [...dateMap.keys()].sort();
    const points = dates.map((d) => ({
      x: Date.parse(d + 'T12:00:00Z'),
      y: median(dateMap.get(d)!),
    }));
    if (points.length === 0) continue;
    const latest = points[points.length - 1].y;
    const latestMs = points[points.length - 1].x;
    let prev7: number | null = null;
    for (let i = points.length - 2; i >= 0; i--) {
      const days = (latestMs - points[i].x) / 86400000;
      if (days >= 6) { prev7 = points[i].y; break; }
    }
    out.push({
      source_name: m.source,
      interruptibility: m.int,
      series_key: key,
      // GTD is the implicit common case; suppress the "GTD" suffix to keep
      // the legend tight. INT carries the suffix so the user can tell.
      display_name: m.int === 'GTD' ? m.source : `${m.source} · INT`,
      points,
      bundled_any: bundledAny.get(key) === true,
      latest_price: latest,
      prev7_price: prev7,
    });
  }
  // Sort by latest price ascending (financial convention: low to high).
  out.sort((a, b) => a.latest_price - b.latest_price);
  return out;
}

// Deterministic color per source_name so the same provider keeps its color
// across chip switches and across GTD/INT lines (same color, dashed for INT).
export function colorForSource(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 52%)`;
}

// Deterministic color per chip (matplotlib tab10 palette, colorblind-safe).
// Used in multi-chip mode where line color encodes chip and line style
// encodes the GTD/INT variant. Single-chip mode falls back to colorForSource.
const _CHIP_COLORS: Record<ChipId, string> = {
  'h100-sxm-80gb':  '#1f77b4',
  'h200-sxm-141gb': '#ff7f0e',
  'b200-sxm-180gb': '#2ca02c',
  'gb200-nvl-nvl':  '#d62728',
  'a100-sxm-80gb':  '#9467bd',
  'a100-sxm-40gb':  '#8c564b',
};

export function colorForChip(chipId: ChipId): string {
  return _CHIP_COLORS[chipId] ?? '#5b5852';
}

export function shortLabelForChip(chipId: ChipId): string {
  return PREMIUM_CHIPS.find((c) => c.id === chipId)?.short ?? chipId;
}

export function fetchListingsCsv(chipId: ChipId): Promise<ListingRow[]> {
  return fetch(`/data/listings_history_${chipId}.csv`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(parseListingsCsv);
}
