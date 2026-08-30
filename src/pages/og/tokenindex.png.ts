import type { APIRoute } from 'astro';
import { el, toPng } from '../../lib/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { series } from '../../data/vvti';

export const prerender = true;

/*
  OG card for /tokens since the VVTI took section 00 (2026-08-29). Same
  build as the rental-rates card: the page's own chart, rendered from the
  terminal theme at 2x (src/assets/og-vvti-chart.png, 2148x1110 -> 1074x555),
  under a one-line masthead. Headline numbers are DATA-LOCKED to
  src/data/vvti.ts - the same series the page renders from - so the card
  cannot disagree with the page. New filename (was og/tokens.png) doubles
  as the cache bust.
*/

const chart = readFileSync(join(process.cwd(), 'src/assets/og-vvti-chart.png'));
const chartUri = `data:image/png;base64,${chart.toString('base64')}`;

const D = { bg: '#0d1117', ink: '#e6e6e6', dim: '#9aa2ad', gold: '#e5a50a' };

const last = series[series.length - 1];
// 1M window to match the card's daily-candle chart
const lastMs = Date.parse(last.date + 'T00:00:00Z');
const win = series.filter((p) => lastMs - Date.parse(p.date + 'T00:00:00Z') <= 30 * 86400000);
const first = win[0];
const chg = Math.round(100 * (last.vvti / first.vvti - 1));

export const GET: APIRoute = async () => {
  const bar = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 75, padding: '0 63px' }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 14 }, [
      el('div', { display: 'flex', color: D.gold, fontSize: 22, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: D.ink, fontSize: 19, fontWeight: 600 },
        'Vercel Volume Token Index (VVTI) · output, USD per 1M'),
    ]),
    el('div', { display: 'flex', color: D.dim, fontSize: 15 },
      `$${last.vvti.toFixed(2)} · ${chg}% · 1M · daily candles`),
  ]);

  const img = {
    type: 'img',
    props: {
      src: chartUri,
      width: 1074,
      height: 555,
      style: { borderRadius: 2 },
    },
  };

  const body = el('div', { display: 'flex', justifyContent: 'center' }, [img]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: D.bg, fontFamily: 'IBM Plex Mono' }, [
    bar, body,
  ]);

  const png = await toPng(root);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
