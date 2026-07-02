# /utilization rebuild — Supply & Demand instrument panel

**Branch:** `proto/supply-observatory` · **Status:** prototype — ships at the
composite-index launch, not before. `main`'s copy of `/utilization` stays live
untouched.

**Naming:** the working concept is "supply–demand observatory", but
`/observatory` is already the (paused) Shadeform **Availability Observatory**
page. The rebuilt page therefore titles itself **Supply & Demand** and never
uses "Observatory" in visible copy. Route stays `/utilization`
(`/availability` continues to redirect to it).

## Information architecture

One page, five numbered instruments. Each panel states what it measures, its
source count, and the time window it draws (house rule). Sections 01/02 run
on live feeds and overlay every selected chip; sections 03–05 follow the
first selected chip and run on **future feeds** — until those land they render
a deterministic placeholder sample under an "Illustrative sample — feed not
yet live" badge (`SHOW_SAMPLE_WHEN_MISSING` in the page script flips the
fallback to the standard "warming up" empty state at launch).

| # | Instrument | Feed | Status |
|---|---|---|---|
| 01 | Measured marketplace utilization (Vast rented/total) | `vast_utilization*.csv` | live |
| 02 | Availability breadth (X of Y venues, Cluster vs Fractional) | `availability_index_*.csv` | live · three-state upgrade slot reserved |
| 03 | Demand gauge — spot-to-on-demand spread | `spot_gauge_{chip}.csv` | future |
| 04 | Executable market depth — offer counts + posted range | `executable_depth_{chip}.csv` | future |
| 05 | Posted vs executable divergence (signature chart) | `posted_executable_{chip}.csv` | future |

A closing aside names the destination: these five are the component gauges of
a composite supply–demand index in development.

### Language rules enforced in copy

- Never "fills", "fill evidence", "executed prints", or "clearing" for
  ask-based data. Every input on the page is a publicly posted ask; the
  divergence gap is described as a **posted-price spread, not a transaction
  record**.
- Occupancy is **measured marketplace utilization**; the caption keeps the
  caveat that a rented GPU and a host-paused GPU are indistinguishable in the
  disclosure (upper bound on paid occupancy).
- No "we don't normalize" claims.
- Every trend carries an explicit window label (`Jun 16 → Jul 2 · daily
  marks …`), updated by the renderer alongside the data.

### Chart conventions

- Sections 01–04: client-side Chart.js (runtime per-chip CSVs — the page's
  existing pattern), with the shared `lastValueLabelPlugin` direct end labels
  on the new charts.
- Section 05: client-built inline SVG following the TermCurveChart house
  conventions — chart-local per-theme series tokens, direct end labels with
  collision push + leader lines, per-day hover `<title>` disclosing panel
  depth, mono captions. Injected via `innerHTML`, so all `.dvg-*` styles are
  `:global` (Astro scoped-style gotcha).
- Series pair (posted amber / executable cyan) reuses the TermCurveChart
  validated tokens and re-passed the dataviz six-checks on both theme
  surfaces (2026-07-02): dark `#cc7d00`/`#00829e` worst CVD ΔE 79.7 PASS;
  light `#a3660f`/`#0d96b6` worst CVD ΔE 75.0 PASS.
- Count and price never share an axis (section 04 is two stacked panels).

## Data contracts — CSVs the pipeline must export

All files land in `public/data/` via the existing `sync-from-data.yml` flow.
One row per `as_of_date`, ISO dates, decimals as plain numbers, and a
`methodology_version` column, matching the existing exports. The page's
sample rows already use these exact column names, so wiring live data is a
pure pipeline change.

### 1. `spot_gauge_{chip}.csv` — section 03

Per-chip daily spot-to-on-demand spread. Source: AWS posted spot ask vs the
matching instance's posted on-demand rate, pooled across regions.

| column | type | meaning |
|---|---|---|
| `chip_slug` | str | e.g. `h100-sxm` |
| `as_of_date` | date | daily mark |
| `spot_median_usd` | float | median posted spot ask, per-GPU $/hr, across regions |
| `od_posted_usd` | float | posted on-demand rate for the matching instance, per-GPU $/hr |
| `spot_pct_of_od` | float 0–1 | `spot_median_usd / od_posted_usd` — the plotted series |
| `n_regions` | int | regions pooled (disclosed on hover) |
| `methodology_version` | str | |

### 2. `executable_depth_{chip}.csv` — section 04

Per-chip daily launchable-offer depth across the executable marketplace
venues (venues whose listed offers can be launched against now — still
list-asks).

| column | type | meaning |
|---|---|---|
| `chip_slug` | str | |
| `as_of_date` | date | daily mark |
| `n_offers` | int | launchable offers observed (per-day mean or last cycle — decide; disclose) |
| `n_venues` | int | executable venues contributing (disclosed on hover) |
| `price_min` | float | min posted per-GPU $/hr across offers |
| `price_p25` | float | (optional — page currently plots min/median/max) |
| `price_median` | float | median posted per-GPU $/hr |
| `price_p75` | float | (optional) |
| `price_max` | float | max posted per-GPU $/hr |
| `methodology_version` | str | |

### 3. `posted_executable_{chip}.csv` — section 05 (signature chart)

Per-chip daily pair: the posted-rate reference vs the executable component.

| column | type | meaning |
|---|---|---|
| `chip_slug` | str | |
| `as_of_date` | date | daily mark |
| `posted_median_usd` | float | operator-equal median of posted on-demand asks across the rate panel (steps when rate cards reprice) |
| `executable_median_usd` | float | median posted ask across launchable marketplace offers |
| `n_posted_sources` | int | rate-panel sources behind the posted leg (hover) |
| `n_executable_venues` | int | venues behind the executable leg (hover) |
| `methodology_version` | str | |

Derived on the client: `gap_pct = (executable − posted) / posted`. Don't
export it; one source of truth.

### 4. Availability three-state upgrade — section 02 (v2 of an existing feed)

Extend `availability_index_headline.csv` and
`availability_index_trend_{chip}.csv` with per-venue three-state counts from
Wave-1 probing (waitlist / OOS / quote-only chips):

| new column | meaning |
|---|---|
| `n_in_stock` | venues with launchable stock (today's `n_available`) |
| `n_advertised_unfulfillable` | venues listing the chip but waitlist / quote-only / out-of-stock |
| `n_not_listed` | panel venues not listing the chip at all |

(with `_8x` variants mirroring the existing Cluster split where disclosed).
The page already reserves: a hidden fourth stat cell (`#s-adv-cell`), a
hidden three-state legend (`#state-legend`), and a slot for a stacked
per-state venue-count band under the trend chart (`#state-band-slot`). The
unhide steps are commented at each node and in `renderBand()`.

## Open questions

1. **Demand gauge source breadth** — AWS is the only venue with a clean
   posted spot/OD pair today. Is a one-source gauge acceptable at launch
   (caption discloses it), or hold section 03 behind a second source?
2. **Executable venue set** — which venues count as "executable" for
   sections 04/05 (Vast verified? RunPod sub-products? Shadeform-probed
   launchables?), and does the set get a frozen panel + carry-forward like
   the rate panel to keep composition changes out of the depth read?
3. **Depth aggregation cadence** — `n_offers` per day: mean across intraday
   cycles vs last cycle. Mean is smoother; last-cycle matches "right now"
   language. Caption must match the choice.
4. **Posted leg tier scope** — section 05's posted reference: T2IF headline,
   or the pooled neocloud band? Executable venues are mostly T3IF-adjacent —
   grade mismatch between the legs is itself part of the story and must be
   captioned either way.
5. **Composite index** — weighting and gating of the five instruments is
   deliberately out of scope for this page; the page only ships the
   instrumentation. The composite gets its own methodology entry when built.
6. **Multi-chip overlays for 03–05** — currently primary-chip only to keep
   palettes and captions honest. Revisit after launch if there's pull.
7. **Sample-data guard** — should `SHOW_SAMPLE_WHEN_MISSING = true` ever
   ship to production? Current intent: flip to `false` at launch so missing
   feeds show "warming up", and samples only ever render on preview builds.
