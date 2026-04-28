// Client-side helpers for the /marketplace intraday view.
//
// 6 marketplace_<silicon_id>.csv files live under public/data/; fetched on
// demand when the user picks a chip. Window: 7 days × ~8 cycles/day. One
// row per (collected_at × source_name × commitment_term × interruptibility ×
// region). Sources: vast_ai_verified, runpod_secure, runpod_spot,
// runpod_community, runpod_cluster.

export const PREMIUM_CHIPS = [
  { id: 'h100-sxm-80gb',  label: 'H100 SXM',     short: 'H100' },
  { id: 'h200-sxm-141gb', label: 'H200 SXM',     short: 'H200' },
  { id: 'b200-sxm-180gb', label: 'B200 SXM',     short: 'B200' },
  { id: 'gb200-nvl-nvl',  label: 'GB200 NVL',    short: 'GB200' },
  { id: 'a100-sxm-80gb',  label: 'A100 SXM 80G', short: 'A100-80' },
  { id: 'a100-sxm-40gb',  label: 'A100 SXM 40G', short: 'A100-40' },
] as const;

export type ChipId = typeof PREMIUM_CHIPS[number]['id'];

// Source ordering for the legend (cheapest typically; tightens visual ladder).
export const SOURCE_ORDER: readonly string[] = [
  'vast_ai_verified',
  'runpod_community',
  'runpod_secure',
  'runpod_spot',
  'runpod_cluster',
] as const;

export interface MarketplaceRow {
  as_of_date: string;
  collected_at: string;        // ISO timestamp
  collected_ms: number;        // parsed
  collection_window_id: string;
  source_name: string;
  source_display_name: string;
  silicon_id: string;
  gpu_model: string;
  form_factor: string;
  commitment_term: string;
  interruptibility: string;
  region: string;
  cheapest_usd_hour: number;
  median_usd_hour: number | null;
  n_listings: number | null;
}

function parseMs(iso: string): number {
  // Accept either "2026-04-28 15:15:50.114132" or "2026-04-28T15:15:50.114Z".
  // pandas to_csv emits the space-separated form; Date.parse handles ISO with
  // T but not the space form on all browsers.
  const normalized = iso.replace(' ', 'T');
  // Treat as UTC if no zone marker.
  return Date.parse(normalized.endsWith('Z') ? normalized : normalized + 'Z');
}

export function parseMarketplaceCsv(text: string): MarketplaceRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  const idx = (col: string) => header.indexOf(col);
  const i = {
    date: idx('as_of_date'),
    collected: idx('collected_at'),
    window: idx('collection_window_id'),
    src: idx('source_name'),
    disp: idx('source_display_name'),
    sil: idx('silicon_id'),
    chip: idx('gpu_model'),
    form: idx('form_factor'),
    term: idx('commitment_term'),
    interrupt: idx('interruptibility'),
    region: idx('region'),
    cheap: idx('cheapest_usd_hour'),
    med: idx('median_usd_hour'),
    n: idx('n_listings'),
  };
  const out: MarketplaceRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const c = lines[li].split(',');
    const cheap = parseFloat(c[i.cheap]);
    if (Number.isNaN(cheap)) continue;
    const collected = c[i.collected];
    const med = c[i.med];
    const n = c[i.n];
    out.push({
      as_of_date: c[i.date],
      collected_at: collected,
      collected_ms: parseMs(collected),
      collection_window_id: c[i.window],
      source_name: c[i.src],
      source_display_name: c[i.disp],
      silicon_id: c[i.sil],
      gpu_model: c[i.chip],
      form_factor: c[i.form],
      commitment_term: c[i.term],
      interruptibility: c[i.interrupt],
      region: c[i.region] || '',
      cheapest_usd_hour: cheap,
      median_usd_hour: med && med !== '' ? parseFloat(med) : null,
      n_listings: n && n !== '' ? parseInt(n, 10) : null,
    });
  }
  return out;
}

export interface FilterOpts {
  // Restrict to OnDemand+NonInterruptible by default for cleanliness; future
  // toggles can flip these on.
  include_spot: boolean;        // include rows where interruptibility=Interruptible
  include_runpod_cluster: boolean; // cluster is bare-metal, distinct shape from container marketplaces
}

export function filterRows(rows: MarketplaceRow[], opts: FilterOpts): MarketplaceRow[] {
  return rows.filter((r) => {
    if (!opts.include_spot && r.interruptibility !== 'NonInterruptible') return false;
    if (!opts.include_runpod_cluster && r.source_name === 'runpod_cluster') return false;
    return true;
  });
}

// One line per (source_name); cheapest_usd_hour over time. For vast we also
// emit a parallel median series rendered as a faded backdrop line.
export interface MarketplaceSeries {
  source_name: string;
  source_display_name: string;
  variant: 'cheapest' | 'median';
  // ms-since-epoch on x; numbers on y. Same shape as listings_history series
  // for chart-engine reuse.
  points: { x: number; y: number }[];
  latest_price: number | null;
  latest_n: number | null;       // n_listings on the latest cycle (vast only)
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return s[(n - 1) / 2];
  return (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function buildSeries(rows: MarketplaceRow[]): MarketplaceSeries[] {
  // Group by source_name, then by collected_ms, taking the median across
  // any duplicate-cycle rows (e.g., when silver has the same source × silicon
  // × cycle showing in multiple regions).
  type Bucket = {
    display: string;
    points: Map<number, { cheapest: number[]; medians: number[]; n: number | null }>;
  };
  const bySource = new Map<string, Bucket>();

  for (const r of rows) {
    let b = bySource.get(r.source_name);
    if (!b) {
      b = { display: r.source_display_name, points: new Map() };
      bySource.set(r.source_name, b);
    }
    let p = b.points.get(r.collected_ms);
    if (!p) {
      p = { cheapest: [], medians: [], n: null };
      b.points.set(r.collected_ms, p);
    }
    p.cheapest.push(r.cheapest_usd_hour);
    if (r.median_usd_hour !== null) p.medians.push(r.median_usd_hour);
    if (r.n_listings !== null) p.n = r.n_listings;
  }

  const out: MarketplaceSeries[] = [];
  for (const [src, b] of bySource) {
    const cheapestPoints: { x: number; y: number }[] = [];
    const medianPoints: { x: number; y: number }[] = [];
    let latestN: number | null = null;
    const xs = [...b.points.keys()].sort((a, c) => a - c);
    for (const x of xs) {
      const p = b.points.get(x)!;
      cheapestPoints.push({ x, y: median(p.cheapest) });
      if (p.medians.length > 0) {
        medianPoints.push({ x, y: median(p.medians) });
      }
      if (x === xs[xs.length - 1]) latestN = p.n;
    }
    if (cheapestPoints.length === 0) continue;
    const latest = cheapestPoints[cheapestPoints.length - 1].y;
    out.push({
      source_name: src,
      source_display_name: b.display,
      variant: 'cheapest',
      points: cheapestPoints,
      latest_price: latest,
      latest_n: latestN,
    });
    if (medianPoints.length > 0) {
      const latestMed = medianPoints[medianPoints.length - 1].y;
      out.push({
        source_name: src,
        source_display_name: `${b.display} · median`,
        variant: 'median',
        points: medianPoints,
        latest_price: latestMed,
        latest_n: latestN,
      });
    }
  }

  // Sort by the predefined SOURCE_ORDER then by variant (cheapest before median).
  out.sort((a, b) => {
    const ai = SOURCE_ORDER.indexOf(a.source_name);
    const bi = SOURCE_ORDER.indexOf(b.source_name);
    const av = ai === -1 ? 999 : ai;
    const bv = bi === -1 ? 999 : bi;
    if (av !== bv) return av - bv;
    if (a.variant !== b.variant) return a.variant === 'cheapest' ? -1 : 1;
    return 0;
  });

  return out;
}

// Source colors curated for the marketplace view (distinct from rack /markets
// hash-based palette so the two pages feel visually different).
export function colorForSource(name: string): string {
  switch (name) {
    case 'vast_ai_verified':  return '#d68a2a';   // amber — headline
    case 'runpod_secure':     return '#2c8055';   // green
    case 'runpod_spot':       return '#a84040';   // red
    case 'runpod_community':  return '#2d6a94';   // teal
    case 'runpod_cluster':    return '#6b7176';   // grey
    default:                  return '#5b5852';
  }
}

export function fetchMarketplaceCsv(chipId: ChipId): Promise<MarketplaceRow[]> {
  return fetch(`/data/marketplace_${chipId}.csv`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(parseMarketplaceCsv);
}
