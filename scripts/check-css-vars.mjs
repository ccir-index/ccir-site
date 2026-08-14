/**
 * Build-time guard: every CSS custom property a page USES must actually RESOLVE
 * on that page.
 *
 * Why this exists. On 2026-08-14 every executed line in the /hardware small
 * multiples was invisible. The data was correct, the SVG paths were in the live
 * HTML, and the stylesheet returned HTTP 200. The palette was declared as
 * `.top { --arch-hopper: … }`, but the redesign had renamed the container to
 * `page-top`, so the selector matched ZERO elements and every --arch-* resolved
 * to nothing. `stroke: var(--undefined)` is invalid and drops the stroke;
 * `fill: var(--undefined)` falls back to black. Gridlines and markers used other
 * tokens and rendered fine, which made it read as a data bug. It had been live
 * since the rename and survived a visual QA pass because nobody scrolled to the
 * affected chart.
 *
 * Two failure modes are caught:
 *   UNDEFINED — used (with no fallback) but never declared in any stylesheet the
 *               page loads.
 *   ORPHANED  — declared, but ONLY by rules whose selector needs a class that
 *               appears nowhere in that page's HTML. This is the one above.
 *
 * `var(--x, fallback)` is always safe and is ignored.
 *
 * Run: node scripts/check-css-vars.mjs [--selftest]
 * Exits 1 on any finding, so it gates `npm run build`.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** Properties set at runtime by script rather than in a stylesheet. */
const RUNTIME_ALLOW = new Set([]);

/** Selectors that always apply — no class has to exist for them to match. */
const alwaysApplies = (sel) =>
  /(^|[\s,>+~])(:root|html|body|\*)\b/.test(sel) || !/\./.test(sel);

/** Walk a stylesheet, yielding {selector, declarations} for every rule. */
function* rules(css, prelude = '') {
  let i = 0, buf = '';
  while (i < css.length) {
    const c = css[i];
    if (c === '{') {
      const sel = buf.trim();
      buf = '';
      let depth = 1, j = i + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      const body = css.slice(i + 1, j - 1);
      if (sel.startsWith('@')) {
        // conditional group (@media/@supports/@layer): body holds more rules
        if (/^@(media|supports|layer|container)/.test(sel)) yield* rules(body, prelude);
      } else {
        yield { selector: sel, body };
      }
      i = j;
      continue;
    }
    if (c === '}') { buf = ''; i++; continue; }
    buf += c;
    i++;
  }
}

const classTokensIn = (sel) => [...sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);

function analyse(html, cssTexts) {
  // class tokens actually present in the rendered page
  const present = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g))
    for (const t of m[1].split(/\s+/)) if (t) present.add(t);

  const declaredBy = new Map();   // prop -> [selector, …]
  const used = new Set();
  for (const css of cssTexts) {
    for (const { selector, body } of rules(css)) {
      for (const m of body.matchAll(/(^|[;{\s])(--[\w-]+)\s*:/g)) {
        const p = m[2];
        if (!declaredBy.has(p)) declaredBy.set(p, []);
        declaredBy.get(p).push(selector);
      }
    }
    // usage without a fallback: var(--x) — a comma means a fallback exists
    for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g))
      if (m[2] === ')') used.add(m[1]);
  }

  const undefinedProps = [], orphaned = [];
  for (const p of used) {
    if (RUNTIME_ALLOW.has(p)) continue;
    const sels = declaredBy.get(p);
    if (!sels) { undefinedProps.push(p); continue; }
    const reachable = sels.some(
      (s) => alwaysApplies(s) || classTokensIn(s).every((t) => present.has(t))
    );
    if (!reachable) orphaned.push({ prop: p, selectors: [...new Set(sels)].slice(0, 3) });
  }
  return { undefinedProps, orphaned };
}

function selftest() {
  const html = `<section class="wrap page-top"><svg><path class="ln ln-hopper"/></svg></section>`;
  const css = `.top[data-astro-cid-x]{--arch-hopper: #b9770a}.ln-hopper[data-astro-cid-x]{stroke:var(--arch-hopper)}`;
  const { orphaned } = analyse(html, [css]);
  const ok = orphaned.length === 1 && orphaned[0].prop === '--arch-hopper';
  console.log(ok
    ? 'selftest PASS — the 2026-08-14 /hardware palette bug is detected'
    : `selftest FAIL — got ${JSON.stringify(orphaned)}`);
  return ok ? 0 : 1;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

function main() {
  if (process.argv.includes('--selftest')) process.exit(selftest());
  if (!existsSync(DIST)) {
    console.error('check-css-vars: no dist/ — run after astro build');
    process.exit(1);
  }
  const cache = new Map();
  const pages = walk(DIST);
  let bad = 0;

  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    const texts = [];
    for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) {
      const f = join(DIST, m[1].replace(/^\//, ''));
      if (!existsSync(f)) continue;
      if (!cache.has(f)) cache.set(f, readFileSync(f, 'utf8'));
      texts.push(cache.get(f));
    }
    for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) texts.push(m[1]);
    if (!texts.length) continue;

    const { undefinedProps, orphaned } = analyse(html, texts);
    if (undefinedProps.length || orphaned.length) {
      bad++;
      const rel = page.slice(DIST.length + 1).replace(/\\/g, '/');
      console.error(`\n  ${rel}`);
      for (const p of undefinedProps.sort())
        console.error(`    UNDEFINED  ${p}  (used with no fallback, declared nowhere)`);
      for (const o of orphaned.sort((a, b) => a.prop.localeCompare(b.prop)))
        console.error(`    ORPHANED   ${o.prop}  declared only on: ${o.selectors.join(' , ')}`
          + `\n               -> no element on this page matches that selector, so it resolves to nothing`);
    }
  }

  if (bad) {
    console.error(`\ncheck-css-vars: ${bad} page(s) with unresolvable custom properties.\n`
      + 'A var() that does not resolve fails SILENTLY: stroke disappears, fill goes black.\n');
    process.exit(1);
  }
  console.log(`check-css-vars: ${pages.length} pages OK — every var() resolves.`);
}

main();
