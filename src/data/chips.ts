/*
  Chip instrument registry (redesign/v1, 2026-08-13).

  One entry per chip that carries an instrument page at /chip/<slug>. The
  admission rule (owner): a chip ships a page only when it has BOTH a
  hardware ask in hardware_panels.json AND at least one T2 rates cell —
  and would render at least two of the four stat tiles.

  Identity facts are sourced from the site's own published content, never
  asserted from general knowledge:
    - generation names: /research/compute-glossary ("Volta (V100, 2017),
      Ampere (A100, 2020), Hopper (H100/H200, 2022-24), Blackwell (...)").
    - introduction dates: the GA map published on /hardware (age axis).

  IDENTITY LOCKS. `hwKey` pins the hardware lane to ONE variant per chip
  (A100 = SXM4 80GB only — 40GB and PCIe variants are separate hardware
  models and are never mixed into any cell here). The rates cells are the
  pooled per-chip series the /rates ladder itself prints (same selector,
  same cell); the committed lane maps through committed_mi's own
  chip -> silicon_id lock.

  HARDWARE LANE (owner, 2026-08-13). The stat-band hardware tile is
  UNIFORM across chips: /hardware's income-derived model-implied unit
  value (src/lib/ivmodel's ivCards — the single source of truth /hardware
  and its share card already read), carrying the model-output mark. One
  comparable basis, never presented as a transacted price.
  Posted asks are NOT deleted: pages whose hwKey exists in
  hardware_panels keep the posted-ask median, n, and executed trend in
  the hardware MODULE — observed record and model output clearly labeled,
  never blended. The ask-vs-no-record distinction is data-driven (does
  hardware_panels carry the hwKey?) and only affects the module; B200's
  module states that no posted asks are on the record yet. When real B200
  asks land under its hwKey, the module picks them up by data alone.

  EXCLUDED as of 2026-08-13 (data, not preference):
    - B300 / GB200 / GB300: no hardware lane of either kind (no posted
      asks and no ivmodel entry).
    - V100: hardware asks exist but no T2 rates cell.
    - L40S / RTX A6000: pass the data gate, but their generation/identity
      facts are not stated anywhere on the site and they sit outside the
      premium set — held for owner review.

  A new chip page = add a registry entry (+ its og card is generated from
  the same entry). Site-wide chip links resolve through chipRoute(), so
  tables need no edits when an entry lands.
*/

export type ChipPhase = 'launch' | 'prime' | 'collateral' | 'residual';

export interface ChipDef {
  /** route: /chip/<slug> */
  slug: string;
  /** rates `gpu_model` token — homeOdCell / tierOdCell / wpSpread key */
  id: string;
  /** full display name */
  name: string;
  /** short label (ladder/link text) */
  short: string;
  /** identity line parts — as published on-site */
  formFactor: string;
  memory: string;
  generation: string;
  /** YYYY-MM from /hardware's GA map (or otherwise documented per entry) */
  introduced: string;
  /** hardware_panels model key — the ONE variant the hardware lane reads
      (for derived-mode chips: the prospective key ivmodel uses) */
  hwKey: string;
  /** unit wording for the secondary-ask tile (matches hw label) */
  hwLabel: string;
  /** launch step text for the lifecycle strip (as recorded) */
  launchText: string;
  /** current lifecycle phase (qualitative, from the recorded data) */
  phase: ChipPhase;
}

export const CHIPS: ChipDef[] = [
  {
    slug: 'h100',
    id: 'H100',
    name: 'NVIDIA H100',
    short: 'H100',
    formFactor: 'SXM',
    memory: '80GB',
    generation: 'Hopper',
    introduced: '2022-10',
    hwKey: 'H100-80-SXM5',
    hwLabel: 'SXM5 80GB',
    launchText: 'SXM5 80GB general availability, October 2022.',
    // H100 fleets anchor the filed GPU-backed facilities /credit tracks;
    // the chip is the collateral era's reference asset while still renting
    // on prime terms daily.
    phase: 'collateral',
  },
  {
    slug: 'h200',
    id: 'H200',
    name: 'NVIDIA H200',
    short: 'H200',
    formFactor: 'SXM',
    memory: '141GB',
    generation: 'Hopper',
    introduced: '2024-04',
    hwKey: 'H200-141',
    hwLabel: '141GB',
    launchText: 'SXM 141GB general availability, April 2024.',
    // 2024 silicon renting on guaranteed and interruptible terms across
    // the panel — prime rental flow.
    phase: 'prime',
  },
  {
    slug: 'b200',
    id: 'B200',
    name: 'NVIDIA B200',
    short: 'B200',
    formFactor: 'SXM',
    memory: '180GB',
    generation: 'Blackwell',
    // Intro year OWNER-CONFIRMED 2026-08-13 (not in the site's GA map;
    // matches the ivmodel vintage 2025 + 2/12). The identity line prints
    // the plain family pattern "INTRODUCED 2025". /hardware's own IV card
    // keeps its separate "vintage assumed" model disclosure — that label
    // is /hardware's and is not changed by this entry.
    introduced: '2025-03',
    hwKey: 'B200-180-SXM6',
    hwLabel: 'SXM 180GB',
    launchText: 'SXM 180GB; 2025 volume availability — vintage stated as assumed on the /hardware model.',
    // 2025 silicon renting on guaranteed and interruptible terms — prime
    // rental flow; no secondary-market record has formed yet.
    phase: 'prime',
  },
  {
    slug: 'a100',
    id: 'A100',
    name: 'NVIDIA A100',
    short: 'A100',
    formFactor: 'SXM',
    memory: '80GB',
    generation: 'Ampere',
    introduced: '2020-11',
    hwKey: 'A100-80-SXM4',
    hwLabel: 'SXM4 80GB',
    launchText: 'SXM4 80GB general availability, November 2020.',
    // Deep secondary-market record and re-let flow — the residual /
    // re-contracting stage of the arc.
    phase: 'residual',
  },
];

export function chipBySlug(slug: string): ChipDef | undefined {
  return CHIPS.find((c) => c.slug === slug);
}

/**
 * Site-wide chip-name -> instrument-page resolver.
 *
 * Accepts either a rates chip token ('H100') or a hardware model key
 * ('H100-80-SXM5'). Hardware keys resolve ONLY on the exact registry
 * `hwKey` — variant models (A100-40, H100-80-PCIE, ...) stay unlinked so a
 * variant row never points at a page locked to a different identity.
 */
export function chipRoute(idOrKey: string): string | null {
  const token = idOrKey.trim().toUpperCase();
  for (const c of CHIPS) {
    if (token === c.id.toUpperCase() || token === c.hwKey.toUpperCase()) {
      return `/chip/${c.slug}`;
    }
  }
  return null;
}
