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
import { meta } from './snapshot';

export interface FrontierRow {
  as_of_date: string;
  // widened 2026-08-06: the lane started as openai/anthropic only and has
  // since taken deepseek, moonshot, google and zai. Keep it open — a narrow
  // union here silently mistypes every new first-party source.
  provider: string;
  model_id: string;
  model_display: string;
  input: number | null;
  cached_input: number | null;
  output: number | null;
  /* Position in the vendor's OWN price table (0 = first row they list).
     Null until the 2026-08-07 pipeline change reaches a snapshot, so every
     consumer must tolerate its absence rather than assume rank 0. */
  source_rank: number | null;
  /* The vendor's own lifecycle wording, never our inference. 'legacy' means
     the lab itself marks the model legacy/deprecated/retired. */
  lifecycle: string | null;
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

/* axes is a JSON blob in a CSV cell; a malformed one must not take the page
   down, and an absent lifecycle is never read as evidence either way. */
function readLifecycle(axes: string | undefined): string | null {
  if (!axes) return null;
  try {
    const o = JSON.parse(axes);
    return typeof o?.lifecycle === 'string' ? o.lifecycle : null;
  } catch {
    return null;
  }
}

export const frontier: FrontierRow[] = parse(frontierCsv).map((r) => ({
  as_of_date: r.as_of_date,
  provider: r.provider as FrontierRow['provider'],
  model_id: r.model_id,
  model_display: r.model_display,
  input: num(r.input_usd_per_mtok),
  cached_input: num(r.cached_input_usd_per_mtok),
  output: num(r.output_usd_per_mtok),
  source_rank: num(r.source_rank),
  lifecycle: readLifecycle(r.axes),
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

/*
  Coverage headline — "N models tracked".

  Authoritative value comes from the export (manifest -> meta.json), which
  computes it once through the canonical model id. The local fallback below
  exists only so the figure survives a snapshot published before that field
  shipped; it applies the SAME dedupe rule.

  What neither path may ever do is add the two files' row counts together:
  the panel stores canonical ids (`kimik3`) and the first-party series stores
  the vendor's raw id (`kimi-k3`), so a naive union counts every model in both
  lanes twice — it read 102 against a true 97 on 2026-08-06.
*/
export function canonicalModelId(raw: string): string {
  const tail = (raw ?? '').trim().split('/').pop() ?? '';
  return tail.toLowerCase().replace(/[^a-z0-9.]/g, '');
}

function computeModelsTracked(): number {
  const ids = new Set<string>();
  for (const r of served) {
    const c = canonicalModelId(r.model_id);
    if (c) ids.add(c);
  }
  const latest = frontier.length
    ? frontier.reduce((a, r) => (r.as_of_date > a ? r.as_of_date : a), '')
    : '';
  for (const r of frontier) {
    if (r.as_of_date !== latest) continue;
    const c = canonicalModelId(r.model_id);
    if (c) ids.add(c);
  }
  return ids.size;
}

export const modelsTracked: number =
  meta.tokens?.models_tracked ?? computeModelsTracked();

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
