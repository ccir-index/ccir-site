/*
  Token price data (2026-08-05).

  Two CONSTRUCTIONS, never blended:
    - frontier: first-party POSTED prices from the model owners' own
      pricing docs (OpenAI standard tier, Anthropic model table). A
      reference series — captured daily, archived since 2026-07-03.
    - served: cross-provider medians for OPEN-WEIGHT models priced by
      >=3 independent providers (n disclosed per row). The measured
      "how widely served" surface.
*/
import frontierCsv from './frontier_token_posted.csv?raw';
import servedCsv from './token_models_latest.csv?raw';

export interface FrontierRow {
  as_of_date: string;
  provider: 'openai' | 'anthropic';
  model_id: string;
  model_display: string;
  input: number | null;
  cached_input: number | null;
  output: number | null;
}

export interface ServedRow {
  as_of_date: string;
  model_id: string;
  model_display: string;
  in_basket: boolean;
  n_providers: number;
  input_median: number | null;
  input_min: number | null;
  input_max: number | null;
  output_median: number | null;
  output_min: number | null;
  output_max: number | null;
}

function splitCsvLine(line: string): string[] {
  // minimal quoted-field CSV split (axes column carries quoted JSON)
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

function num(v: string | undefined): number | null {
  if (v === undefined || v === '' || v === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parse(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = splitCsvLine(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

export const frontier: FrontierRow[] = parse(frontierCsv).map((r) => ({
  as_of_date: r.as_of_date,
  provider: r.provider as FrontierRow['provider'],
  model_id: r.model_id,
  model_display: r.model_display,
  input: num(r.input_usd_per_mtok),
  cached_input: num(r.cached_input_usd_per_mtok),
  output: num(r.output_usd_per_mtok),
}));

export const served: ServedRow[] = parse(servedCsv).map((r) => ({
  as_of_date: r.as_of_date,
  model_id: r.model_id,
  model_display: r.model_display,
  in_basket: r.in_basket === 'True',
  n_providers: Number(r.n_providers) || 0,
  input_median: num(r.input_median_usd_per_mtok),
  input_min: num(r.input_min),
  input_max: num(r.input_max),
  output_median: num(r.output_median_usd_per_mtok),
  output_min: num(r.output_min),
  output_max: num(r.output_max),
}));

export const frontierDays: string[] = [...new Set(frontier.map((r) => r.as_of_date))].sort();
export const frontierLatestDay: string = frontierDays[frontierDays.length - 1] ?? '';

/** Latest row per model_id (provider-scoped ids are unique across the file). */
export function frontierLatest(): Map<string, FrontierRow> {
  const m = new Map<string, FrontierRow>();
  for (const r of frontier) {
    if (r.as_of_date === frontierLatestDay) m.set(r.model_id, r);
  }
  return m;
}

/** Full daily series for one model. */
export function frontierSeries(modelId: string): FrontierRow[] {
  return frontier
    .filter((r) => r.model_id === modelId)
    .sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));
}

/** Most recent posted-price change: {date, prevOutput, output} or null. */
export function lastReprice(modelId: string):
  { date: string; prevInput: number | null; prevOutput: number | null } | null {
  const s = frontierSeries(modelId);
  for (let i = s.length - 1; i > 0; i--) {
    if (s[i].output !== s[i - 1].output || s[i].input !== s[i - 1].input) {
      return { date: s[i].as_of_date, prevInput: s[i - 1].input, prevOutput: s[i - 1].output };
    }
  }
  return null;
}
