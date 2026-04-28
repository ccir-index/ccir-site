// Client-side helpers for the /markets per-provider time-series view.
//
// The 6 listings_history_<silicon_id>.csv files live under public/data/ and
// are fetched on demand when the user picks a chip. Files are 90-day windows
// of US-only list-asks, one row per (date × provider × deployment_class ×
// commitment_term × region × bundled).

export const PREMIUM_CHIPS = [
  { id: 'h100-sxm-80gb',  label: 'H100 SXM',     short: 'H100' },
  { id: 'h200-sxm-141gb', label: 'H200 SXM',     short: 'H200' },
  { id: 'b200-sxm-180gb', label: 'B200 SXM',     short: 'B200' },
  { id: 'gb200-nvl-nvl',  label: 'GB200 NVL',    short: 'GB200' },
  { id: 'a100-sxm-80gb',  label: 'A100 SXM 80G', short: 'A100-80' },
  { id: 'a100-sxm-40gb',  label: 'A100 SXM 40G', short: 'A100-40' },
] as const;

export type ChipId = typeof PREMIUM_CHIPS[number]['id'];

export const DEPLOYMENT_CLASSES = ['OnDemand', 'Spot', 'Reserved'] as const;
export type DeploymentClass = typeof DEPLOYMENT_CLASSES[number];

export const RESERVED_TENORS = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y'] as const;
export type ReservedTenor = typeof RESERVED_TENORS[number];

export interface ListingRow {
  as_of_date: string;          // YYYY-MM-DD
  source_name: string;
  silicon_id: string;
  gpu_model: string;
  form_factor: string;
  commitment_term: string;     // OnDemand | 1M | 3M | 6M | 1Y | 2Y | 3Y | 5Y
  interruptibility: string;
  deployment_class: DeploymentClass;
  region: string;              // US-East / US-West / US-Central / US-South
  region_country: string;      // always "US" in the published feed
  factory_type: string;
  tier_v3: string | null;
  price_usd_per_hour: number;
  bundled: boolean;
  bundled_inclusions: string;  // ";"-delimited from the CSV writer
  availability_state: string;
}

// Naive RFC-4180 CSV parser. The export pipeline doesn't quote fields by
// default and our values are clean (no commas, no embedded quotes), so a
// split on commas suffices. If a future column needs quoting we'll upgrade.
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
    dclass: idx('deployment_class'),
    region: idx('region'),
    country: idx('region_country'),
    factory: idx('factory_type'),
    tier: idx('tier_v3'),
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
    rows.push({
      as_of_date: c[i.date],
      source_name: c[i.src],
      silicon_id: c[i.sil],
      gpu_model: c[i.chip],
      form_factor: c[i.form],
      commitment_term: c[i.term],
      interruptibility: c[i.interrupt],
      deployment_class: c[i.dclass] as DeploymentClass,
      region: c[i.region] || '',
      region_country: c[i.country] || '',
      factory_type: c[i.factory],
      tier_v3: c[i.tier] || null,
      price_usd_per_hour: price,
      bundled: c[i.bundled] === 'True' || c[i.bundled] === 'true',
      bundled_inclusions: c[i.bundled_items] || '',
      availability_state: c[i.avail] || '',
    });
  }
  return rows;
}

export interface FilterOpts {
  deployment_class: DeploymentClass;
  reserved_tenor?: ReservedTenor;
  include_bundled: boolean;
}

export function filterRows(rows: ListingRow[], opts: FilterOpts): ListingRow[] {
  return rows.filter((r) => {
    if (r.deployment_class !== opts.deployment_class) return false;
    if (opts.deployment_class === 'Reserved' && opts.reserved_tenor) {
      if (r.commitment_term !== opts.reserved_tenor) return false;
    }
    if (!opts.include_bundled && r.bundled) return false;
    return true;
  });
}

// Group rows by source_name → date → median price (collapse same-source-day
// duplicates, e.g. multiple regions). Median rather than mean keeps outliers
// from dragging the line; one provider showing 4 regions doesn't quadruple
// its weight in the chart.
export interface ProviderSeries {
  source_name: string;
  // Points use ms-since-epoch on x for Chart.js's time scale; the original
  // YYYY-MM-DD string lives in `latest_date_iso` for display callbacks.
  points: { x: number; y: number }[];
  bundled_any: boolean;                // true if any point in the series is bundled
  latest_price: number;
  prev7_price: number | null;          // price ~7 days ago, for trend display
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return s[(n - 1) / 2];
  return (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function buildSeries(rows: ListingRow[]): ProviderSeries[] {
  const bySrc = new Map<string, Map<string, number[]>>();
  const bundledAny = new Map<string, boolean>();
  for (const r of rows) {
    let dateMap = bySrc.get(r.source_name);
    if (!dateMap) {
      dateMap = new Map();
      bySrc.set(r.source_name, dateMap);
    }
    const arr = dateMap.get(r.as_of_date) || [];
    arr.push(r.price_usd_per_hour);
    dateMap.set(r.as_of_date, arr);
    if (r.bundled) bundledAny.set(r.source_name, true);
  }

  const out: ProviderSeries[] = [];
  for (const [src, dateMap] of bySrc) {
    const dates = [...dateMap.keys()].sort();
    const points = dates.map((d) => ({
      x: Date.parse(d + 'T00:00:00Z'),
      y: median(dateMap.get(d)!),
    }));
    if (points.length === 0) continue;
    const latest = points[points.length - 1].y;
    // Find the point closest to 7 days before the latest, but at least one
    // earlier point. Used for the "7d change" column in the legend.
    const latestMs = points[points.length - 1].x;
    let prev7: number | null = null;
    for (let i = points.length - 2; i >= 0; i--) {
      const days = (latestMs - points[i].x) / 86400000;
      if (days >= 6) { prev7 = points[i].y; break; }
    }
    out.push({
      source_name: src,
      points,
      bundled_any: bundledAny.get(src) === true,
      latest_price: latest,
      prev7_price: prev7,
    });
  }
  // Sort by latest price ascending so cheaper providers render on top of
  // the legend (financial convention: low to high).
  out.sort((a, b) => a.latest_price - b.latest_price);
  return out;
}

// Deterministic color per source_name so the same provider keeps its color
// when the user switches chips or tabs. Hash → HSL with fixed saturation/
// luminance so colors stay legible on both editorial (light) and terminal
// (dark) themes.
export function colorForSource(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 52%)`;
}

export function fetchListingsCsv(chipId: ChipId): Promise<ListingRow[]> {
  return fetch(`/data/listings_history_${chipId}.csv`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(parseListingsCsv);
}
