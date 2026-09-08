# Methodology

This document describes current practice for every published CCIR reference series, the Compute Rental Index (CRI): what the numbers measure, where they come from, and how they are computed. Changes to anything on this page are governed by the [Change Management Policy](/documents/change-management).

## 01 What the Series Are

CCIR publishes daily reference series for GPU rental prices, in U.S. dollars per GPU per hour, on the grain **chip × operator segment × form factor × interruptibility × commitment term × region**. Every price is a **posted, publicly observable list ask** collected from a provider-operated pricing surface — not an executed transaction, not a solicited quote, not a broker-mediated or sponsored feed. If a price is only available through sales contact, it is not in the index.

## 01a Design Rationale

The series measure publicly posted list asks. They do not sample executed transactions, and they do not estimate traded volume. Posted asks are observable without solicitation and reproducible by any third party on the day of observation. They carry no submission channel, so there is nothing to misreport: no transaction sample to select from, no broker mark, no expert judgment.

The series are designed as **reference rates**: suitable for contractual citation, residual-value monitoring, and credit covenants. Not every published row carries that status, and section 04a sets out the test. They are not designed to replicate a volume-weighted average of executed trades. Products that measure executed levels sit outside this methodology and its governance framework.

## 02 Operator Segments

Series are segmented by the class of operator posting the price, not by hardware grade:

- **Hyperscaler** — integrated cloud majors (list rate cards).
- **Neocloud** — GPU-specialist clouds selling dedicated capacity.
- **Marketplace** — multi-seller venues and aggregated marketplaces.

In series identifiers these carry the tokens `T1` / `T2` / `T3` respectively.

## 03 Collection

Prices are collected automatically from each provider's public pricing pages or application programming interfaces (APIs). Each observation records the provider, chip, posted price, and its axes (form factor, interruptibility, commitment term, region). Raw observations are archived; published series are aggregates.

Capture runs on a per-source schedule, from once a day to hourly, set by how often a surface can be read without burdening it. **Every series is a daily series**: each cell publishes one value per day, and a source's readings within that day reduce to a single per-source value before the headline is computed. Capture frequency is an operational parameter rather than part of a series definition, so a change to it is not a series break.

## 04 Aggregation and the Headline Statistic

Aggregation is **operator-equal**: one source, one vote. A provider's multiple qualifying listings in a cell are reduced to a per-source value first, so no provider's listing count moves a series.

The headline statistic per cell follows a disclosed rule: **mean when the panel has ten or more sources (n ≥ 10), median below that**. The statistic actually used is stamped on every row (`headline_stat`), and every cell publishes its source count *n*, observation count, and interquartile range alongside the headline value.

**Publication threshold.** A cell publishes when at least three independent sources contribute to it and it holds at least five observations. Cells below that threshold are computed and retained, and they do not publish. Two breakout classes publish at two sources rather than being withheld: regional cuts and committed-term cuts, where a thin panel is the true state of an emerging market. Those cells carry `promotion_status` of `Provisional`; cells clearing the full threshold carry `Published`.

Panel depth *n* is the trust signal. It publishes beside every headline value with the observation count and the interquartile range, and thin cells should be read as indicative. Because the threshold is a floor on depth rather than a view on price, it never selects among cells that clear it.

Under rapid dislocation (the sudden exit of major sources, widespread collection failure, or extreme dispersion) the administrator may widen the observation window or publish a notice of reduced coverage. Both steps are pre-specified contingencies: each is logged, applies forward only, and changes neither the series identifier nor the definition of the rate.

## 04a What Publishes, and What May Be Cited

Publication and citability are separate questions, and every row answers both on its face. `promotion_status` reports whether a cell cleared the full threshold in section 04. `product_class` reports what it may be used for.

`citable` marks the on-demand reference series. `market_intelligence` marks the committed-term series, together with the on-demand companion published beside them for like-for-like comparison. Those cells are published for context. They rest on a different and generally thinner panel than the on-demand series beside them, so they are not offered for contractual citation. **A citable reference rate is a row reading `product_class = citable` and `promotion_status = Published`**. A substantial share of published rows does not meet both conditions, so the two columns are the test rather than the series identifier.

The published file carries the operator-segment series set out in section 06. An earlier factory-class taxonomy is still computed and surfaces in the [/explorer](/explorer) long tail. Those series are not part of the reference set and are not included in the download.

## 05 Windows and Composition Stability

Each cell is computed on the shortest observation window that meets the publication threshold in section 04: one day, else three days, else seven. A cell whose single day of data falls short of the threshold widens its window rather than publish thin. The window actually used is stamped on every row (`headline_window_days`), with the source and observation counts at each horizon. Panel membership is versioned; when a panel member transiently fails collection, its last-good price carries forward for at most seven days so one missed scrape does not change a series' composition. Members absent beyond that exit the cell.

## 06 Series Grammar

Every Compute Rental Index (CRI) series identifier is fully self-describing:

```
CRI-{SEGMENT}-{CHIP}-{FORM}-{INT}-{TERM}-{REGION}

SEGMENT   T1 Hyperscaler · T2 Neocloud · T3 Marketplace
FORM      SXM · PCIe · NVL · OAM · ALL (pooled)
INT       GTD guaranteed · INT interruptible · ALL (pooled)
TERM      OD on-demand · 1mo 3mo 6mo 1yr 2yr 3yr committed
REGION    US · EU · APAC · Other · ALL (pooled)

Example:  CRI-T2-H100-ALL-GTD-OD-US
          Neocloud · H100 · guaranteed on-demand · United States
```

`ALL` on any axis means that axis is pooled for that series. `Other` on the region axis collects posted locations outside the three named regions; it is a residual, and it is never a substitute for a named region. `OAM` is the Open Accelerator Module form factor. The reference ladder on [/rates](/rates) shows the guaranteed on-demand US cut per chip and segment, with each cell's series identifier printed beneath the rate.

## 07 Publication, History, Restatement

Series publish daily by 07:30 Eastern Time (ET) at ccir.io. History is append-only with a methodology version stamped on every row. A daily value finalizes at the close of its publication day; recomputation before finalization under a logged change is not a restatement. After finalization, no value changes silently. When a defect or a material methodology change requires it, history is restated — republished in full under the current version — per the [Change Management Policy](/documents/change-management).
