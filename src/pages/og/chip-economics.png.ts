import type { APIRoute } from 'astro';
import { el, toPng } from '../../lib/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const prerender = true;

/*
  OG card for /chip-economics. Custom dark chart card (rental-rates pattern):
  the page's own §01 four-lens small-multiples row, screenshotted at 2x from
  the terminal theme (src/assets/og-ce-hero.png, 2080x668), under a one-line
  masthead strip and over a stat footer. The four-panel contrast IS the
  finding — three quotients scatter, one is flat.
*/

const chart = readFileSync(join(process.cwd(), 'src/assets/og-ce-hero.png'));
const chartUri = `data:image/png;base64,${chart.toString('base64')}`;

// Terminal-theme palette; accent = the page's spread-badge orange.
const D = { bg: '#0d1117', ink: '#e6e6e6', dim: '#9aa2ad', gold: '#eab308' };

export const GET: APIRoute = async () => {
  const bar = el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, padding: '0 48px' }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 14 }, [
      el('div', { display: 'flex', color: D.gold, fontSize: 22, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: D.ink, fontSize: 19, fontWeight: 600 }, 'Chip Economics — Earning Power per Spec-Sheet Unit'),
    ]),
    el('div', { display: 'flex', color: D.dim, fontSize: 15 }, 'example prints 2026-07-07'),
  ]);

  const img = {
    type: 'img',
    props: {
      src: chartUri,
      width: 1104,
      height: 354,
      style: { borderRadius: 2 },
    },
  };

  const body = el('div', { display: 'flex', justifyContent: 'center', paddingTop: 14 }, [img]);

  const foot = el('div', { display: 'flex', flexDirection: 'column', gap: 12, padding: '44px 48px 0' }, [
    el('div', { display: 'flex', color: D.ink, fontSize: 23, fontWeight: 600 }, [
      el('span', { display: 'flex' }, 'Same rate, four denominators. Three scatter. One is flat: '),
      el('span', { display: 'flex', color: D.gold }, '$0.87–0.98 / TB/s-hr'),
    ]),
    el('div', { display: 'flex', color: D.dim, fontSize: 15 }, 'Five chips, 2020 A100 to the newest B300 · neocloud guaranteed on-demand, US · ccir.io/chip-economics'),
  ]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: D.bg, fontFamily: 'IBM Plex Mono' }, [
    bar, body, foot,
  ]);

  const png = await toPng(root);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
};
