// Prefixes every CSS selector inside <style> blocks with `.scene-{{sceneId}} `.
// Preserves @keyframes, @media, @supports, @font-face wrappers (their inner rules
// are still prefixed). Splits comma-separated selectors.

import { readFileSync, writeFileSync } from 'fs';

const PREFIX = '.scene-{{sceneId}} ';

function prefixSelectorList(selList) {
  return selList
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => PREFIX + s)
    .join(', ');
}

// Parse CSS body into rules, prefixing selectors. Handles nested @-rules at one level.
function prefixCss(css) {
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    // skip whitespace, copy as-is
    const wsStart = i;
    while (i < n && /\s/.test(css[i])) i++;
    out += css.slice(wsStart, i);
    if (i >= n) break;

    // comment
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) { out += css.slice(i); break; }
      out += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    // @-rule
    if (css[i] === '@') {
      // read until { or ;
      let j = i;
      while (j < n && css[j] !== '{' && css[j] !== ';') j++;
      if (j >= n) { out += css.slice(i); break; }
      const head = css.slice(i, j);
      if (css[j] === ';') {
        // simple at-rule (e.g. @import, @charset)
        out += head + ';';
        i = j + 1;
        continue;
      }
      // block at-rule: @media / @keyframes / @supports / @font-face
      const headTrim = head.trim();
      const isKeyframes = /^@(-\w+-)?keyframes\b/i.test(headTrim);
      const isFontFace = /^@font-face\b/i.test(headTrim);
      const isPage = /^@page\b/i.test(headTrim);
      // find matching brace
      let depth = 1;
      let k = j + 1;
      while (k < n && depth > 0) {
        if (css[k] === '{') depth++;
        else if (css[k] === '}') depth--;
        if (depth === 0) break;
        k++;
      }
      const bodyStart = j + 1;
      const bodyEnd = k;
      const inner = css.slice(bodyStart, bodyEnd);
      let processedInner;
      if (isKeyframes || isFontFace || isPage) {
        // Don't prefix inside keyframes (selectors are like 0%, 100%, from, to)
        // or @font-face (no selectors), or @page.
        processedInner = inner;
      } else {
        // @media / @supports etc — recurse to prefix inner rules
        processedInner = prefixCss(inner);
      }
      out += head + '{' + processedInner + '}';
      i = bodyEnd + 1;
      continue;
    }

    // regular rule: selector { ... }
    let j = i;
    while (j < n && css[j] !== '{' && css[j] !== '}') j++;
    if (j >= n || css[j] === '}') {
      out += css.slice(i, j);
      i = j;
      continue;
    }
    const selectors = css.slice(i, j);
    // find closing brace (no nesting in plain CSS)
    let k = j + 1;
    let depth = 1;
    while (k < n && depth > 0) {
      if (css[k] === '{') depth++;
      else if (css[k] === '}') depth--;
      if (depth === 0) break;
      k++;
    }
    const body = css.slice(j + 1, k);
    out += prefixSelectorList(selectors) + ' {' + body + '}';
    i = k + 1;
  }
  return out;
}

function processFile(path) {
  const src = readFileSync(path, 'utf-8');
  const re = /<style>([\s\S]*?)<\/style>/;
  const m = src.match(re);
  if (!m) {
    console.error(`No <style> block in ${path}`);
    return;
  }
  const original = m[1];
  // Idempotency: bail if already scoped
  if (original.includes('.scene-{{sceneId}}')) {
    console.log(`Already scoped, skipping: ${path}`);
    return;
  }
  const scoped = prefixCss(original);
  const out = src.replace(re, '<style>' + scoped + '</style>');
  writeFileSync(path, out, 'utf-8');
  console.log(`Scoped: ${path}`);
}

const files = process.argv.slice(2);
for (const f of files) processFile(f);
