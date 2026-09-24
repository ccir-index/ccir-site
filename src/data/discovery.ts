/*
  /discovery data: daily spot price per GPU-hour, one series per chip, server
  and zone. Loaded from discovery_daily.json (written by
  scripts/build_discovery_data.py from ccir-v2-data aws_spot/az_daily.csv at
  each data sync). Values are derived per-GPU daily values only.

  Display rule (owner, 2026-09-23): price discovery only, so a series whose
  price has not changed for STALE_DAYS or more is not shown. It is applied
  here, at build, so it re-evaluates every day and a series returns as soon
  as its price moves.
*/
import raw from './discovery_daily.json';
import basemap from './discovery_basemap.json';

export const STALE_DAYS = 30;
const DAY = 86400000;

interface RawSeries {
  key: string; chip: string; product: string; place: string; zone: string;
  lat: number; lon: number; start: string; p: [number, number][];
}
interface RawFile { as_of: string; first_day: string | null; close_through: string | null; series: RawSeries[] }
const data = raw as unknown as RawFile;

export interface DiscSeries {
  id: string; chip: string; instance: string; note: string; tip: string;
  place: string; az: string; lat: number; lon: number; x: number; y: number;
  pts: [string, number][];
}

// Natural Earth I, fitted to the 960 x 560 base frame with a 20 px margin.
// Same constants as scripts/build_discovery_basemap.py (the land paths).
function ne1(lon: number, lat: number): [number, number] {
  const lam = (lon * Math.PI) / 180, phi = (lat * Math.PI) / 180;
  const p2 = phi * phi, p4 = p2 * p2;
  return [
    lam * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
    phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
  ];
}
const [W0, H0] = basemap.frame as [number, number];
const PAD = 20;
const XMAX = ne1(180, 0)[0], YMAX = ne1(0, 90)[1];
const K = Math.min((W0 - 2 * PAD) / (2 * XMAX), (H0 - 2 * PAD) / (2 * YMAX));
export function project(lon: number, lat: number): [number, number] {
  const [x, y] = ne1(lon, lat);
  return [W0 / 2 + K * x, H0 / 2 - K * y];
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function unchangedDays(p: [number, number][]): number {
  const last = p[p.length - 1];
  let j = p.length - 1;
  while (j > 0 && Math.abs(p[j - 1][1] - last[1]) < 1e-9) j -= 1;
  return last[0] - p[j][0];
}

const asOfMs = Date.parse(data.as_of + 'T00:00:00Z');
export const asOf = data.as_of;
export const firstDay = data.first_day;
export const closeThrough = data.close_through;

export const series: DiscSeries[] = data.series
  .filter((s) => {
    if (s.p.length === 0) return false;
    const start = Date.parse(s.start + 'T00:00:00Z');
    const lastMs = start + s.p[s.p.length - 1][0] * DAY;
    // No print for STALE_DAYS days counts as no change too.
    if (asOfMs - lastMs >= STALE_DAYS * DAY) return false;
    return unchangedDays(s.p) + (asOfMs - lastMs) / DAY < STALE_DAYS;
  })
  .map((s) => {
    const start = Date.parse(s.start + 'T00:00:00Z');
    const [x, y] = project(s.lon, s.lat);
    return {
      id: s.key, chip: s.chip, instance: s.product,
      note: s.product === 'standard server' || s.product === 'upgraded server' ? s.product : '',
      tip: s.product === 'upgraded server' ? 'Newer host CPUs and faster networking.' : '',
      place: s.place, az: s.zone, lat: s.lat, lon: s.lon,
      x: +x.toFixed(2), y: +y.toFixed(2),
      pts: s.p.map(([d, v]) => [iso(start + d * DAY), v] as [string, number]),
    };
  });

export const hiddenCount = data.series.length - series.length;

// Chip tabs in a fixed order; only chips with a series today appear.
const CHIP_ORDER = ['H100', 'H200', 'B200', 'B300', 'A100'];
export const chips = CHIP_ORDER.filter((c) => series.some((s) => s.chip === c));

// Preset views as lon/lat boxes, fitted to the frame like the world view.
const VIEW_BOXES: Record<string, [[number, number], [number, number]] | null> = {
  'World': null,
  'North America': [[-128, 22], [-60, 52]],
  'US East': [[-90, 35], [-72, 43]],
  'Europe': [[-12, 30], [38, 62]],
  'Asia-Pacific': [[68, -40], [155, 42]],
  'South America': [[-75, -35], [-35, 5]],
};
export interface View { name: string; box: [[number, number], [number, number]] | null; k: number; tx: number; ty: number }
export const views: View[] = Object.entries(VIEW_BOXES).map(([name, box]) => {
  if (!box) return { name, box, k: 1, tx: 0, ty: 0 };
  const pts = [box[0], box[1], [box[0][0], box[1][1]], [box[1][0], box[0][1]]].map(([lo, la]) => project(lo, la));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min((W0 - 2 * PAD) / (x1 - x0), (H0 - 2 * PAD) / (y1 - y0));
  return { name, box, k: +k.toFixed(4), tx: +(W0 / 2 - k * (x0 + x1) / 2).toFixed(2), ty: +(H0 / 2 - k * (y0 + y1) / 2).toFixed(2) };
});

export const map = { frame: [W0, H0] as [number, number], land: basemap.land as string[], usBorders: basemap.usBorders as string };

// Median of the latest daily values for a chip (used by the share card).
export function latestByChip(chip: string): { n: number; lo: number; hi: number; median: number } | null {
  const v = series.filter((s) => s.chip === chip).map((s) => s.pts[s.pts.length - 1][1]).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return { n: v.length, lo: v[0], hi: v[v.length - 1], median: v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2 };
}
