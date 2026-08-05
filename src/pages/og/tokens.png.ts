import type { APIRoute } from 'astro';
import { noteCardPng } from '../../lib/og-note';
import { frontierLatest, lastReprice, served } from '../../data/tokens';

export const prerender = true;

// OG card for ccir.io/tokens — DATA-LOCKED to the same module the page
// renders from (the ivmodel lesson: the card structurally cannot disagree
// with the page). Values regenerate on every build from the bundled CSVs.

const latest = frontierLatest();
const sol = latest.get('gpt-5.6-sol');
const luna = latest.get('gpt-5.6-luna');
const lunaRe = lastReprice('gpt-5.6-luna');
const kimi = served.find((r) => r.model_id === 'kimik2instruct');

const usd = (v: number | null | undefined, dp = 2) =>
  v == null ? '—' : `$${v.toFixed(dp)}`;
const lunaPct = lunaRe && luna?.output != null && lunaRe.prevOutput
  ? `${Math.round(((luna.output - lunaRe.prevOutput) / lunaRe.prevOutput) * 100)}%`
  : null;

const SPEC = {
  kicker: 'Token prices · USD per 1M tokens · recorded daily',
  titleLines: ['Token Prices'],
  sub: 'What the model owners post, and the range where open models are served. Two constructions, never blended.',
  rows: [
    [
      'gpt-5.6-sol',
      'frontier posted · output',
      usd(sol?.output ?? null),
    ],
    [
      'gpt-5.6-luna',
      lunaRe && lunaPct
        ? `repriced ${lunaRe.date} (${lunaPct}) · output`
        : 'frontier posted · output',
      usd(luna?.output ?? null),
    ],
    [
      'Kimi K2',
      kimi ? `served median · n=${kimi.n_providers} providers` : 'served median',
      usd(kimi?.output_median ?? null),
    ],
  ],
  url: 'ccir.io/tokens',
};

export const GET: APIRoute = async () => {
  const png = await noteCardPng(SPEC);
  return new Response(png as BodyInit, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};
