/*
 * Quiz — Single-answer quiz card with option reveal animation.
 *
 * PR 6 Lane C: mode:"single" ONLY. mode:"multi" is rejected (falls back to
 * single). If correctOptionId doesn't match any options[].id, the reveal
 * animation is skipped (question + options still render).
 *
 * DOM-SAFETY: All option cards, checkmarks, and explanation content are built
 * ONCE inside a master.call() block. Subsequent animations only mutate
 * opacity, transform, borderColor — never rebuild DOM in onUpdate.
 *
 * ID CONTRACT: SVG checkmark ids suffix SCENE_ID. Option ids are strings —
 * never coerced via Number(). String-keyed lookup via plain object.
 *
 * Globals: master, SCENE_ID, SCENE_START, SCENE_DURATION, gsap, document
 */
(function () {
  var S = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(S + '.qz-root');
  if (!root) return;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // ── Helpers ─────────────────────────────────────────────────────────────

  function parseIsland(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var raw = el.textContent.trim();
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try { return JSON.parse(raw); } catch (_e) { return null; }
  }

  function isPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }

  // ── Parse props ─────────────────────────────────────────────────────────

  var options = parseIsland('qz-options-' + SCENE_ID);
  var scoreBadge = parseIsland('qz-score-' + SCENE_ID);

  if (!Array.isArray(options) || options.length === 0) return;

  var correctIdAttr = root.getAttribute('data-correct-option-id') || '';
  var correctId = isPlaceholder(correctIdAttr) ? '' : correctIdAttr;

  var modeAttr = root.getAttribute('data-mode') || '';
  if (!isPlaceholder(modeAttr) && modeAttr === 'multi') {
    console.warn('[Quiz] mode:"multi" is not supported in PR 6. Using "single".');
  }

  var revealRaw = root.getAttribute('data-reveal-sec');
  var revealSec = isPlaceholder(revealRaw) ? 4.0 : parseFloat(revealRaw);
  if (!isFinite(revealSec) || revealSec < 0) revealSec = 4.0;

  // String-keyed lookup — IDs are NEVER coerced to number
  var optionMap = {};
  for (var oi = 0; oi < options.length; oi++) {
    var opt = options[oi];
    if (opt && typeof opt.id !== 'undefined' && opt.id !== null) {
      optionMap[String(opt.id)] = opt;
    }
  }

  var correctMatch = correctId !== '' && optionMap.hasOwnProperty(correctId);
  if (!correctMatch && correctId !== '') {
    console.warn(
      '[Quiz] correctOptionId "' + correctId +
      '" does not match any options[].id — reveal animation skipped.'
    );
  }

  // Pre-check teacher note (text injected by Mustache at compile time)
  var teacherEl = root.querySelector('.qz-teacher-note');
  var hasTeacher = teacherEl && teacherEl.textContent.trim().length > 0;

  // Pre-check score badge validity
  var hasBadge = scoreBadge && typeof scoreBadge === 'object' &&
    typeof scoreBadge.current !== 'undefined' &&
    typeof scoreBadge.total !== 'undefined';

  var endTime = SCENE_START + SCENE_DURATION;

  // ── 1. Question slide in (0.0–0.6s) — pre-existing element ─────────────

  master.fromTo(S + '.qz-question',
    { opacity: 0, y: -40 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
    SCENE_START + 0.0);

  // ── 2. Build dynamic DOM + schedule its animations ──────────────────────

  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  master.call(function () {
    var container = root.querySelector('.qz-options');
    if (!container) return;

    var optionEls = [];

    // ── Build option cards ────────────────────────────────────────────────

    for (var i = 0; i < options.length; i++) {
      var o = options[i];
      if (!o || typeof o !== 'object') continue;

      var id = (typeof o.id !== 'undefined' && o.id !== null) ? String(o.id) : '';
      var label = (typeof o.label === 'string') ? o.label : String(o.label || '');

      var card = document.createElement('div');
      card.className = 'qz-option';
      card.setAttribute('data-option-id', id);

      // Letter badge
      var letterEl = document.createElement('div');
      letterEl.className = 'qz-option-letter';
      letterEl.textContent = LETTERS[i] || String(i + 1);
      card.appendChild(letterEl);

      // Label text
      var labelEl = document.createElement('div');
      labelEl.className = 'qz-option-label';
      labelEl.textContent = label;
      card.appendChild(labelEl);

      // Accent ring (pre-built, starts hidden)
      var ring = document.createElement('div');
      ring.className = 'qz-option-ring';
      card.appendChild(ring);

      // Checkmark badge (pre-built, starts at scale:0 + opacity:0)
      var check = document.createElement('div');
      check.className = 'qz-checkmark';
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('id', 'qz-chk-' + i + '-' + SCENE_ID);
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', 'M5 13l4 4L19 7');
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
      check.appendChild(svg);
      card.appendChild(check);

      container.appendChild(card);
      optionEls.push({ el: card, id: id, option: o });
    }

    // ── Options cascade animation (0.6–1.6s, 0.15s stagger) ──────────────

    for (var ci = 0; ci < optionEls.length; ci++) {
      master.fromTo(optionEls[ci].el,
        { opacity: 0, x: -60 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' },
        SCENE_START + 0.6 + ci * 0.15);
    }

    // ── Reveal at revealAnswerAtSec ───────────────────────────────────────

    if (correctMatch) {
      for (var ri = 0; ri < optionEls.length; ri++) {
        var entry = optionEls[ri];
        if (entry.id !== correctId) {
          // Dim incorrect options
          master.to(entry.el,
            { opacity: 0.5, duration: 0.4, ease: 'power2.out' },
            SCENE_START + revealSec);
        } else {
          // Correct option — accent ring
          var rRing = entry.el.querySelector('.qz-option-ring');
          if (rRing) {
            master.to(rRing,
              { opacity: 1, duration: 0.4, ease: 'power2.out' },
              SCENE_START + revealSec);
          }
          // Correct option — checkmark badge
          var rCheck = entry.el.querySelector('.qz-checkmark');
          if (rCheck) {
            master.to(rCheck,
              { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' },
              SCENE_START + revealSec + 0.15);
          }
          // Green border
          master.to(entry.el,
            { borderColor: 'rgba(34, 197, 94, 0.6)', duration: 0.3, ease: 'power2.out' },
            SCENE_START + revealSec);
        }
      }

      // Explanation card-flip for correct answer
      var correctOpt = optionMap[correctId];
      if (correctOpt && typeof correctOpt.explanation === 'string' && correctOpt.explanation) {
        var explInner = root.querySelector('.qz-explanation-inner');
        if (explInner) {
          explInner.textContent = correctOpt.explanation;
          master.to(S + '.qz-explanation',
            { opacity: 1, duration: 0.3, ease: 'power2.out' },
            SCENE_START + revealSec + 0.3);
          master.fromTo(S + '.qz-explanation-inner',
            { rotateY: 90 },
            { rotateY: 0, duration: 0.5, ease: 'power2.out' },
            SCENE_START + revealSec + 0.3);
        }
      }
    }

    // ── Score badge text ──────────────────────────────────────────────────

    if (hasBadge) {
      var badgeEl = root.querySelector('.qz-score-badge');
      if (badgeEl) {
        badgeEl.textContent = scoreBadge.current + ' / ' + scoreBadge.total;
      }
    }
  }, null, SCENE_START);

  // ── 3. Teacher note fade in (final 1.0s) — pre-existing element ─────────

  if (hasTeacher) {
    master.to(S + '.qz-teacher-note',
      { opacity: 1, duration: 0.5, ease: 'power2.out' },
      endTime - 1.0);
  }

  // ── 4. Score badge pop (final 1.0s) ─────────────────────────────────────

  if (hasBadge) {
    master.fromTo(S + '.qz-score-badge',
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' },
      endTime - 1.0);
  }

  // ── 5. Exit fade (CONTRACT §7 ≥ 0.3s margin) ───────────────────────────

  master.to(S + '.qz-root',
    { opacity: 0, duration: 0.4, ease: 'power2.in' },
    endTime - 0.4);
})();
