/*
  CCIR Vercel Volume Token Index (VVTI) — the daily series.

  Pipeline-fed since 2026-08-29: gold_token_vvti computes it, export_tokens
  writes vvti_daily.csv, and sync-from-data carries it here with the other
  token files. It replaced a hand-generated JSON that only moved when
  someone reran a scratch script.

  The CSV carries full precision; rounding happens at the point of display,
  once. The old JSON had been rounded twice (4dp, then 2dp), which left four
  days off by one in the last digit.

  EVERY ROW IS A COMPLETE DAY. Each leaderboard day is pulled on its own and
  priced from that same day's posted record, so the series runs to yesterday
  and a print does not move once made. The page therefore publishes on 30 Aug
  the fixing for 29 Aug, which is how a daily benchmark works.

  Two dates, and they mean different things. `built` is the last fixing, and it
  labels the series range. `updated` is the newest `computed_on` in the file,
  the date the pipeline last built a row. Neither is a build stamp: both come
  out of the data, so if the pipeline stops, both stop, and the page cannot
  claim to be fresher than what it is showing.
*/
import vvtiCsv from './vvti_daily.csv?raw';

export interface VvtiPoint {
  date: string;
  /** headline: volume-weighted posted price of an OUTPUT token, $/1M */
  vvti: number;
  /** same construction over open-weight providers only; the chart's
      reference line. Null on a day when no open-weight model priced. */
  open_avg: number | null;
  /** share of gateway tokens actually priced — disclosed, never imputed */
  coverage: number;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === '' || v === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parse(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map((l) => {
    const cells = l.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

const rows = parse(vvtiCsv)
  .map((r) => ({
    date: r.as_of_date,
    vvti: num(r.vvti_output_usd_per_mtok) ?? NaN,
    open_avg: num(r.open_weight_output_usd_per_mtok),
    coverage: num(r.coverage_pct) ?? NaN,
    // Only an explicit "false" is unsettled. A blank predates the column.
    settled: String(r.settled ?? '').toLowerCase() !== 'false',
    computed_on: r.computed_on ?? '',
  }))
  .filter((p) => p.date && Number.isFinite(p.vvti))
  .sort((a, b) => a.date.localeCompare(b.date));

/** The published series: settled fixings only. */
export const series: VvtiPoint[] = rows
  .filter((p) => p.settled)
  .map(({ date, vvti, open_avg, coverage }) => ({ date, vvti, open_avg, coverage }));

/** Last FIXING. Labels the series range. */
export const built: string = series.length ? series[series.length - 1].date : '';

/** The date the pipeline last built a row. Drives the Dataset dateModified and
    the "updated" label, so both advance when a run lands and freeze when one
    does not. Falls back to the last fixing on a file without the column. */
export const updated: string =
  rows.reduce((a, p) => (p.computed_on > a ? p.computed_on : a), '') || built;
