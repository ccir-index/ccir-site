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

  EXCLUDED as of 2026-08-13 (data, not preference):
    - B200 / B300 / GB200 / GB300: no hardware model in hardware_panels
      (no secondary ask) — hardware tile impossible.
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
  /** YYYY-MM from /hardware's GA map */
  introduced: string;
  /** hardware_panels model key — the ONE variant the hardware lane reads */
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
