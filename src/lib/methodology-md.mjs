/**
 * Methodology markdown -> page HTML.
 *
 * src/content/methodology/methodology.md is the public methodology text
 * (METHODOLOGY_PUBLIC.md in ccir-v2-notebooks, mirrored to
 * ccir-index/ccir-methodology as CCIR_Methodology.md). The same text feeds
 * the versioned PDF, so the page and the PDF cannot drift. The file reaches
 * the site through scripts/sync-methodology.mjs, run by hand from a local
 * checkout of ccir-methodology, and is committed like any other page change.
 *
 * Shape the page relies on (pinned by tests/test_methodology_public.py in the
 * notebooks repo): one `# Title` line, one standfirst paragraph, then `##`
 * headings that start with a section number (`01`, `01a`, ...).
 *
 * Pipeline: Astro's own remark/rehype processor (@astrojs/markdown-remark,
 * a dependency of astro), with smartypants and syntax highlighting off so the
 * text renders verbatim, plus two small plugins:
 *   - remark: split the section number off each `##` heading into
 *     `<span class="n">01</span>`, the treatment the hand-written page used.
 *   - rehype: wrap each heading and its content in `<section class="sec">`,
 *     and give `<pre>` the `grammar` class.
 */
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { visit } from 'unist-util-visit';

const NUMBERED = /^(\d{2}[a-z]?)\s+(.+)$/;

/** remark: `## 01 Title` -> h2 with a numbered span. */
function remarkNumberedHeadings() {
  return (tree) => {
    visit(tree, 'heading', (node) => {
      if (node.depth !== 2 || !node.children.length) return;
      const first = node.children[0];
      if (first.type !== 'text') return;
      const m = NUMBERED.exec(first.value);
      if (!m) return;
      node.children = [
        { type: 'html', value: `<span class="n">${m[1]}</span>` },
        { type: 'text', value: ` ${m[2]}` },
        ...node.children.slice(1),
      ];
    });
  };
}

/** rehype: wrap h2 + following siblings into <section class="sec">. */
function rehypeSectionize() {
  return (tree) => {
    const out = [];
    let section = null;
    for (const node of tree.children) {
      if (node.type === 'element' && node.tagName === 'h2') {
        section = { type: 'element', tagName: 'section', properties: { className: ['sec'] }, children: [node] };
        out.push(section);
      } else if (section) {
        section.children.push(node);
      } else {
        out.push(node);
      }
    }
    tree.children = out;
    visit(tree, 'element', (node) => {
      if (node.tagName === 'pre') {
        node.properties.className = [...(node.properties.className ?? []), 'grammar'];
      }
    });
  };
}

let processorPromise;
function processor() {
  processorPromise ??= createMarkdownProcessor({
    smartypants: false,
    syntaxHighlight: false,
    remarkPlugins: [remarkNumberedHeadings],
    rehypePlugins: [rehypeSectionize],
  });
  return processorPromise;
}

/**
 * Split the markdown into its parts and render each.
 * @param {string} raw the markdown file
 * @returns {Promise<{title: string, standfirst: string, body: string}>} HTML strings
 */
export async function renderMethodology(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  const titleMatch = /^# (.+)$/m.exec(text);
  const title = titleMatch ? titleMatch[1].trim() : 'Methodology';
  const afterTitle = titleMatch ? text.slice(titleMatch.index + titleMatch[0].length) : text;
  const cut = afterTitle.search(/^## /m);
  const standfirstMd = (cut >= 0 ? afterTitle.slice(0, cut) : afterTitle).trim();
  const bodyMd = cut >= 0 ? afterTitle.slice(cut) : '';
  const p = await processor();
  const standfirst = (await p.render(standfirstMd)).code
    .replace(/^<p>/, '<p class="standfirst">')
    .trim();
  const body = (await p.render(bodyMd)).code;
  return { title, standfirst, body };
}
