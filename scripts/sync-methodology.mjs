/**
 * Bring the public methodology into the site from a local checkout of
 * ccir-index/ccir-methodology (the repo the notebooks mirror workflow
 * publishes to). Run by hand when a methodology version ships, then commit
 * the result like any other page change (a push to main publishes).
 *
 *   node scripts/sync-methodology.mjs <path-to-ccir-methodology-checkout>
 *
 * Copies:
 *   CCIR_Methodology.md        -> src/content/methodology/methodology.md   (the page text)
 *   versions/versions.json     -> public/documents/methodology/versions.json (version bar + list)
 *   versions/*.pdf             -> public/documents/methodology/            (new files only)
 *
 * A PDF already in public/ is never overwritten: a version's PDF is immutable
 * once published. A differing copy is reported and left alone.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src || !existsSync(join(src, 'versions', 'versions.json'))) {
  console.error('usage: node scripts/sync-methodology.mjs <ccir-methodology checkout>');
  process.exit(2);
}

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const contentDir = join(ROOT, 'src', 'content', 'methodology');
const pubDir = join(ROOT, 'public', 'documents', 'methodology');
mkdirSync(contentDir, { recursive: true });
mkdirSync(pubDir, { recursive: true });

const md = join(src, 'CCIR_Methodology.md');
copyFileSync(md, join(contentDir, 'methodology.md'));
console.log(`methodology.md      <- CCIR_Methodology.md (${sha(md).slice(0, 12)})`);

copyFileSync(join(src, 'versions', 'versions.json'), join(pubDir, 'versions.json'));
console.log('versions.json       <- versions/versions.json');

let kept = 0;
for (const name of readdirSync(join(src, 'versions')).filter((n) => n.endsWith('.pdf'))) {
  const from = join(src, 'versions', name);
  const to = join(pubDir, name);
  if (!existsSync(to)) {
    copyFileSync(from, to);
    console.log(`${name} <- new`);
  } else if (sha(from) !== sha(to)) {
    console.log(`${name}: differs from the published copy, left alone (a version's PDF is immutable)`);
    kept += 1;
  }
}
if (kept) process.exitCode = 1;
