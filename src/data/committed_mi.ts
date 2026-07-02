/*
  Within-provider committed market intelligence (gold.committed_mi_daily,
  PR #39). Every row differences two marks from ONE operator's book —
  committed ask vs the same operator's own on-demand rate (spread_to_spot),
  or two consecutive tenors on the same operator's ladder (implied_forward)
  — then aggregates operator-equal per band. This is the composition-safe
  series: the band-median-vs-headline % mixes provider sets per leg and
  overstates/understates the true spread (H100 1Y read −18% cross-panel vs
  −21% within-provider on 2026-07-02).

  Market intelligence — every surface rendering these values carries the
  "not a citable reference rate" badge. Rows below the n_pairs>=2 floor are
  never exported upstream, so everything here is publishable at its
  disclosed depth.
*/
import cmiText from './committed_mi.csv?raw';

export interface WpSpread {
  band: string;
  silicon_id: string;
  gpu_model: string;
  tenor: string;
  spread: number;          // signed fraction vs own OD (e.g. -0.2124)
  committed_median: number | null;
  n_pairs: number;
  commitment_kinds: string;
}

export interface WpForward {
  band: string;
  silicon_id: string;
  gpu_model: string;
  tenor_from: string;
  tenor: string;
  value: number;           // USD per GPU-hr break-even renewal rate
  n_pairs: number;
  commitment_kinds: string;
}

const spreads: WpSpread[] = [];
const forwards: WpForward[] = [];

(() => {
  const text = cmiText.trim();
  if (!text) return; // graceful bootstrap: no CSV in this snapshot yet
  const lines = text.split(/\r?\n/);
  const headers = lines[0]!.split(',');
  const idx = (k: string) => headers.indexOf(k);
  const iBand = idx('band');
  const iSil = idx('silicon_id');
  const iChip = idx('gpu_model');
  const iMetric = idx('metric');
  const iFrom = idx('tenor_from');
  const iTenor = idx('tenor');
  const iVal = idx('value');
  const iMed = idx('committed_median');
  const iN = idx('n_pairs');
  const iKinds = idx('commitment_kinds');
  if (iMetric === -1 || iVal === -1) return;
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i]!.split(',');
    const val = Number(c[iVal]);
    const n = Number(c[iN]);
    if (!Number.isFinite(val) || !Number.isFinite(n)) continue;
    const base = {
      band: c[iBand]!,
      silicon_id: c[iSil]!,
      gpu_model: c[iChip]!,
      tenor: c[iTenor]!,
      n_pairs: n,
      commitment_kinds: c[iKinds] ?? '',
    };
    if (c[iMetric] === 'spread_to_spot') {
      const med = Number(c[iMed]);
      spreads.push({ ...base, spread: val, committed_median: Number.isFinite(med) ? med : null });
    } else if (c[iMetric] === 'implied_forward') {
      forwards.push({ ...base, tenor_from: c[iFrom]!, value: val });
    }
  }
})();

// Chart chips → the canonical silicon for that display token. gpu_model
// alone is ambiguous (A100 covers both the 40GB and 80GB silicon_ids —
// two separate within-provider series); the 80GB is the premium-scope
// display chip everywhere else on the site.
const CHART_SILICON: Record<string, string> = {
  H100: 'h100-sxm-80gb',
  H200: 'h200-sxm-141gb',
  B200: 'b200-sxm-180gb',
  B300: 'b300-sxm-288gb',
  A100: 'a100-sxm-80gb',
};

// Within-provider signed spread for (chip, tenor), NEOCLOUD band.
export function wpSpread(chip: string, tenor: string): WpSpread | undefined {
  const sil = CHART_SILICON[chip];
  if (!sil) return undefined;
  return spreads.find(
    (s) => s.band === 'NEOCLOUD' && s.silicon_id === sil && s.tenor === tenor,
  );
}

// All within-provider implied forwards for a chip, NEOCLOUD band.
export function wpForwards(chip: string): WpForward[] {
  const sil = CHART_SILICON[chip];
  if (!sil) return [];
  return forwards.filter((f) => f.band === 'NEOCLOUD' && f.silicon_id === sil);
}
