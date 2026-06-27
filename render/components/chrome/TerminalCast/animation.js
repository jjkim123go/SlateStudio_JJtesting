/*
 * TerminalCast — animation contract
 * Provenance: proposal §3.8. Size M.
 * Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START,
 *   SCENE_DURATION, SCENE_PROPS, document, window.
 *
 * DOM-SAFETY: all command rows, prompts, badges, and output lines are
 * constructed ONCE during synchronous setup that runs at module-eval time
 * (before any tween fires). The subsequent per-command tweens only mutate
 * textContent, opacity, transform, style, and data-* attributes on existing
 * nodes. No appendChild/createElement calls happen inside any onUpdate.
 *
 * Class prefix: tc-. All island IDs suffix '-' + SCENE_ID. zoomMoments are
 * keyed by String(commandIndex) — never coerced via Number(...).
 */

var __tcScope = '.scene-' + SCENE_ID + ' ';
var __tcRoot  = document.querySelector(__tcScope + '.tc-root');
if (__tcRoot) (function () {

  function tcIsPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }
  function tcReadIsland(idSuffix) {
    // idSuffix matches the canonical contract: tc-<descriptor>-<SCENE_ID>
    var el = document.getElementById('tc-' + idSuffix + '-' + SCENE_ID);
    if (!el) return null;
    var raw = (el.textContent || '').trim();
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function tcClamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  // ── Theme palette ────────────────────────────────────────────────────────
  var THEMES = {
    powershell: { bg:'#012456', fg:'#f0f0f0', accent:'#4cc2ff', out:'#e8e8e8', tb:'rgba(0,0,0,0.30)' },
    bash:       { bg:'#1e1e1e', fg:'#d4d4d4', accent:'#c586c0', out:'#cccccc', tb:'rgba(0,0,0,0.45)' },
    cloudshell: { bg:'#003a4d', fg:'#e8f4f8', accent:'#00bcf2', out:'#d8ecf2', tb:'rgba(0,0,0,0.32)' },
    python:     { bg:'#1e2a3a', fg:'#e6e6e6', accent:'#ffd43b', out:'#c8d6e5', tb:'rgba(0,0,0,0.35)' }
  };
  var themeAttr = (__tcRoot.getAttribute('data-shell-theme') || '').toLowerCase();
  if (tcIsPlaceholder(themeAttr) || !THEMES[themeAttr]) themeAttr = 'powershell';
  var theme = THEMES[themeAttr];
  __tcRoot.style.setProperty('--tc-bg', theme.bg);
  __tcRoot.style.setProperty('--tc-fg', theme.fg);
  __tcRoot.style.setProperty('--tc-accent', theme.accent);
  __tcRoot.style.setProperty('--tc-out', theme.out);
  __tcRoot.style.setProperty('--tc-titlebar', theme.tb);

  // Scrub placeholder title text if SCF didn't set it.
  var titleEl = __tcRoot.querySelector('.tc-title');
  if (titleEl) {
    var tt = (titleEl.textContent || '').trim();
    if (!tt || tt.indexOf('{{') === 0) titleEl.textContent = '';
  }

  // ── Session branding (optional thin top strip) ───────────────────────────
  var brand = tcReadIsland('branding');
  var brandEl = __tcRoot.querySelector('.tc-branding');
  var hasBranding = false;
  if (brand && typeof brand === 'object' && brand.event && String(brand.event).trim()) {
    hasBranding = true;
    if (brandEl) {
      brandEl.textContent = String(brand.event);
      var accentColor = brand.accentColor;
      if (accentColor && typeof accentColor === 'string' && accentColor.trim() && !tcIsPlaceholder(accentColor)) {
        brandEl.style.background = accentColor.trim();
      }
    }
    __tcRoot.setAttribute('data-has-branding', '1');
  } else if (brandEl) {
    brandEl.setAttribute('data-empty', '1');
  }

  // ── Speaker note (resolve presence from already-templated text) ──────────
  var speakerEl = __tcRoot.querySelector('.tc-speaker');
  var hasSpeaker = false;
  if (speakerEl) {
    var sNote = (speakerEl.textContent || '').trim();
    if (!sNote || sNote.indexOf('{{') === 0) {
      speakerEl.setAttribute('data-empty', '1');
      speakerEl.textContent = '';
    } else {
      hasSpeaker = true;
    }
  }

  // ── Commands: read, validate, build DOM once ─────────────────────────────
  var cmds = tcReadIsland('commands');
  if (!Array.isArray(cmds)) cmds = [];
  var safeCmds = [];
  for (var i = 0; i < cmds.length; i++) {
    var c = cmds[i];
    if (!c || typeof c !== 'object') continue;
    var cmdStr = (c.cmd === undefined || c.cmd === null) ? '' : String(c.cmd);
    var promptStr = (c.prompt === undefined || c.prompt === null) ? '' : String(c.prompt);
    var outRaw = c.output;
    var outArr = [];
    if (Array.isArray(outRaw)) {
      for (var oi = 0; oi < outRaw.length; oi++) {
        var ln = outRaw[oi];
        if (ln === undefined || ln === null) continue;
        outArr.push(String(ln));
      }
    }
    var hold = c.narrationSec;
    if (typeof hold !== 'number' || !isFinite(hold) || hold <= 0) hold = 2.5;
    var badgeStr = (c.badge === undefined || c.badge === null) ? '' : String(c.badge).trim();
    var focusStr = (c.focus === 'out') ? 'out' : 'cmd';
    safeCmds.push({
      prompt: promptStr,
      cmd:    cmdStr,
      output: outArr,
      hold:   hold,
      badge:  badgeStr,
      focus:  focusStr
    });
  }

  // ── Zoom moments → string-keyed lookup map (no Number() coercion) ───────
  var zoomRaw = tcReadIsland('zooms');
  if (!Array.isArray(zoomRaw)) zoomRaw = [];
  var zoomMap = {};
  for (var zi = 0; zi < zoomRaw.length; zi++) {
    var z = zoomRaw[zi];
    if (!z || typeof z !== 'object') continue;
    var ci = z.commandIndex;
    if (typeof ci !== 'number' || !isFinite(ci) || Math.floor(ci) !== ci) continue;
    if (ci < 0 || ci >= safeCmds.length) continue;
    var sc = z.scale;
    if (typeof sc !== 'number' || !isFinite(sc)) continue;
    sc = tcClamp(sc, 1.0, 2.0);
    if (sc <= 1.0001) continue;
    zoomMap[String(ci)] = sc;
  }

  var stack = __tcRoot.querySelector('.tc-stack');
  var pane  = __tcRoot.querySelector('.tc-pane');
  // BUILD DOM ONCE — no DOM mutation inside any tween onUpdate after this.
  var rowRefs = [];
  if (stack) {
    for (var k = 0; k < safeCmds.length; k++) {
      var sc2 = safeCmds[k];
      var row = document.createElement('div');
      row.className = 'tc-row';
      row.setAttribute('data-cmd-index', String(k));
      row.setAttribute('data-focus', sc2.focus);
      row.setAttribute('data-active', '0');

      var line = document.createElement('div');
      line.className = 'tc-line';
      var pSpan = document.createElement('span');
      pSpan.className = 'tc-prompt';
      pSpan.textContent = sc2.prompt;
      var cSpan = document.createElement('span');
      cSpan.className = 'tc-cmd';
      cSpan.setAttribute('data-full', sc2.cmd);
      cSpan.textContent = sc2.cmd;
      cSpan.style.display = 'inline-block';
      cSpan.style.verticalAlign = 'bottom';
      cSpan.style.clipPath = 'inset(0 100% 0 0)';
      cSpan.style.webkitClipPath = 'inset(0 100% 0 0)';
      var caret = document.createElement('span');
      caret.className = 'tc-caret';
      caret.setAttribute('data-on', '0');
      var bSpan = document.createElement('span');
      bSpan.className = 'tc-badge';
      if (sc2.badge) {
        bSpan.textContent = sc2.badge;
      } else {
        bSpan.setAttribute('data-empty', '1');
      }
      line.appendChild(pSpan);
      line.appendChild(cSpan);
      line.appendChild(caret);
      line.appendChild(bSpan);

      var outWrap = document.createElement('div');
      outWrap.className = 'tc-output';
      var outLineRefs = [];
      for (var oj = 0; oj < sc2.output.length; oj++) {
        var ol = document.createElement('div');
        ol.className = 'tc-out-line';
        ol.textContent = sc2.output[oj];
        outWrap.appendChild(ol);
        outLineRefs.push(ol);
      }

      row.appendChild(line);
      row.appendChild(outWrap);
      stack.appendChild(row);

      rowRefs.push({
        row: row, prompt: pSpan, cmd: cSpan, caret: caret,
        badge: bSpan, output: outLineRefs, spec: sc2
      });
    }
  }

  // ── Timeline ─────────────────────────────────────────────────────────────
  var dur = (typeof SCENE_DURATION === 'number' && SCENE_DURATION > 0) ? SCENE_DURATION : 6;
  var fadeMargin = 0.5;

  // Window slides down + fades in
  master.fromTo(__tcScope + '.tc-window',
    { opacity: 0, y: -16, scale: 0.985 },
    { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' },
    SCENE_START + 0.10);

  // Branding strip wipes right
  if (hasBranding) {
    master.fromTo(__tcScope + '.tc-branding',
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 0.55, ease: 'power3.out' },
      SCENE_START + 0.05);
  }

  // Per-command timeline
  var cursor = SCENE_START + 0.75;
  var speakerReserve = hasSpeaker ? 1.2 : 0;
  var hardEnd = SCENE_START + dur - fadeMargin - speakerReserve;
  var lastPlayedIndex = -1;

  for (var ri = 0; ri < rowRefs.length; ri++) {
    if (cursor >= hardEnd) break;
    var R = rowRefs[ri];
    lastPlayedIndex = ri;

    // Activate row (visual focus highlight) — closure captures current refs.
    (function (row, prevRow) {
      master.call(function () {
        if (prevRow) prevRow.setAttribute('data-active', '0');
        row.setAttribute('data-active', '1');
      }, null, cursor);
    })(R.row, ri > 0 ? rowRefs[ri - 1].row : null);

    // 1. Prompt fade in (0.3s)
    if (R.prompt && R.spec.prompt) {
      master.fromTo(R.prompt,
        { opacity: 0, x: -4 },
        { opacity: 1, x: 0, duration: 0.30, ease: 'power2.out' },
        cursor);
    } else if (R.prompt) {
      master.set(R.prompt, { opacity: 1 }, cursor);
    }
    cursor += 0.30;

    // 2. Cmd type-in — duration scales gently with length
    var fullCmd = R.spec.cmd || '';
    var typeDur = Math.min(1.4, Math.max(0.30, 0.30 + fullCmd.length * 0.022));
    if (R.caret) {
      (function (c) {
        master.call(function () { c.setAttribute('data-on', '1'); }, null, cursor);
      })(R.caret);
    }
    if (fullCmd.length > 0) {
      master.fromTo(R.cmd,
        { clipPath: 'inset(0 100% 0 0)', webkitClipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', webkitClipPath: 'inset(0 0% 0 0)',
          duration: typeDur, ease: 'none' },
        cursor);
    }
    cursor += typeDur;

    // 3. Badge pop (slight overlap with end of typing)
    if (R.badge && R.badge.getAttribute('data-empty') !== '1') {
      master.fromTo(R.badge,
        { opacity: 0, scale: 0.6, transformOrigin: 'right center' },
        { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.8)' },
        Math.max(SCENE_START, cursor - 0.18));
    }

    // 4. Output reveal staggered (0.08s per line)
    if (R.output.length > 0) {
      master.fromTo(R.output,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.30, ease: 'power2.out',
          stagger: 0.08 },
        cursor + 0.05);
      cursor += 0.05 + 0.30 + R.output.length * 0.08;
    }

    // 5. Hold + optional zoom
    var holdEnd = cursor + R.spec.hold;
    if (holdEnd > hardEnd) holdEnd = hardEnd;
    var thisHold = Math.max(0.1, holdEnd - cursor);
    var zKey = String(ri);
    if (Object.prototype.hasOwnProperty.call(zoomMap, zKey) && pane) {
      var targetScale = zoomMap[zKey];
      // Compute origin ONCE from current layout (no onUpdate DOM reads).
      var paneRect = pane.getBoundingClientRect();
      var rowRect  = R.row.getBoundingClientRect();
      var originY = 50;
      if (paneRect.height > 0) {
        var offset = (rowRect.top + rowRect.height / 2) - paneRect.top;
        originY = tcClamp((offset / paneRect.height) * 100, 10, 90);
      }
      // Set transform-origin via a master.call so it lands at the right time
      // even on re-seek; safer than mutating style up front.
      (function (p, oy) {
        master.call(function () { p.style.transformOrigin = '50% ' + oy + '%'; }, null, cursor);
      })(pane, originY);
      var zoomIn  = Math.min(0.6, thisHold * 0.35);
      var zoomOut = Math.min(0.6, thisHold * 0.35);
      master.to(pane,
        { scale: targetScale, duration: zoomIn, ease: 'power2.inOut' },
        cursor);
      master.to(pane,
        { scale: 1.0, duration: zoomOut, ease: 'power2.inOut' },
        holdEnd - zoomOut);
    }

    // Caret off at end of hold
    (function (c) {
      master.call(function () { c.setAttribute('data-on', '0'); }, null, holdEnd);
    })(R.caret);

    cursor = holdEnd;
  }

  // Final row deactivate
  if (lastPlayedIndex >= 0) {
    var lastRow = rowRefs[lastPlayedIndex];
    if (lastRow) {
      (function (row) {
        master.call(function () { row.setAttribute('data-active', '0'); }, null, cursor);
      })(lastRow.row);
    }
  }

  // Speaker note slide-up for last 1.2s (if any)
  if (hasSpeaker) {
    master.fromTo(__tcScope + '.tc-speaker',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' },
      SCENE_START + dur - 1.20);
  }

  // Exit fade
  master.to(__tcScope + '.tc-root',
    { opacity: 0, duration: fadeMargin, ease: 'power2.in' },
    SCENE_START + dur - fadeMargin);

})();
