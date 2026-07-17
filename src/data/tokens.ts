/*
  Fixed-basket token price index (gold.token_index_daily, basket b1 —
  John-approved 2026-07-16) + latest-day per-model cells at the n>=3
  presentation gate (gold.token_cells_daily).

  Two SEPARATE series: input and output $/Mtoken legs of a frozen 5-model
  basket (one model per lab), each model priced as the operator-equal
  median across the providers serving it. The basket does not change under
  you — membership changes are announced events. Everything here is a
  posted LIST price.

  Market intelligence — every surface rendering these values carries the
  "not a citable reference rate" badge.
*/
import indexText from './token_index_daily.csv?raw';
import modelsText from './token_models_latest.csv?raw';

export interface TokenIndexDay {
  as_of_date: string;
  series_id: string;
  basket_version: string;
  input_usd_per_mtok: number;
  output_usd_per_mtok: number;
  n_models: number;
  min_provider_n: number;
  members: Record<string, { in: string; out: string; n: number }> | null;
}

export interface TokenModelRow {
  as_of_date: string;
  model_id: string;
  model_display: string;
  in_basket: boolean;
  n_providers: number;
  input_median: number | null;
  output_median: number | null;
  input_dispersion_pct: number | null;
  output_dispersion_pct: number | null;
}

// Minimal quote-aware CSV line splitter — the members column is JSON with
// embedded commas and doubled quotes (csv.writer conventions). The naive
// split(',') used by simpler loaders would shred it.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parse(text: string): { headers: string[]; rows: string[][] } {
  const t = text.trim();
  if (!t) return { headers: [], rows: [] }; // graceful bootstrap
  const lines = t.split(/\r?\n/);
  return {
    headers: splitCsvLine(lines[0]!),
    rows: lines.slice(1).map(splitCsvLine),
  };
}

const num = (s: string | undefined): number | null => {
  const v = Number(s);
  return s !== undefined && s !== '' && Number.isFinite(v) ? v : null;
};

export const tokenIndex: TokenIndexDay[] = (() => {
  const { headers, rows } = parse(indexText);
  const i = (k: string) => headers.indexOf(k);
  const out: TokenIndexDay[] = [];
  for (const c of rows) {
    const inp = num(c[i('input_usd_per_mtok')]);
    const outp = num(c[i('output_usd_per_mtok')]);
    if (inp === null || outp === null) continue;
    let members: TokenIndexDay['members'] = null;
    try { members = JSON.parse(c[i('members')] ?? ''); } catch { /* audit column only */ }
    out.push({
      as_of_date: c[i('as_of_date')]!,
      series_id: c[i('series_id')]!,
      basket_version: c[i('basket_version')]!,
      input_usd_per_mtok: inp,
      output_usd_per_mtok: outp,
      n_models: num(c[i('n_models')]) ?? 0,
      min_provider_n: num(c[i('min_provider_n')]) ?? 0,
      members,
    });
  }
  out.sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));
  return out;
})();

export const tokenModels: TokenModelRow[] = (() => {
  const { headers, rows } = parse(modelsText);
  const i = (k: string) => headers.indexOf(k);
  const out: TokenModelRow[] = [];
  for (const c of rows) {
    out.push({
      as_of_date: c[i('as_of_date')]!,
      model_id: c[i('model_id')]!,
      model_display: c[i('model_display')] || c[i('model_id')]!,
      in_basket: c[i('in_basket')] === 'True',
      n_providers: num(c[i('n_providers')]) ?? 0,
      input_median: num(c[i('input_median_usd_per_mtok')]),
      output_median: num(c[i('output_median_usd_per_mtok')]),
      input_dispersion_pct: num(c[i('input_dispersion_pct')]),
      output_dispersion_pct: num(c[i('output_dispersion_pct')]),
    });
  }
  // Basket members first, then the widest panels.
  out.sort((a, b) =>
    Number(b.in_basket) - Number(a.in_basket)
    || b.n_providers - a.n_providers
    || a.model_id.localeCompare(b.model_id));
  return out;
})();

export const tokenMeta = (() => {
  if (!tokenIndex.length) return null;
  const first = tokenIndex[0]!;
  const last = tokenIndex[tokenIndex.length - 1]!;
  return {
    seriesStart: first.as_of_date,
    seriesEnd: last.as_of_date,
    nDays: tokenIndex.length,
    basketVersion: last.basket_version,
    latestInput: last.input_usd_per_mtok,
    latestOutput: last.output_usd_per_mtok,
  };
})();
