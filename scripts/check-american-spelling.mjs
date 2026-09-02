// American-spelling gate for the built site (John, 2026-09-02: American
// English on every public surface). Scans dist/**/*.html visible text and
// fails the build on British forms. Proper nouns and quoted third-party
// text go in ALLOW below, never in the pattern.
//
//   node scripts/check-american-spelling.mjs            # gate (exit 1 on hits)
//   node scripts/check-american-spelling.mjs --report   # list only
//   node scripts/check-american-spelling.mjs src        # scan a source dir instead
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv.slice(2).find((a) => !a.startsWith('-')) || 'dist';
const REPORT = process.argv.includes('--report');

// Word-boundary patterns. Each entry: [regex, American form].
const BRITISH = [
  [/\bcoloured\b/gi, 'colored'], // "coloured"; "colored" is caught by ALLOW below
  [/\bcolours?\b/gi, 'color(s)'],
  [/\bcentres?\b/gi, 'center(s)'],
  [/\bcentred\b/gi, 'centered'],
  [/\bmetres?\b/gi, 'meter(s)'],
  [/\blitres?\b/gi, 'liter(s)'],
  [/\bfibre\b/gi, 'fiber'],
  [/\btheatre\b/gi, 'theater'],
  [/\b(behaviour|behaviours|behavioural)\b/gi, 'behavior'],
  [/\b(favour|favours|favourite|favourable)\b/gi, 'favor'],
  [/\b(honour|honours|honourable)\b/gi, 'honor'],
  [/\b(labour|labours)\b/gi, 'labor'],
  [/\bneighbours?\b/gi, 'neighbor'],
  [/\bharbours?\b/gi, 'harbor'],
  [/\brumours?\b/gi, 'rumor'],
  [/\bvapour\b/gi, 'vapor'],
  [/\b(standardis|summaris|organis|normalis|realis|recognis|optimis|minimis|maximis|utilis|categoris|emphasis|apologis|authoris|capitalis|prioritis|specialis|stabilis|visualis|monetis|characteris|criticis|customis|formalis|generalis|initialis|localis|materialis|neutralis|randomis|serialis|symbolis|synchronis|tokenis|equalis|finalis|itemis|legitimis|mobilis|nationalis|penalis|polaris|popularis|rationalis|revolutionis|scrutinis|subsidis|sympathis|systematis|theoris|vaporis)(e|ed|es|ing|ation|ations)\b/gi, '-ize / -yze'],
  [/\b(labelled|labelling|modelled|modelling|cancelled|cancelling|travelled|travelling|signalled|signalling|totalled|totalling|levelled|levelling|channelled|channelling|fuelled|fuelling|marvelled|quarrelled|counselled|counselling|dialled|dialling|equalled|initialled|pencilled|rivalled|tunnelled|tunnelling|panelled|panelling)\b/gi, 'single l'],
  [/analys(e|ed|ing)/gi, 'analyze'],
  [/\bcatalogues?\b/gi, 'catalog'],
  [/\bdialogue\b/gi, 'dialog'],
  [/\banalogue\b/gi, 'analog'],
  [/\bdefence\b/gi, 'defense'],
  [/\blicence\b/gi, 'license'],
  [/\boffence\b/gi, 'offense'],
  [/\bpretence\b/gi, 'pretense'],
  [/\bgrey\b/gi, 'gray'],
  [/\bprogrammes?\b/gi, 'program'],
  [/\btyres?\b/gi, 'tire'],
  [/\bcheques?\b/gi, 'check'],
  [/\bartefacts?\b/gi, 'artifact'],
  [/\bjudgement\b/gi, 'judgment'],
  [/\bwhilst\b/gi, 'while'],
  [/\bamongst\b/gi, 'among'],
  [/\btowards\b/gi, 'toward'],
  [/\bafterwards\b/gi, 'afterward'],
  [/\blearnt\b/gi, 'learned'],
  [/\bspelt\b/gi, 'spelled'],
  [/\bdreamt\b/gi, 'dreamed'],
  [/\bfulfil\b/gi, 'fulfill'],
  [/\benrol\b/gi, 'enroll'],
  [/\bskilful\b/gi, 'skillful'],
  [/\baluminium\b/gi, 'aluminum'],
  [/\bmaths\b/gi, 'math'],
  [/\bmould\b/gi, 'mold'],
  [/\bplough\b/gi, 'plow'],
  [/\bsceptic(al|ism)?\b/gi, 'skeptic'],
  [/\bpaediatric\b/gi, 'pediatric'],
  [/\bencyclopaedia\b/gi, 'encyclopedia'],
  [/\bfoetus\b/gi, 'fetus'],
  [/\bcosy\b/gi, 'cozy'],
  [/\bstorey\b/gi, 'story'],
  [/\bpyjamas\b/gi, 'pajamas'],
];

// Proper nouns and quoted third-party text that legitimately keep their
// spelling. Match is on the surrounding line, case-sensitive.
const ALLOW = [
  /Lafayette Centre/,            // the CFTC building
  /\bcolored\b/,                 // American; excludes it from the coloured catch
  /Centre for /,                 // institution names
  /Financial Conduct Authority/, // quoted UK regulator text lives in research notes only
  /Specialised &(amp;)? Asset Finance/, // Macquarie division name (entity-encoded in HTML)
  /CDC Data Centres/,            // company name
  /amongst purchasers/,          // Federal Register question 1(f), verbatim
  /licence""?: ""?/,            // token export axes JSON key inside the CSV (pipeline field name, not prose)
];

function walk(dir, out = []) {
  if (!statSync(dir).isDirectory()) return [dir];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (['.html', '.astro', '.md', '.ts', '.mjs', '.json', '.csv', '.txt'].includes(extname(p))) out.push(p);
  }
  return out;
}

function visibleText(path, raw) {
  if (!path.endsWith('.html')) return raw;
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

const hits = [];
for (const file of walk(ROOT)) {
  const raw = readFileSync(file, 'utf8');
  const text = visibleText(file, raw);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (ALLOW.some((a) => a.test(line))) {
      // still catch other words on an allowed line, minus the allowed span
      const scrub = ALLOW.reduce((l, a) => l.replace(a, ' '), line);
      for (const [re, fix] of BRITISH) {
        re.lastIndex = 0;
        const m = scrub.match(re);
        if (m) hits.push({ file, line: i + 1, word: m[0], fix });
      }
      return;
    }
    for (const [re, fix] of BRITISH) {
      re.lastIndex = 0;
      const m = line.match(re);
      if (m) hits.push({ file, line: i + 1, word: m[0], fix });
    }
  });
}

if (hits.length) {
  console.log(`British spellings found: ${hits.length}`);
  for (const h of hits.slice(0, 200)) console.log(`  ${h.file}:${h.line}  "${h.word}"  → ${h.fix}`);
  if (hits.length > 200) console.log(`  … ${hits.length - 200} more`);
  process.exit(REPORT ? 0 : 1);
} else {
  console.log(`American spelling check: clean (${ROOT})`);
}
