/*
 * TerminologyCard — animation contract
 * Provenance: proposal §3.7. Size S (~6s default).
 * Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START,
 *   SCENE_DURATION, SCENE_PROPS, document, window.
 *
 * DOM-SAFETY: chips are constructed ONCE inside synchronous setup that runs
 * before any tween. After construction, animations only mutate opacity,
 * transform, and filter on existing nodes. No appendChild inside onUpdate.
 *
 * Class prefix: tm-. All island IDs suffix '-' + SCENE_ID.
 */

var __tmScope = '.scene-' + SCENE_ID + ' ';
var __tmRoot  = document.querySelector(__tmScope + '.tm-root');
if (__tmRoot) (function () {

  function tmIsPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }
  function tmReadIsland(idSuffix) {
    // idSuffix matches the canonical contract: tm-<descriptor>-<SCENE_ID>
    var el = document.getElementById('tm-' + idSuffix + '-' + SCENE_ID);
    if (!el) return null;
    var raw = (el.textContent || '').trim();
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function tmTextOf(sel) {
    var n = __tmRoot.querySelector(sel);
    return n ? (n.textContent || '').trim() : '';
  }

  // ── Resolve presence flags & hide empties ────────────────────────────────
  var iconAttr = __tmRoot.getAttribute('data-has-icon') || '';
  var hasIcon  = !tmIsPlaceholder(iconAttr) && iconAttr.trim().length > 0;
  __tmRoot.setAttribute('data-has-icon', hasIcon ? '1' : '0');
  var iconWrap = __tmRoot.querySelector('.tm-icon-wrap');
  if (iconWrap && !hasIcon) iconWrap.setAttribute('data-empty', '1');

  var pron = __tmRoot.querySelector('.tm-pron');
  if (pron) {
    var pronText = (pron.textContent || '').trim();
    if (!pronText || pronText.indexOf('{{') === 0) {
      pron.setAttribute('data-empty', '1');
      pron.textContent = '';
    }
  }

  var analogy = __tmRoot.querySelector('.tm-analogy');
  var analogyText = tmTextOf('.tm-analogy-text');
  var hasAnalogy  = analogyText.length > 0 && analogyText.indexOf('{{') !== 0;
  if (analogy && !hasAnalogy) analogy.setAttribute('data-empty', '1');

  var example = __tmRoot.querySelector('.tm-example');
  var exampleText = (example ? (example.textContent || '') : '').trim();
  var hasExample = exampleText.length > 0 && exampleText.indexOf('{{') !== 0;
  if (example && !hasExample) {
    example.setAttribute('data-empty', '1');
    example.textContent = '';
  }

  // Definition: if blank/placeholder, hide so card collapses cleanly.
  var def = __tmRoot.querySelector('.tm-definition');
  if (def) {
    var defText = (def.textContent || '').trim();
    if (!defText || defText.indexOf('{{') === 0) {
      def.style.display = 'none';
      def.textContent = '';
    }
  }

  // Term: if blank/placeholder, clear so we don't render '{{term}}' literally.
  var termEl = __tmRoot.querySelector('.tm-term');
  if (termEl) {
    var tt = (termEl.textContent || '').trim();
    if (!tt || tt.indexOf('{{') === 0) termEl.textContent = '';
  }

  // ── Chip construction (BEFORE any tween touches them) ────────────────────
  var chipsContainer = __tmRoot.querySelector('.tm-chips');
  var chipsPrefix    = __tmRoot.querySelector('.tm-chips-prefix');
  var dnc = tmReadIsland('doNotConfuse');
  if (!Array.isArray(dnc)) dnc = [];
  var chipEntries = [];
  for (var i = 0; i < dnc.length; i++) {
    var item = dnc[i];
    if (!item || typeof item !== 'object') continue;
    var label = item.label;
    if (label === undefined || label === null || String(label).trim() === '') continue;
    chipEntries.push({
      label: String(label),
      why: (item.why === undefined || item.why === null) ? '' : String(item.why)
    });
  }
  var hasChips = chipEntries.length > 0;
  if (chipsContainer && !hasChips) chipsContainer.setAttribute('data-empty', '1');
  if (chipsContainer && hasChips) {
    for (var j = 0; j < chipEntries.length; j++) {
      var c = chipEntries[j];
      var chip = document.createElement('span');
      chip.className = 'tm-chip';
      var x = document.createElement('span');
      x.className = 'tm-chip-x';
      x.textContent = '\u2715';
      var lbl = document.createElement('span');
      lbl.className = 'tm-chip-label';
      lbl.textContent = c.label;
      chip.appendChild(x);
      chip.appendChild(lbl);
      if (c.why) {
        var why = document.createElement('span');
        why.className = 'tm-chip-why';
        why.textContent = '\u2014 ' + c.why;
        chip.appendChild(why);
      }
      chipsContainer.appendChild(chip);
    }
  }

  // ── Timeline (~6s default; clamp to scene duration) ──────────────────────
  var dur = (typeof SCENE_DURATION === 'number' && SCENE_DURATION > 0) ? SCENE_DURATION : 6;
  var fadeMargin = 0.4;

  // 1. Term reveal (0.0–0.4s)
  master.fromTo(__tmScope + '.tm-term',
    { opacity: 0, filter: 'blur(8px)', y: 6 },
    { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.45, ease: 'power2.out' },
    SCENE_START + 0.05);

  // Pronunciation fades in just after term begins (only if present)
  if (pron && pron.getAttribute('data-empty') !== '1') {
    master.fromTo(__tmScope + '.tm-pron',
      { opacity: 0, x: -6 },
      { opacity: 0.85, x: 0, duration: 0.4, ease: 'power2.out' },
      SCENE_START + 0.30);
  }

  // 2. Definition (0.4–1.4s)
  if (def && def.style.display !== 'none') {
    master.fromTo(__tmScope + '.tm-definition',
      { opacity: 0, y: 24, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'power3.out' },
      SCENE_START + 0.55);
  }

  // 3. Analogy (1.4–2.4s) — slide from right
  if (hasAnalogy) {
    master.fromTo(__tmScope + '.tm-analogy',
      { opacity: 0, x: 80 },
      { opacity: 1, x: 0, duration: 0.75, ease: 'power3.out' },
      SCENE_START + 1.45);
  }

  // 4. Example (2.4–3.4s)
  if (hasExample) {
    master.fromTo(__tmScope + '.tm-example',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      SCENE_START + 2.45);
  }

  // 5. Chips stagger (3.4s onwards)
  if (hasChips) {
    if (chipsPrefix) {
      master.fromTo(__tmScope + '.tm-chips-prefix',
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power2.out' },
        SCENE_START + 3.40);
    }
    var chipsAvailable = Math.max(0.6, dur - 3.50 - fadeMargin);
    var staggerStep = Math.min(0.10, chipsAvailable / Math.max(1, chipEntries.length));
    master.fromTo(__tmScope + '.tm-chip',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out',
        stagger: staggerStep },
      SCENE_START + 3.55);
  }

  // 6. Exit fade — last 0.4s
  master.to(__tmScope + '.tm-root',
    { opacity: 0, duration: fadeMargin, ease: 'power2.in' },
    SCENE_START + dur - fadeMargin);

})();
