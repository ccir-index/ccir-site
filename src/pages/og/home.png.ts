import type { APIRoute } from 'astro';
import { frame, tierTable, toPng, type Cell } from '../../lib/og';
import { tierMatrix, premiumChipsList, meta } from '../../data/snapshot';
import { TIERS, PREMIUM_CHIPS, TIER_LABELS_SHORT } from '../../data/types';

export const prerender = true;

export const GET: APIRoute = async () => {
  const live = premiumChipsList();
  const chips = live.length > 0 ? live : [...PREMIUM_CHIPS];
  const ladder = chips.map((chip) => ({ chip, cells: tierMatrix(chip) as Record<string, Cell> }));

  const table = tierTable({
    tiers: TIERS,
    labelOf: (t) => TIER_LABELS_SHORT[t as keyof typeof TIER_LABELS_SHORT],
    ladder,
    secondaryHeader: 'N',
    secondary: (c) => (c ? String(c.n_sources) : '—'),
  });

  const png = await toPng(frame('Independent reference rates for GPU compute.', 'Median USD / GPU-hour, by operator segment — T1 / T2 / T3.', table, meta.as_of_date));
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
