import type { APIRoute } from 'astro';
import { el, toPng } from '../../lib/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const prerender = true;

/*
  OG card for /research/rental-rates-by-generation. Custom dark card (like
  the Itel photo card, this note gets its exhibit as the image): the page's
  own combined V100/A100/H100 panel, screenshotted at 2x from the terminal
  theme (src/assets/og-rrbg-chart.png), under a one-line masthead strip.
  Chart aspect 2000x1034; scaled to 1074x555 under a 75px title bar.
*/

const chart = readFileSync(join(process.cwd(), 'src/assets/og-rrbg-chart.png'));
const chartUri = `data:image/png;base64,${chart.toString('base64')}`;

// Terminal-theme palette sampled from the page: near-black ground, dim gray
// text, the H100 gold as the accent.
const D = { bg: '#0d1117', ink: '#e6e6e6', dim: '#9aa2ad', gold: '#eab308' };

export const GET: APIRoute = async () => {
  const bar = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 75, padding: '0 63px' }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 14 }, [
      el('div', { display: 'flex', color: D.gold, fontSize: 22, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: D.ink, fontSize: 19, fontWeight: 600 }, 'GPU Rental Rates by Generation — Nine Years of Posted Prices'),
    ]),
    el('div', { display: 'flex', color: D.dim, fontSize: 15 }, '2017–2026'),
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
