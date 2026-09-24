/**
 * Copies the contracted (filed-deal) rows the /term page
 * needs from the scratch register into src/data/contracted_deals.json.
 *
 * The register lives outside the site repo and may be mid-edit; this script
 * reads it ONCE, keeps only the rows the page may use, and records the
 * copy time so the page can print it.
 *
 * Selection (John, 2026-09-22, second cut):
 *   - grade A or B (grade C excluded)
 *   - a numeric stated_usd_gpu_hr (preferred) or implied_usd_gpu_hr
 *   - EVERY comparability tier (clean, ceiling, descriptive); the tier is
 *     kept on the row so the page can print a clean-only line
 *   - chip normalizes to one of H100 / H200 / B200 / B300 / GB200 / GB300
 *     (mixed / unspecified / blend rows are dropped)
 *   - tenor_bucket normalizes through the canonical map below (raw kept)
 *   - pool tags per row: program (sovereign-program), all-in (bundle
 *     all-in), option (option rows), floor (value_basis states a floor);
 *     the page adds pre-record from signed_key against the list-record start
 *   - signed_key (see signedKey) drives the trailing-12-month vintage window
 *     that the page applies against the snapshot date
 *
 * Run: node scripts/copy_contracted.mjs [path/to/deals.csv]
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] ?? 'C:/Users/19136/CCIR/scratch/term_filings/deals.csv';
const OUT = join(ROOT, 'src', 'data', 'contracted_deals.json');

// RFC-4180 parser: quoted fields may hold commas, quotes and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 1; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cur); cur = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cur); cur = '';
      rows.push(row); row = [];
    } else cur += ch;
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

const CHIPS = new Set(['H100', 'H200', 'B200', 'B300', 'GB200', 'GB300']);
function normChip(raw) {
  // Strip a trailing parenthetical ("GB300 (per press)") and match exactly.
  const t = raw.trim().replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase();
  return CHIPS.has(t) ? t : null;
}

// Canonical tenor map (John, 2026-09-22). Free-text tenors drop.
const TENOR_MAP = {
  '1m reserved': '1M', '1m rolling': '1M',
  '6m': '6M', '6m reserved': '6M',
  '6m-1y': '1Y', '12m reserved': '1Y', '1y': '1Y', '1y (14 mo)': '1Y', '1y (360 days)': '1Y',
  '18m': '2Y', '2y': '2Y', '2y (25 mo)': '2Y',
  '3y': '3Y',
  '4y': '4Y', 'year-4 option': '4Y',
  '5y': '5Y', 'year-5 option': '5Y',
};
function normTenor(raw) {
  return TENOR_MAP[raw.trim().toLowerCase()] ?? null;
}

// Signing key (John, 2026-09-22): every deal keys on its signing date; the
// in-force date stands in when signing is unstated ("in force at ..."); an
// option row carries its base contract's signing date already; a forward-
// start deal keys on signing, never on start. The first dated token in the
// `signed` field wins (YYYY-MM-DD or YYYY-MM with a real month; a bare year
// maps to its 1 January). The vintage window itself is applied on the page
// against the snapshot date, so the JSON carries only the key.
function signedKey(signedRaw, startRaw) {
  const s = (signedRaw ?? '').trim();
  const full = s.match(/\b(\d{4})-(0[1-9]|1[0-2])(?:-(\d{2}))?(?!\d)/);
  if (full) return `${full[1]}-${full[2]}-${full[3] ?? '01'}`;
  const year = s.match(/\b(20\d{2})\b/);
  if (year) return `${year[1]}-01-01`;
  const st = (startRaw ?? '').trim().match(/\b(\d{4})-(0[1-9]|1[0-2])(?:-(\d{2}))?(?!\d)/);
  if (st) return `${st[1]}-${st[2]}-${st[3] ?? '01'}`;
  return null;
}

function tagsFor(r, col) {
  const tags = [];
  if ((r[col('program')] ?? '').trim() === 'sovereign-program') tags.push('program');
  if ((r[col('bundle')] ?? '').trim() === 'all-in') tags.push('all-in');
  if ((r[col('option')] ?? '').trim() !== '') tags.push('option');
  if (/floor/i.test(r[col('value_basis')] ?? '')) tags.push('floor');
  return tags;
}

// Subsidized = a sovereign-program row where a government pays part of the
// price (IndiaAI: MeitY pays up to 40%). A program row with no subsidy
// (Bell AI Fabric) stays in.
function isSubsidized(r, col) {
  if ((r[col('program')] ?? '').trim() !== 'sovereign-program') return false;
  const text = ['notes', 'buyer', 'seller', 'assumptions', 'quote'].map((k) => r[col(k)] ?? '').join(' ').toLowerCase();
  return text.includes('subsid') || text.includes('indiaai');
}

function num(v) {
  const s = (v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const text = readFileSync(SRC, 'utf8');
const mtime = statSync(SRC).mtime.toISOString();
const table = parseCsv(text).filter((r) => r.length > 1);
const headers = table[0];
const col = (name) => headers.indexOf(name);
const iId = col('deal_id');
const iChip = col('chip');
const iTenor = col('tenor_bucket');
const iStated = col('stated_usd_gpu_hr');
const iImplied = col('implied_usd_gpu_hr');
const iGrade = col('grade');
const iComp = col('comparability');
const hasComp = iComp !== -1;
const COMP_OK = new Set(['clean', 'ceiling', 'descriptive']);

const rows = [];
let considered = 0;
for (const r of table.slice(1)) {
  considered += 1;
  const grade = (r[iGrade] ?? '').trim().toUpperCase();
  if (grade !== 'A' && grade !== 'B') continue;
  const comp = hasComp ? (r[iComp] ?? '').trim().toLowerCase() : 'descriptive';
  if (!COMP_OK.has(comp)) continue;
  const chip = normChip(r[iChip] ?? '');
  if (!chip) continue;
  const tenorRaw = (r[iTenor] ?? '').trim();
  const tenor = normTenor(tenorRaw);
  if (!tenor) continue;
  const stated = num(r[iStated]);
  const implied = num(r[iImplied]);
  const price = stated ?? implied;
  if (price == null) continue;
  const key = signedKey(r[col('signed')], r[col('start')]);
  if (!key) continue;   // no dated signing or in-force event: cannot be vintaged
  rows.push({
    deal_id: r[iId],
    chip,
    tenor,
    tenor_raw: tenorRaw,
    signed_key: key,
    usd_gpu_hr: price,
    basis: stated != null ? 'stated' : 'implied',
    grade,
    comparability: comp,
    tags: tagsFor(r, col),
    // Raw fields the /valuation preset filter reads (non-program, GPU-only,
    // take-or-pay); kept verbatim from the register.
    bundle: (r[col('bundle')] ?? '').trim(),
    take_or_pay: (r[col('take_or_pay')] ?? '').trim(),
    // Construction-B fields (John, 2026-09-23): the seller (depth
    // counts sellers, not deals), what a bundled rate includes beyond the
    // GPU (printed as "includes ...", never as a ceiling), and a subsidy flag
    // (only SUBSIDIZED program deals leave the contracted layer).
    seller: (r[col('seller')] ?? '').trim(),
    bundled: (r[col('bundled')] ?? '').trim(),
    subsidized: isSubsidized(r, col),
  });
}

const out = {

  copied_at: new Date().toISOString(),
  source: SRC,
  source_mtime: mtime,
  rows_in_source: considered,
  rows_used: rows.length,
  rule: 'grade A|B; any comparability tier; stated over implied; chip in H100/H200/B200/B300/GB200/GB300; canonical tenor map, free text dropped',
  rows,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`contracted_deals: ${rows.length} of ${considered} rows kept -> ${OUT}`);
for (const r of rows) console.log(`  ${r.chip} ${r.tenor} ${r.usd_gpu_hr} ${r.basis} ${r.comparability} signed ${r.signed_key} [${r.tags.join(',')}] ${r.deal_id} <${r.tenor_raw}>`);
