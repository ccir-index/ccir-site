import type { APIRoute } from 'astro';
import { C, el, toPng } from '../../lib/og';
import { frontierLatest, frontierLatestDay, served } from '../../data/tokens';

export const prerender = true;

// OG card for ccir.io/tokens — DATA-LOCKED to the same module the page
// renders from (the ivmodel lesson: the card structurally cannot disagree
// with the page). Since 2026-08-05 (?v=2) the card IS the page's grouped
// input/output comparison chart: solid bars = first-party posted, outlined
// translucent bars = cross-provider served medians (n labeled). Two
// constructions on one canvas, never pooled.

const BLUE = '#3b82f6';   // input  (house pair)
const ORANGE = '#c96f06'; // output (house pair)

const latest = frontierLatest();
// Mirrors the page's resolution exactly: prefer a first-party posted row
// when the record has one (pattern-matched, so vendor id spellings need no
// hardcoding), else the served median. Card and page cannot diverge.
const PICKS: { frontierMatch?: RegExp; servedId?: string; l1: string; l2: string }[] = [
  { frontierMatch: /deepseek.*v4.*flash/i, servedId: 'deepseekv4flash',
    l1: 'DeepSeek', l2: 'V4 Flash' },
  { frontierMatch: /qwen.*(3\.8|max)/i, servedId: 'qwen3coder480ba35binstruct',
    l1: 'Qwen3 Coder', l2: '480B' },
  { frontierMatch: /kimi.*k3/i, servedId: 'kimik2thinking',
    l1: 'Kimi K2', l2: 'Thinking' },
  { frontierMatch: /^gpt-5\.6-sol$/i,   l1: 'OpenAI',    l2: 'GPT-5.6 Sol' },
  { frontierMatch: /^Claude Opus 5$/i,  l1: 'Anthropic', l2: 'Opus 5' },
  { frontierMatch: /^Claude Fable 5$/i, l1: 'Anthropic', l2: 'Fable 5' },
];
interface Bar { l1: string; l2: string; input: number; output: number; n: number | null }
const bars: Bar[] = PICKS.flatMap((p) => {
  if (p.frontierMatch) {
    const hit = [...latest.values()].find(
      (r) => p.frontierMatch!.test(r.model_id) && r.input != null && r.output != null);
    if (hit) {
      return [{ l1: p.l1, l2: p.l2, input: hit.input as number,
                output: hit.output as number, n: null }];
    }
  }
  const r = p.servedId ? served.find((s) => s.model_id === p.servedId) : undefined;
  return r && r.input_median != null && r.output_median != null
    ? [{ l1: p.l1, l2: p.l2, input: r.input_median, output: r.output_median,
         n: r.n_providers }] : [];
}).sort((a, b) => a.output - b.output);

const MAXV = Math.max(1, ...bars.map((b) => b.output));
const PLOT_H = 250;
const h = (v: number) => Math.max(3, Math.round((v / MAXV) * PLOT_H));
const fmt = (v: number) => (v >= 10 ? `$${Math.round(v)}` : `$${v.toFixed(2)}`);

function bar(v: number, color: string, servedRow: boolean) {
  return el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }, [
    el('div', { display: 'flex', fontSize: 16, color: C.dim, marginBottom: 5 }, fmt(v)),
    el('div', {
      display: 'flex', width: 44, height: h(v),
      backgroundColor: servedRow ? 'rgba(0,0,0,0)' : color,
      ...(servedRow
        ? { border: `2.5px solid ${color}`, backgroundColor: `${color}55` }
        : {}),
    }, ''),
  ]);
}

function group(b: Bar) {
  return el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }, [
    el('div', { display: 'flex', alignItems: 'flex-end', gap: 7 }, [
      bar(b.input, BLUE, b.n != null),
      bar(b.output, ORANGE, b.n != null),
    ]),
    el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
      el('div', { display: 'flex', fontSize: 17, color: C.ink }, b.l1),
      el('div', { display: 'flex', fontSize: 14.5, color: C.dim }, b.l2),
    ]),
  ]);
}

const legend = el('div', { display: 'flex', alignItems: 'center', gap: 22, fontSize: 15.5, color: C.dim }, [
  el('div', { display: 'flex', alignItems: 'center', gap: 7 }, [
    el('div', { display: 'flex', width: 14, height: 14, backgroundColor: BLUE }, ''),
    el('div', { display: 'flex' }, 'input'),
  ]),
  el('div', { display: 'flex', alignItems: 'center', gap: 7 }, [
    el('div', { display: 'flex', width: 14, height: 14, backgroundColor: ORANGE }, ''),
    el('div', { display: 'flex' }, 'output'),
  ]),
]);

const root = el('div', {
  display: 'flex', flexDirection: 'column', width: 1200, height: 630,
  backgroundColor: C.bg, padding: '38px 52px 30px', fontFamily: 'IBM Plex Mono',
}, [
  el('div', { display: 'flex', alignItems: 'baseline', gap: 12 }, [
    el('div', { display: 'flex', color: C.navy, fontSize: 24, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
    el('div', { display: 'flex', color: C.dim, fontSize: 16 },
      `Token prices · USD per 1M tokens · ${frontierLatestDay}`),
  ]),
  el('div', { display: 'flex', color: C.ink, fontSize: 34, fontWeight: 600, marginTop: 18 },
    'What a million tokens costs, by model'),
  el('div', { display: 'flex', marginTop: 14 }, [legend]),
  el('div', {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: 26, paddingBottom: 2, flexGrow: 1,
    borderBottom: `2px solid ${C.rule2}`,
  }, bars.map(group)),
  el('div', { display: 'flex', marginTop: 16, fontSize: 16, color: C.dim },
    'ccir.io/tokens'),
]);

export const GET: APIRoute = async () => {
  const png = await toPng(root);
  return new Response(png as BodyInit, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};
