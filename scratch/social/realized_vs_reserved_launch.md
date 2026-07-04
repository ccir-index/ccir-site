# "Realized vs. Reserved Rate" — launch copy (manual post)

**Tool:** https://ccir.io/realized (live)
**Card image:** `card_realized_committed.png` (in this folder)
**Plan:** Post LinkedIn first → grab its post URL → that URL goes in the X reply. X thread scheduled for **Tuesday 8:30 AM Central** (Typefully or manual).

---

## X — MAIN TWEET  (attach card_realized_committed.png)

How far below their own published rates do the biggest GPU clouds actually transact? We attempted to model it from their public filings.

CoreWeave's revenue is ~all committed, so we measured against its posted reserved rate — and have it realizing ~40% below even that, on the pricing power of anchors like Microsoft and OpenAI.

Per-chip estimates:

ccir.io/realized

---

## X — REPLY  (paste the LinkedIn post URL here after posting LinkedIn)

Full writeup — how we size each fleet from capex, why CoreWeave, and the reasoning behind every input: [LINKEDIN POST URL]

---

## LINKEDIN — POST  (upload card_realized_committed.png as the image; put the ccir.io link in the FIRST COMMENT, not the body)

We wanted to research what public GPU clouds actually realize — versus the rates they publish.

The number everyone quotes is on-demand, but almost no large-cloud revenue is priced there. CoreWeave's book is ~96–98% committed — so the published rate that actually matters is its reserved rate, and CoreWeave posts one (~55% off for 3-year terms).

So we reconstructed what it realizes from audited filings: compute revenue ÷ a fleet we size from capex (cross-checked to disclosed power), against its own posted pricing.

The finding: CoreWeave realizes ~$1.8/GPU-hr — about 40% below even its own posted reserved rate. Why so far under a rate it publishes itself? Its book is dominated by Microsoft/OpenAI-scale anchors who negotiate below the rack reserved rate — the largest customers command the biggest discounts. And it scales with size: through mid-2025, the smaller clouds we checked showed meaningfully shallower discounts.

Every input is a lever — but we didn't guess the defaults; each is reconciled against the filings:

• Fleet count, from capex — operators don't disclose GPU counts, so we divide equipment capex by an all-in $/GPU and cross-check against the megawatts they disclose; where a single-chip fleet is disclosed (IREN), the method reproduces it on the nose.
• Per-chip cost, all-in — GPU + server + fabric + storage, anchored to published system and rack prices.
• Chip mix by build vintage — anchored to disclosed primary chips and announced Blackwell ramps, bounded by the power cross-check.
• In-service %, committed share, and a scarcity tilt — the committed share from each operator's disclosed contract structure; the reserved benchmark from CoreWeave's own posted ~55% discount.

Measured vs modeled: the blended rate is what the filings pin down; the per-chip split is a scenario you set, not a measurement.

The defaults are our reasoned base case. The model is open if you want to test a different one — and it shows both the reserved and on-demand comparisons.

## LINKEDIN — FIRST COMMENT

ccir.io/realized

---

### Notes
- Two links, don't mix them up: `ccir.io/realized` (the tool) goes in the X main + the LinkedIn first comment; the LinkedIn *post URL* goes in the X reply.
- Optional X polish: "transact" → "realize" in the hook for consistency; "have it realizing" → "model it realizing."
- Headline numbers (committed framing): ~$1.8/GPU-hr realized, ~40% below CoreWeave's own posted ~55% reserved rate. Per-chip discounts vs reserved: A100 −50%, H100 −42%, H200 −39%, B200/GB200/GB300 −36%.
