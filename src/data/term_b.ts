/*
  Construction B for the /term ladder (ruled by John 2026-09-23; ported from
  the term/ladder-preview branch, commits 99099d90 + 1894ad95):

    posted curve(chip, tenor) = chip's GLOBAL neocloud on-demand
                                x (1 + chip's own tenor factor)

  - Neoclouds only (operator_tier != T1), guaranteed rows, every region.
  - On-demand anchor: seller-equal median. Each seller's own median across
    its regions, then the median across sellers.
  - Tenor factor: each seller's term ask over its OWN on-demand ask in the
    SAME region; a seller's ratio is its median across regions; the factor
    is the median across sellers, minus one. Chip-specific, never borrowed
    from another chip. Contango is allowed (no monotone forcing).
  - Depth counts sellers. The 2-vs-3 seller threshold is PARKED: the page
    styles 3+ and 2 differently and leaves 1 empty so both can be read.

  CONTRACTED: signed rate at the tenor, absolute level.
  Subsidized deals out; GPU-only deals signed in the trailing 12 months set
  the median; bundled deals print beside it with what they include; renewal
  options and older vintages are listed, never pooled. Depth counts sellers.

  Reads public/data/listings_history_<silicon>.csv at BUILD time only.
  Filed deals come from src/data/contracted_deals.json
  (node scripts/copy_contracted.mjs refreshes it from the scratch register).
*/
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import contractedJson from './contracted_deals.json';
import { meta } from './snapshot';

export const B_CHIPS = [
  { chip: 'B300', silicon: 'b300-sxm-288gb' },
  { chip: 'B200', silicon: 'b200-sxm-180gb' },
  { chip: 'H200', silicon: 'h200-sxm-141gb' },
  { chip: 'H100', silicon: 'h100-sxm-80gb' },
  { chip: 'GB200', silicon: 'gb200-nvl-nvl' },
] as const;

export const B_TENORS = ['3M', '6M', '1Y', '2Y', '3Y', '5Y'] as const;
export type BTenor = typeof B_TENORS[number];
export const THRESHOLD_FULL = 3;   // parked decision: 3 sellers
export const THRESHOLD_THIN = 2;   // parked decision: 2 sellers, "thin"

// --- CSV -------------------------------------------------------------------
function parseCsv(text: string): Record<string, string>[] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i += 1; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cur); cur = ''; out.push(row); row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); out.push(row); }
  const [head, ...body] = out.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i] ?? ''])));
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

// --- posted curve ------------------------------------------------------------
export interface BCell {
  value: number;
  factor: number;         // signed fraction vs on-demand
  sellers: number;
  depth: 'full' | 'thin';
}
export interface BCurve {
  chip: string;
  asOf: string;
  od: { value: number; sellers: number } | null;
  cells: Partial<Record<BTenor, BCell>>;
  sellerFactors: Partial<Record<BTenor, { seller: string; factor: number }[]>>;
}

function buildCurve(chip: string, silicon: string): BCurve {
  const text = readFileSync(join(process.cwd(), 'public', 'data', `listings_history_${silicon}.csv`), 'utf8');
  const all = parseCsv(text);
  const asOf = all.reduce((m, r) => (r.as_of_date! > m ? r.as_of_date! : m), '');
  const rows = all.filter((r) => r.as_of_date === asOf && r.operator_tier !== 'T1' && r.interruptibility === 'NonInterruptible');

  const px = new Map<string, number[]>();   // seller|region|term -> prices
  for (const r of rows) {
    const k = `${r.source_name}|${r.region}|${r.commitment_term}`;
    (px.get(k) ?? px.set(k, []).get(k)!).push(Number(r.price_usd_per_hour));
  }
  const odBySeller = new Map<string, number[]>();
  for (const [k, v] of px) {
    const [s, , t] = k.split('|');
    if (t === 'OnDemand') (odBySeller.get(s!) ?? odBySeller.set(s!, []).get(s!)!).push(median(v));
  }
  const sellerOd = [...odBySeller.values()].map(median);
  const od = sellerOd.length ? { value: median(sellerOd), sellers: sellerOd.length } : null;

  const cells: BCurve['cells'] = {};
  const sellerFactors: BCurve['sellerFactors'] = {};
  for (const tenor of B_TENORS) {
    const ratios = new Map<string, number[]>();
    for (const [k, v] of px) {
      const [s, g, t] = k.split('|');
      if (t !== tenor) continue;
      const base = px.get(`${s}|${g}|OnDemand`);
      if (!base) continue;
      (ratios.get(s!) ?? ratios.set(s!, []).get(s!)!).push(median(v) / median(base));
    }
    const per = [...ratios.entries()].map(([seller, rs]) => ({ seller, factor: median(rs) - 1 }));
    if (per.length === 0) continue;
    sellerFactors[tenor] = per.sort((a, b) => a.factor - b.factor);
    if (!od || per.length < THRESHOLD_THIN) continue;
    const factor = median(per.map((p) => p.factor));
    cells[tenor] = {
      value: od.value * (1 + factor),
      factor,
      sellers: per.length,
      depth: per.length >= THRESHOLD_FULL ? 'full' : 'thin',
    };
  }
  return { chip, asOf, od, cells, sellerFactors };
}

const _curves = new Map<string, BCurve>();
export function bCurve(chip: string): BCurve {
  const hit = _curves.get(chip);
  if (hit) return hit;
  const c = B_CHIPS.find((x) => x.chip === chip);
  if (!c) throw new Error(`unknown chip ${chip}`);
  const curve = buildCurve(c.chip, c.silicon);
  _curves.set(chip, curve);
  return curve;
}

// --- contracted --------------------------------------------------------------
interface DealRow {
  deal_id: string; chip: string; tenor: string; tenor_raw: string; signed_key: string;
  usd_gpu_hr: number; basis: string; tags: string[]; bundle: string;
  seller: string; bundled: string; subsidized: boolean;
}
const deals: DealRow[] = (contractedJson as { rows: DealRow[] }).rows;

// Depth counts sellers; a parent and its spun-out subsidiary are one seller.
const SELLER_ALIAS: Record<string, string> = { 'Bit Digital': 'WhiteFiber' };
export function sellerKey(raw: string): string {
  const first = raw.split(/[(/,]/)[0]!.trim().replace(/\s+(Inc\.?|Corp\.?|Ltd\.?)$/i, '');
  const hit = Object.keys(SELLER_ALIAS).find((k) => first.startsWith(k));
  return hit ? SELLER_ALIAS[hit]! : first.split(/\s+/).slice(0, 2).join(' ');
}

export const CON_WINDOW_START: string = (() => {
  const [y, m, d] = meta.as_of_date.split('-').map(Number);
  return new Date(Date.UTC(y! - 1, m! - 1, d!)).toISOString().slice(0, 10);
})();

// "includes ..." text for a bundled deal, from the register's own words.
const INCLUDE_WORDS: [RegExp, string][] = [
  [/storage/i, 'storage'], [/cpu/i, 'CPU'], [/network|infiniband|connectivity/i, 'networking'],
  [/colo|data ?cent|\bdc\b/i, 'data center'], [/power/i, 'power'], [/managed|operations|services/i, 'managed services'],
];
export function includesText(d: { bundled: string }): string {
  const hits = INCLUDE_WORDS.filter(([re]) => re.test(d.bundled)).map(([, w]) => w);
  return hits.length ? `includes ${hits.join(', ')}` : 'includes services beyond the GPU, unsplit';
}

const isOption = (d: DealRow) => d.tags.includes('option');
const isBundled = (d: DealRow) => d.bundle === 'all-in';

// GPU-only estimates for bundled deals, matching the published note
// /research/b300-contract-prices (CPU and storage taken out per deal at
// posted prices). A bundled deal prints at its estimate beside the median,
// with the filed value and what it includes on hover. It never enters the
// GPU-only median.
// The includes text follows the note's wording for these three deals.
const GPU_ONLY_EST: Record<string, { value: number; includes: string }> = {
  'axe-2026-2304-b300-3y': { value: 4.13, includes: 'includes storage' },
  'brun-2026-thinkingmachines-5000-b300-3y': { value: 3.40, includes: 'includes storage, CPU' },
  'brun-2026-1536-b300-4y': { value: 3.94, includes: 'includes CPU servers, storage' },
};

export interface BundledDeal { value: number; filed: number; estimated: boolean; includes: string }
function bundledOf(d: DealRow): BundledDeal {
  const est = GPU_ONLY_EST[d.deal_id];
  return est
    ? { value: est.value, filed: d.usd_gpu_hr, estimated: true, includes: est.includes }
    : { value: d.usd_gpu_hr, filed: d.usd_gpu_hr, estimated: false, includes: includesText(d) };
}

export interface ConCell {
  median: number | null;          // GPU-only, in window
  min: number | null;
  max: number | null;
  sellers: number;
  bundled: BundledDeal[];
}
export function conCell(chip: string, tenor: string): ConCell | null {
  const pool = deals.filter((d) => d.chip === chip && d.tenor === tenor && !d.subsidized && !isOption(d)
    && d.signed_key >= CON_WINDOW_START);
  if (pool.length === 0) return null;
  const gpu = pool.filter((d) => !isBundled(d));
  const xs = gpu.map((d) => d.usd_gpu_hr);
  return {
    median: xs.length ? median(xs) : null,
    min: xs.length ? Math.min(...xs) : null,
    max: xs.length ? Math.max(...xs) : null,
    sellers: new Set(gpu.map((d) => sellerKey(d.seller))).size,
    bundled: pool.filter(isBundled).map(bundledOf),
  };
}

export function renewalOptions(chip: string): { tenor: string; value: number; raw: string }[] {
  return deals.filter((d) => d.chip === chip && isOption(d) && !d.subsidized)
    .map((d) => ({ tenor: d.tenor, value: d.usd_gpu_hr, raw: d.tenor_raw }));
}

// Every non-subsidized deal, all vintages, for the vintage chart.
export interface VintagePoint { chip: string; tenor: string; signed: string; value: number; bundled: boolean; option: boolean }
export function vintagePoints(): VintagePoint[] {
  return deals.filter((d) => !d.subsidized).map((d) => ({
    chip: d.chip, tenor: d.tenor, signed: d.signed_key, value: d.usd_gpu_hr, bundled: isBundled(d), option: isOption(d),
  }));
}
