/*
  Serving spread data (preview, 2026-09-24).

  One row per (day, model class, chip, MLPerf scenario) from
  serving_spread_daily.csv, the column contract of the pipeline export
  (ccir-v2-notebooks export/export_serving_spread.py). The preview file is
  computed from the published snapshots by
  scratch/serving_spread/build_preview.py with the same library code.

    spread = MLPerf throughput (Mtok/GPU-hr) x served output price ($/Mtok)
             - T2 guaranteed on-demand rent ($/GPU-hr)

  The page reads the Server scenario as the headline and Offline as the
  ceiling. A row with printed=False carries a gap; the flags say which leg.
*/
import csv from './serving_spread_daily.csv?raw';

export interface ServingRow {
  date: string;
  chip: string;
  accelerator: string;
  modelClass: string;
  scenario: string;
  tokenRoster: string;
  served: number | null;
  nProviders: number | null;
  servedFlag: string;
  servedPrinted: boolean;
  rentSeries: string;
  rent: number | null;
  rentN: number | null;
  rentFlag: string;
  rentPrinted: boolean;
  throughputVersion: string;
  tputPeak: number;
  tputMedian: number | null;
  mlperfResult: string;
  mlperfN: number | null;
  netback: number | null;
  spread: number | null;
  breakevenVolume: number | null;
  breakevenLoad: number | null;
  printed: boolean;
  classMapVersion: string;
  methodVersion: string;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// minimal quoted-field CSV split (a seam label may carry a comma)
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parse(text: string): Record<string, string>[] {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean);
  if (!lines.length) return [];
  const head = splitLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = splitLine(l);
    const row: Record<string, string> = {};
    head.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

export const rows: ServingRow[] = parse(csv).map((r) => ({
  date: r.as_of_date,
  chip: r.chip,
  accelerator: r.accelerator,
  modelClass: r.model_class,
  scenario: r.scenario,
  tokenRoster: r.token_roster,
  served: num(r.served_usd_per_mtok),
  nProviders: num(r.n_providers),
  servedFlag: r.served_flag,
  servedPrinted: r.served_printed === 'True',
  rentSeries: r.rent_series_id,
  rent: num(r.rent_usd_per_gpu_hr),
  rentN: num(r.rent_n_sources),
  rentFlag: r.rent_flag,
  rentPrinted: r.rent_printed === 'True',
  throughputVersion: r.throughput_version,
  tputPeak: Number(r.tput_peak_mtok_per_gpu_hr),
  tputMedian: num(r.tput_median_mtok_per_gpu_hr),
  mlperfResult: r.mlperf_result_id,
  mlperfN: num(r.mlperf_n_results),
  netback: num(r.netback_usd_per_gpu_hr),
  spread: num(r.spread_usd_per_gpu_hr),
  breakevenVolume: num(r.breakeven_volume_mtok_per_gpu_hr),
  breakevenLoad: num(r.breakeven_load_peak),
  printed: r.printed === 'True',
  classMapVersion: r.class_map_version,
  methodVersion: r.method_version,
}));

/** Chip order on the page: by generation, AMD last. */
export const CHIP_ORDER = ['H100', 'H200', 'B200', 'B300', 'MI300X'];
export const HEADLINE = 'Server';
export const CEILING = 'Offline';

export const chips: string[] = CHIP_ORDER.filter((c) => rows.some((r) => r.chip === c));

export function series(chip: string, scenario = HEADLINE): ServingRow[] {
  return rows
    .filter((r) => r.chip === chip && r.scenario === scenario)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function latest(chip: string, scenario = HEADLINE): ServingRow | undefined {
  const s = series(chip, scenario).filter((r) => r.printed);
  return s[s.length - 1];
}

export const allDates: string[] = [...new Set(rows.map((r) => r.date))].sort();
export const firstDate = allDates[0];
export const lastDate = allDates[allDates.length - 1];

/** Days where a ratified record seam touched a rent cell (any chip). */
export const seamDates: string[] = [
  ...new Set(rows.filter((r) => r.rentFlag === 'rent_seam').map((r) => r.date)),
].sort();

export const versions = {
  method: rows[0]?.methodVersion ?? '',
  classMap: rows[0]?.classMapVersion ?? '',
  throughput: rows[0]?.throughputVersion ?? '',
  tokenRoster: rows[0]?.tokenRoster ?? '',
};
