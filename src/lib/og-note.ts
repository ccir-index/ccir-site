/*
  Shared OG card layout for research notes, primers, and product pages that
  aren't driven by live snapshot tables: masthead + kicker, one/two-line
  display title, short standfirst, a small row table, footer with the URL.
  Same 1200x630 terminal-dark system as lib/og.ts (satori -> resvg).
  ASCII-safe text only where possible — the embedded IBM Plex Mono subset
  lacks some glyphs (no "→"; use ASCII arrows).
*/
import { C, el, toPng } from './og';

export type NoteRow = [string, string, string];

// Terminal (dark) palette — since 2026-08-02 this IS the default `C` in
// lib/og.ts (all OG cards render terminal). Kept as a named export for
// the endpoints that opted in explicitly before the default flipped.
export const CT = C;

export interface NoteCardSpec {
  kicker: string;
  right?: string;
  titleLines: string[];
  sub: string;
  rows: NoteRow[];
  foot?: string;
  url: string;
  /** Palette override. Defaults to C (terminal dark since 2026-08-02). */
  palette?: typeof C;
}

export async function noteCardPng(spec: NoteCardSpec): Promise<Buffer> {
  const { kicker, right, titleLines, sub, rows, foot, url } = spec;
  const P = spec.palette ?? C;

  const top = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }, [
    el('div', { display: 'flex', alignItems: 'baseline', gap: 12 }, [
      el('div', { display: 'flex', color: P.navy, fontSize: 24, fontWeight: 600, letterSpacing: 3 }, 'CCIR'),
      el('div', { display: 'flex', color: P.dim, fontSize: 16 }, kicker),
    ]),
    el('div', { display: 'flex', color: P.dim, fontSize: 16 }, right ?? ''),
  ]);

  const title = el('div', { display: 'flex', flexDirection: 'column', marginBottom: 10, gap: 2 },
    titleLines.map((line) =>
      el('div', { display: 'flex', color: P.ink, fontSize: 44, fontWeight: 600, letterSpacing: 0.5 }, line),
    ));

  const subEl = el('div', { display: 'flex', color: P.dim, fontSize: 17, marginBottom: 24 }, sub);

  const rowH = rows.length >= 5 ? 52 : 58;
  const table = el('div', { display: 'flex', flexDirection: 'column', border: `1px solid ${P.rule}`, backgroundColor: P.surface }, [
    ...rows.map(([label, body, fig], i) =>
      el('div', { display: 'flex', alignItems: 'center', height: rowH, borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${P.rule}`, padding: '0 20px' }, [
        el('div', { display: 'flex', width: 218, color: P.ink, fontSize: 17, fontWeight: 600 }, label),
        el('div', { display: 'flex', flexGrow: 1, color: P.dim, fontSize: 16.5 }, body),
        el('div', { display: 'flex', color: P.navy, fontSize: 19, fontWeight: 600 }, fig),
      ]),
    ),
  ]);

  const footer = el('div', { display: 'flex', alignItems: 'flex-end', flexGrow: 1, justifyContent: 'space-between', color: P.faint, fontSize: 14, letterSpacing: 1.5 }, [
    el('div', { display: 'flex' }, foot ?? 'CCIR - COMPUTE CREDIT INDEX RESEARCH'),
    el('div', { display: 'flex' }, url),
  ]);

  const root = el('div', { display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: P.bg, padding: 48, fontFamily: 'IBM Plex Mono' }, [
    top, title, subEl, table, footer,
  ]);

  return toPng(root);
}
