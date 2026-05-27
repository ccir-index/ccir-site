import type { APIRoute } from 'astro';
import { frame, tierTable, toPng, type Cell } from '../../lib/og';
import { tierMatrix, premiumChipsList, meta } from '../../data/snapshot';
import { TIERS, PREMIUM_CHIPS, TIER_LABELS_SHORT } from '../../data/types';

export const prerender = true;

export const GET: APIRoute = async () => {
  const live = premiumChipsList();
  const chips = live.length > 0 ? live : [...PREMIUM_CHIPS];
  const ladder = chips.map((chip) => ({ chip, cells: tierMatrix(chip) as Record<string, Cell> }));
  const t1 = TIERS[0];

  const table = tierTable({
    tiers: TIERS,
    labelOf: (t) => TIER_LABELS_SHORT[t as keyof typeof TIER_LABELS_SHORT],
    ladder,
    secondaryHeader: 'VS T1',
    secondary: (c, t, cells) => {
      if (!c) return '—';
      if (t === t1) return 'base';
      const base = cells[t1]?.price_median;
      if (!base) return '—';
      const d = (base - c.price_median) / base; // positive = discount
      const sign = d >= 0 ? '−' : '+';
      return `${sign}${Math.abs(d * 100).toFixed(0)}%`;
    },
  });

  const png = await toPng(frame('Tier spreads — discount vs Tier 1 IF.', 'How much of the rate is deployment grade, not silicon.', table, meta.as_of_date));
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
