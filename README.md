# ccir-site

Source for [ccir.io](https://ccir.io) — the public **CCIR v2.0** reference rate site.

Three productivity-adjusted reference rates for GPU compute markets — Tier 1, Tier 2, Tier 3 Intelligence Factories (T1IF / T2IF / T3IF), side by side, daily.

## Stack

- [Astro](https://astro.build) static site, no JavaScript framework
- Dual-mode theme (Editorial cream / Terminal dark), persisted in `localStorage`
- IBM Plex Serif / Sans / Mono via Google Fonts
- Bundled CSV snapshot from [ccir-v2-data](https://github.com/ccir-index/ccir-v2-data)
- Deployed on Cloudflare Pages

## Local development

```bash
npm install
npm run dev    # http://localhost:4321
npm run build  # → dist/
```

## Routes

- `/` — Today's headline rates + tier ladder + methodology overview
- `/tiers` — Intelligence Factory taxonomy explainer + capability matrix
- `/spreads` — T1IF-anchored spread matrix (cross-tier and within-tier)
- `/explorer` — Full series browser (headline + indicative)
- `/applications` — Worked credit-document examples referencing T1IF
- `/contact` — Contact + editorial framing card

## Data refresh

The bundled CSVs at `src/data/rates_*.csv` are refreshed from the daily pipeline snapshot in [ccir-v2-data/indices/snapshots/](https://github.com/ccir-index/ccir-v2-data/tree/main/indices/snapshots). The site loader filters non-T-tier rows and non-OnDemand terms at parse time.

## Methodology

Full methodology document: [CCIR Methodology v2.0.0](https://github.com/ccir-index/ccir-v2-data/blob/main/methodology/CCIR_Methodology_v2_0_0.md).

## Independence

CCIR holds no positions in the markets it measures. All inputs are publicly observable list-asks; no solicited quotes, no broker feeds.
