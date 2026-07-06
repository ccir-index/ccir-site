/*
  Loads the Vast clearing-vs-list basis overlay (vast_basis.csv).

  The CCIR rate index is a list-ask benchmark; Vast is the one live/executable
  venue and is pulled from the rate panel. This overlay re-surfaces Vast as a
  separate signal: how the live marketplace price sits vs the ex-Vast T3
  (Marketplace) list-ask floor at matched segment. NOT part of the benchmark.
  Single-venue.
*/
import csvText from './vast_basis.csv?raw';

export interface VastBasis {
  as_of_date: string;
  silicon_id: string;
  gpu_model: string;
  window_days: number;
  vast_input: string; // 'min_bid' (clearing floor) | 'dph_base' (live ask)
  listask_floor_7d: number | null;
  vast_price_7d: number | null;
  basis_pct_7d: number | null;
  listask_floor_1d: number | null;
  vast_price_1d: number | null;
  basis_pct_1d: number | null;
  n_listask_src: number;
  n_vast_src: number;
  methodology_version: string;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === '' || v === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parse(text: string): VastBasis[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(',');
  const idx = (k: string) => headers.indexOf(k);
  return lines
    .slice(1)
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const c = line.split(',');
      const g = (k: string) => c[idx(k)];
      return {
        as_of_date: g('as_of_date') ?? '',
        silicon_id: g('silicon_id') ?? '',
        gpu_model: g('gpu_model') ?? '',
        window_days: num(g('window_days')) ?? 7,
        vast_input: g('vast_input') ?? '',
        listask_floor_7d: num(g('listask_floor_7d')),
        vast_price_7d: num(g('vast_price_7d')),
        basis_pct_7d: num(g('basis_pct_7d')),
        listask_floor_1d: num(g('listask_floor_1d')),
        vast_price_1d: num(g('vast_price_1d')),
        basis_pct_1d: num(g('basis_pct_1d')),
        n_listask_src: num(g('n_listask_src')) ?? 0,
        n_vast_src: num(g('n_vast_src')) ?? 0,
        methodology_version: g('methodology_version') ?? '',
      } satisfies VastBasis;
    })
    .filter((r) => r.silicon_id.length > 0);
}

export const vastBasis: VastBasis[] = parse(csvText);
