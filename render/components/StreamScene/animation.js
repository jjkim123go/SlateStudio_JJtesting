/*
 * StreamScene — animation contract (Wave A + Wave B, PR 8a)
 * Provenance: Wave 0 brief + PR 8a critique + Wave B brief.
 * Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START,
 *   SCENE_DURATION, SCENE_PROPS, document, window.
 *
 * RULE #7 (DOM-SAFETY): all chapter markers, transcript segments, transcript
 *   word spans, caption word spans, chapter rows, search shell, video element,
 *   cursor, dim and chapter-title overlays are constructed ONCE during
 *   synchronous setup that runs at module-eval time (before any tween fires).
 *   All subsequent timeline events (master.set / master.to / master.call) only
 *   mutate textContent, opacity, transform, classList, and inline style on
 *   existing nodes. NO appendChild / createElement / removeChild calls happen
 *   inside any tween callback or timeline-driven function after setup.
 *
 * RULE #16 (master-timeline registration): every animation is registered on
 *   the injected `master` timeline at deterministic SCENE_START + offset.
 *   No standalone timeline calls. No naked module-scope gsap tweens.
 *
 * Class prefix: stream-. All selectors scoped via '.scene-' + SCENE_ID.
 *
 * VARIANT DISPATCH (Wave B):
 *   playerWithTranscript  — Wave A poster mode (default; back-compat target)
 *   chaptersNavigation    — chapters list + cursor jumps to chapter 3
 *   searchResults         — type "rollout", filter to 4 matches, jump to #2
 *   videoClipMode         — real <video> element instead of synthetic poster
 *
 * Unknown variants throw — fail-closed by design (no silent fallback).
 *
 * Search typewriter implementation note: `<input>` is intentionally NOT used.
 *   The "input" is a styled <div> shell containing a <span class="stream-
 *   search-text"></span>. Letter reveal is driven by 7 stepped `master.call`
 *   events that mutate `textContent` directly (NOT `onUpdate` — banned by
 *   lint, NOT the GSAP `text` plugin — not loaded).
 */

var __streamScope = '.scene-' + SCENE_ID + ' ';
var __streamRoot = document.querySelector(__streamScope + '.stream-root');
if (__streamRoot && typeof master !== 'undefined') (function () {

  // ── Shared utilities ────────────────────────────────────────────────────

  function streamReadIsland(suffix) {
    var el = document.getElementById('stream-' + suffix + '-' + SCENE_ID);
    if (!el) return null;
    var raw = (el.textContent || '').trim();
    if (!raw || raw.indexOf('{{') === 0) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function streamFormatTime(v) {
    var s = Math.max(0, Math.floor(v));
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function streamClampNum(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  // ── Read & validate islands (shared by all variants) ────────────────────
  var chapters = streamReadIsland('chapters');
  if (!Array.isArray(chapters)) chapters = [];

  var speakers = streamReadIsland('speakers');
  if (!Array.isArray(speakers)) speakers = [];

  var segments = streamReadIsland('segments');
  if (!Array.isArray(segments)) segments = [];

  var dur = (typeof SCENE_DURATION === 'number' && SCENE_DURATION > 0) ? SCENE_DURATION : 12;
  var fadeMargin = 0.4;

  var speakerById = {};
  for (var si = 0; si < speakers.length; si++) {
    var sp = speakers[si];
    if (sp && typeof sp === 'object' && sp.id) {
      speakerById[String(sp.id)] = {
        name: String(sp.name || sp.id),
        color: (typeof sp.color === 'string' && sp.color) ? sp.color : '#605E5C'
      };
    }
  }

  // ── Shared DOM builders (used by 2+ variants) ───────────────────────────

  function buildChapterMarkers() {
    var markersHost = __streamRoot.querySelector('.stream-chapter-markers');
    if (!markersHost) return;
    for (var ci = 0; ci < chapters.length; ci++) {
      var ch = chapters[ci];
      if (!ch || typeof ch !== 'object') continue;
      var startSec = (typeof ch.startSec === 'number' && isFinite(ch.startSec)) ? ch.startSec : 0;
      var pct = streamClampNum((startSec / dur) * 100, 0, 99);
      var mEl = document.createElement('div');
      mEl.className = 'stream-chapter-mark';
      mEl.style.left = pct + '%';
      mEl.setAttribute('data-chapter-title', String(ch.title || ''));
      markersHost.appendChild(mEl);
    }
  }

  // Build transcript segments + caption lines + per-segment offset table.
  // Returns { segmentRefs, segOffsets, transcriptInner, captionsHost }.
  // markRollout=true wraps any "rollout" word in a <span class="stream-search-hl">.
  function buildTranscriptAndCaptions(markRollout) {
    var transcriptInner = __streamRoot.querySelector('.stream-transcript-inner');
    var captionsHost = __streamRoot.querySelector('.stream-captions');

    var visibleSegs = [];
    for (var vi = 0; vi < segments.length && visibleSegs.length < 7; vi++) {
      var seg = segments[vi];
      if (!seg || typeof seg !== 'object') continue;
      if (!Array.isArray(seg.words)) continue;
      visibleSegs.push(seg);
    }

    var segmentRefs = [];

    for (var sg = 0; sg < visibleSegs.length; sg++) {
      var s2 = visibleSegs[sg];
      var sInfo = speakerById[String(s2.speakerId)] || { name: 'Speaker', color: '#605E5C' };

      var segEl = null;
      var wordRefs = [];
      var hlWordEls = [];
      if (transcriptInner) {
        segEl = document.createElement('div');
        segEl.className = 'stream-seg';
        segEl.setAttribute('data-seg-id', String(s2.id || ('seg-' + sg)));
        segEl.setAttribute('data-active', '0');

        var headEl = document.createElement('div');
        headEl.className = 'stream-seg-head';
        var pillEl = document.createElement('span');
        pillEl.className = 'stream-seg-pill';
        pillEl.textContent = sInfo.name;
        pillEl.style.background = sInfo.color;
        var timeEl = document.createElement('span');
        timeEl.className = 'stream-seg-time';
        var startSecSeg = (typeof s2.startSec === 'number' && isFinite(s2.startSec)) ? s2.startSec : 0;
        timeEl.textContent = streamFormatTime(startSecSeg);
        headEl.appendChild(pillEl);
        headEl.appendChild(timeEl);

        var bodyEl = document.createElement('div');
        bodyEl.className = 'stream-seg-body';

        for (var wi = 0; wi < s2.words.length; wi++) {
          var w = s2.words[wi];
          if (!w || typeof w !== 'object') continue;
          var t0 = (typeof w.t0 === 'number' && isFinite(w.t0)) ? w.t0 : 0;
          var t1 = (typeof w.t1 === 'number' && isFinite(w.t1)) ? w.t1 : t0 + 0.2;
          if (t1 <= t0) t1 = t0 + 0.05;
          var wText = (w.w === undefined || w.w === null) ? '' : String(w.w);
          var span = document.createElement('span');
          span.className = 'stream-word';
          if (markRollout && /rollout/i.test(wText)) {
            span.classList.add('stream-search-hl');
            hlWordEls.push(span);
          }
          span.textContent = wText;
          bodyEl.appendChild(span);
          wordRefs.push({ el: span, t0: t0, t1: t1 });
        }

        segEl.appendChild(headEl);
        segEl.appendChild(bodyEl);
        transcriptInner.appendChild(segEl);
      }

      var capLineEl = null;
      var capWordRefs = [];
      if (captionsHost) {
        capLineEl = document.createElement('div');
        capLineEl.className = 'stream-caption-line';
        capLineEl.style.opacity = '0';
        capLineEl.setAttribute('data-cap-seg', String(s2.id || ('seg-' + sg)));
        for (var wj = 0; wj < s2.words.length; wj++) {
          var w2 = s2.words[wj];
          if (!w2 || typeof w2 !== 'object') continue;
          var t02 = (typeof w2.t0 === 'number' && isFinite(w2.t0)) ? w2.t0 : 0;
          var t12 = (typeof w2.t1 === 'number' && isFinite(w2.t1)) ? w2.t1 : t02 + 0.2;
          if (t12 <= t02) t12 = t02 + 0.05;
          var wText2 = (w2.w === undefined || w2.w === null) ? '' : String(w2.w);
          var capSpan = document.createElement('span');
          capSpan.className = 'stream-cap-word';
          capSpan.textContent = wText2;
          capLineEl.appendChild(capSpan);
          capWordRefs.push({ el: capSpan, t0: t02, t1: t12 });
        }
        captionsHost.appendChild(capLineEl);
      }

      var firstT0 = wordRefs.length ? wordRefs[0].t0 : 0;
      var lastT1 = wordRefs.length ? wordRefs[wordRefs.length - 1].t1 : 0;
      segmentRefs.push({
        rootEl: segEl,
        wordRefs: wordRefs,
        capLineEl: capLineEl,
        capWordRefs: capWordRefs,
        firstT0: firstT0,
        lastT1: lastT1,
        hlWordEls: hlWordEls,
        hasMatch: hlWordEls.length > 0
      });
    }

    var segOffsets = [];
    for (var so = 0; so < segmentRefs.length; so++) {
      var r = segmentRefs[so].rootEl;
      segOffsets.push(r ? r.offsetTop : 0);
    }

    return {
      segmentRefs: segmentRefs,
      segOffsets: segOffsets,
      transcriptInner: transcriptInner,
      captionsHost: captionsHost
    };
  }

  // Cursor element (chapters + search). Built once into the root.
  function buildCursor(name, color) {
    var cursor = document.createElement('div');
    cursor.className = 'stream-cursor';
    cursor.setAttribute('data-cursor-name', String(name || ''));

    var arrow = document.createElement('span');
    arrow.className = 'stream-cursor-arrow';
    arrow.innerHTML = '<svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M2 1L2 14L6 11L8.5 16L11 15L8.5 10L13 10Z" fill="' + (color || '#0078D4') + '" stroke="#FFFFFF" stroke-width="0.6" stroke-linejoin="round"/>' +
      '</svg>';

    var label = document.createElement('span');
    label.className = 'stream-cursor-label';
    label.style.background = color || '#0078D4';
    label.textContent = name || '';

    var pulse = document.createElement('span');
    pulse.className = 'stream-cursor-pulse';

    cursor.appendChild(arrow);
    cursor.appendChild(label);
    cursor.appendChild(pulse);
    __streamRoot.appendChild(cursor);
    return cursor;
  }

  // ── Shared "player" animations (Wave A timeline, reused by videoClipMode) ─

  function animateTimeCounter() {
    var timeEl = __streamRoot.querySelector('.stream-time-elapsed');
    if (!timeEl) return;
    var maxTick = Math.floor(dur);
    for (var t = 0; t <= maxTick; t++) {
      (function (tt) {
        master.call(function () {
          timeEl.textContent = streamFormatTime(tt);
        }, null, SCENE_START + tt);
      })(t);
    }
  }

  function animateCopilotPulse() {
    var pulseT = SCENE_START + 1.0;
    var pulseEnd = SCENE_START + dur - fadeMargin - 0.3;
    while (pulseT < pulseEnd) {
      master.fromTo(__streamScope + '.stream-copilot',
        { scale: 1 },
        { scale: 1.10, duration: 0.30, ease: 'power2.out', yoyo: true, repeat: 1 },
        pulseT);
      pulseT += 2.4;
    }
  }

  function animateRootFades() {
    master.fromTo(__streamScope + '.stream-root',
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: 'power2.out' },
      SCENE_START);
    master.to(__streamScope + '.stream-root',
      { opacity: 0, duration: fadeMargin, ease: 'power2.in' },
      SCENE_START + dur - fadeMargin);
  }

  function animateScrubberFill() {
    master.fromTo(__streamScope + '.stream-scrubber-fill',
      { scaleX: 0 },
      { scaleX: 1, duration: dur, ease: 'none' },
      SCENE_START);
  }

  // Word + segment side-effects timeline. `setupRefs` is the return of
  // buildTranscriptAndCaptions().
  function animateTranscriptAndCaptions(setupRefs) {
    var segmentRefs = setupRefs.segmentRefs;
    var segOffsets = setupRefs.segOffsets;
    var transcriptInner = setupRefs.transcriptInner;

    master.fromTo(__streamScope + '.stream-captions',
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' },
      SCENE_START + 0.5);

    for (var s3 = 0; s3 < segmentRefs.length; s3++) {
      var ref = segmentRefs[s3];

      for (var w3 = 0; w3 < ref.wordRefs.length; w3++) {
        var wr = ref.wordRefs[w3];
        master.set(wr.el, {
          backgroundColor: '#FFE1F0',
          color: '#BB2A8A',
          fontWeight: 600
        }, SCENE_START + wr.t0);
        master.set(wr.el, {
          backgroundColor: 'transparent',
          color: '#323130',
          fontWeight: 400
        }, SCENE_START + wr.t1);
      }

      for (var w4 = 0; w4 < ref.capWordRefs.length; w4++) {
        var cwr = ref.capWordRefs[w4];
        master.set(cwr.el, {
          color: '#FFB6DE',
          fontWeight: 700
        }, SCENE_START + cwr.t0);
        master.set(cwr.el, {
          color: '#FFFFFF',
          fontWeight: 600
        }, SCENE_START + cwr.t1);
      }
    }

    for (var s4 = 0; s4 < segmentRefs.length; s4++) {
      var ref2 = segmentRefs[s4];
      if (!ref2.wordRefs.length) continue;

      var t0Seg = ref2.firstT0;
      var t1Seg = ref2.lastT1;

      if (ref2.rootEl) {
        master.set(ref2.rootEl, {
          borderLeftColor: '#E3008C',
          backgroundColor: '#FFF1F8'
        }, SCENE_START + t0Seg);
        master.set(ref2.rootEl, {
          borderLeftColor: 'transparent',
          backgroundColor: 'transparent'
        }, SCENE_START + t1Seg);
      }

      if (ref2.capLineEl) {
        master.to(ref2.capLineEl,
          { opacity: 1, duration: 0.25, ease: 'power2.out' },
          SCENE_START + Math.max(0, t0Seg - 0.1));
        master.to(ref2.capLineEl,
          { opacity: 0, duration: 0.25, ease: 'power2.in' },
          SCENE_START + t1Seg);
      }

      if (transcriptInner) {
        var targetY = -segOffsets[s4] + 8;
        master.to(transcriptInner,
          { y: targetY, duration: 0.45, ease: 'power2.inOut' },
          SCENE_START + Math.max(0, t0Seg - 0.2));
      }
    }
  }

  // ── VARIANT 1 (Wave A back-compat): playerWithTranscript ────────────────

  function buildPlayer() {
    buildChapterMarkers();
    // Wave A capped transcript at 6 segments — preserve that exact behaviour
    // so the back-compat SSIM check passes. We splice the working set down
    // before delegating to the shared builder.
    if (segments.length > 6) segments = segments.slice(0, 6);
    return buildTranscriptAndCaptions(false);
  }

  function animatePlayer(setupRefs) {
    animateRootFades();

    // Ken Burns slow zoom on synthetic poster
    master.fromTo(__streamScope + '.stream-poster',
      { scale: 1.0 },
      { scale: 1.04, duration: dur, ease: 'none' },
      SCENE_START);

    animateScrubberFill();
    animateTimeCounter();
    animateTranscriptAndCaptions(setupRefs);
    animateCopilotPulse();
  }

  // ── VARIANT 2: chaptersNavigation ───────────────────────────────────────

  function buildChapters() {
    buildChapterMarkers();

    // Replace transcript-inner contents with chapter rows (build once, in
    // the synchronous setup phase — tweens later only mutate styles).
    var transcriptInner = __streamRoot.querySelector('.stream-transcript-inner');
    if (transcriptInner) transcriptInner.innerHTML = '';

    var rowEls = [];
    for (var ci = 0; ci < chapters.length; ci++) {
      var ch = chapters[ci];
      if (!ch || typeof ch !== 'object') continue;

      var row = document.createElement('div');
      row.className = 'stream-chrow';
      row.setAttribute('data-chapter-idx', String(ci));

      // Synthetic thumbnail (poster-style mini SVG, no photographs).
      var thumb = document.createElement('div');
      thumb.className = 'stream-chrow-thumb';
      thumb.innerHTML = '<svg viewBox="0 0 88 50" preserveAspectRatio="xMidYMid slice">' +
        '<rect x="0" y="0" width="88" height="50" fill="#1F1F36"/>' +
        '<rect x="14" y="6" width="60" height="22" rx="2" fill="#5C7DB3" opacity="0.85"/>' +
        '<rect x="20" y="11" width="32" height="3" rx="1" fill="#FFFFFF" opacity="0.85"/>' +
        '<rect x="20" y="17" width="48" height="2" rx="1" fill="#FFFFFF" opacity="0.55"/>' +
        '<rect x="20" y="21" width="40" height="2" rx="1" fill="#FFFFFF" opacity="0.55"/>' +
        '<rect x="0" y="34" width="88" height="16" fill="#0A0A14"/>' +
        '<ellipse cx="44" cy="42" rx="6" ry="3.5" fill="#0A0A14"/>' +
        '<path d="M 38 50 Q 44 36 50 50 Z" fill="#0A0A14"/>' +
        '</svg>';

      var textWrap = document.createElement('div');
      textWrap.className = 'stream-chrow-text';
      var titleEl = document.createElement('div');
      titleEl.className = 'stream-chrow-title';
      titleEl.textContent = String(ch.title || ('Chapter ' + (ci + 1)));
      var timeEl = document.createElement('div');
      timeEl.className = 'stream-chrow-time';
      var startSec = (typeof ch.startSec === 'number' && isFinite(ch.startSec)) ? ch.startSec : 0;
      timeEl.textContent = streamFormatTime(startSec);
      textWrap.appendChild(titleEl);
      textWrap.appendChild(timeEl);

      // Duration pill = next chapter's start - this start, or remainder.
      var nextStart = (ci + 1 < chapters.length && typeof chapters[ci + 1].startSec === 'number')
        ? chapters[ci + 1].startSec : dur;
      var pillSec = Math.max(1, Math.round(nextStart - startSec));
      var pill = document.createElement('span');
      pill.className = 'stream-chrow-pill';
      pill.textContent = streamFormatTime(pillSec);

      row.appendChild(thumb);
      row.appendChild(textWrap);
      row.appendChild(pill);
      if (transcriptInner) transcriptInner.appendChild(row);
      rowEls.push(row);
    }

    // Cursor (Avery, blue) — the brief calls for blue, not Avery's magenta.
    var cursor = buildCursor('Avery', '#0078D4');

    // Viewport overlays: dim layer + chapter-title slide-in.
    var viewport = __streamRoot.querySelector('.stream-viewport');
    var dim = document.createElement('div');
    dim.className = 'stream-dim';
    var chtitle = document.createElement('div');
    chtitle.className = 'stream-chtitle';
    var chtitleText = document.createElement('span');
    chtitleText.className = 'stream-chtitle-main';
    chtitleText.textContent = 'Customer wins';
    var chtitleTime = document.createElement('span');
    chtitleTime.className = 'stream-chtitle-time';
    chtitleTime.textContent = '04:32';
    chtitle.appendChild(chtitleText);
    chtitle.appendChild(chtitleTime);
    if (viewport) {
      viewport.appendChild(dim);
      viewport.appendChild(chtitle);
    }

    // Pre-measure target row position for the cursor (Rule #7 — measure
    // once, never inside a tween). Target chapter index 1 → "Customer wins"
    // (chapters[0]="Welcome", chapters[1]="Customer wins" ... per brief).
    // Brief says "Chapter 3" using human 1-indexed counting in the list;
    // map to the chapter whose title is "Customer wins" defensively.
    var targetIdx = 1;
    for (var ti = 0; ti < chapters.length; ti++) {
      if (String(chapters[ti].title || '').toLowerCase().indexOf('customer') >= 0) {
        targetIdx = ti; break;
      }
    }
    var targetRow = rowEls[targetIdx] || rowEls[0] || null;
    var targetRowRect = null;
    var rootRect = __streamRoot.getBoundingClientRect();
    if (targetRow) {
      var r = targetRow.getBoundingClientRect();
      targetRowRect = {
        x: r.left - rootRect.left + 24,
        y: r.top - rootRect.top + 12
      };
    } else {
      targetRowRect = { x: rootRect.width - 200, y: 200 };
    }

    // Pre-measure scrubber percentages for chapter 0 → target chapter.
    var startPct = 0;
    var targetPct = streamClampNum(
      ((chapters[targetIdx] && chapters[targetIdx].startSec) || 0) / dur, 0, 1);

    return {
      rowEls: rowEls,
      cursor: cursor,
      cursorPulse: cursor.querySelector('.stream-cursor-pulse'),
      dim: dim,
      chtitle: chtitle,
      targetIdx: targetIdx,
      targetRow: targetRow,
      targetRowRect: targetRowRect,
      startPct: startPct,
      targetPct: targetPct
    };
  }

  function animateChapters(setupRefs) {
    animateRootFades();

    // Tab indicator slide: Transcript → Chapters. We toggle the active
    // class via master.set events at deterministic times. The CSS already
    // handles the underline + color via .stream-tab--active.
    var tabs = __streamRoot.querySelectorAll('.stream-tab');
    if (tabs.length >= 2) {
      master.call(function () {
        tabs[0].classList.remove('stream-tab--active');
        tabs[1].classList.add('stream-tab--active');
      }, null, SCENE_START + 0.6);
    }

    // Chapter rows fade-in stagger 0.08s
    for (var i = 0; i < setupRefs.rowEls.length; i++) {
      master.fromTo(setupRefs.rowEls[i],
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        SCENE_START + 0.4 + i * 0.08);
    }

    // Active-chapter highlight follows the playhead. Initial state: chapter 0
    // active. Each subsequent chapter.startSec triggers a class-swap so the
    // sidebar reflects which chapter the (synthetic) playhead is in. Pre-
    // existing rows are mutated only — no DOM creation inside the tween.
    if (setupRefs.rowEls.length > 0) {
      master.call(function () {
        for (var ai = 0; ai < setupRefs.rowEls.length; ai++) {
          setupRefs.rowEls[ai].classList.remove('stream-chrow--active');
        }
        setupRefs.rowEls[0].classList.add('stream-chrow--active');
      }, null, SCENE_START + 0.4);

      for (var bi = 1; bi < chapters.length && bi < setupRefs.rowEls.length; bi++) {
        (function (idx) {
          var ch = chapters[idx];
          var bSec = (ch && typeof ch.startSec === 'number' && isFinite(ch.startSec))
            ? ch.startSec : 0;
          master.call(function () {
            for (var ci2 = 0; ci2 < setupRefs.rowEls.length; ci2++) {
              setupRefs.rowEls[ci2].classList.remove('stream-chrow--active');
            }
            setupRefs.rowEls[idx].classList.add('stream-chrow--active');
          }, null, SCENE_START + bSec);
        })(bi);
      }
    }

    // Cursor: appear near top-left of side panel, fly to target row, pulse.
    var cursor = setupRefs.cursor;
    var pulse = setupRefs.cursorPulse;
    var rootW = __streamRoot.getBoundingClientRect().width;
    var entryX = rootW - 360;
    var entryY = 120;

    master.set(cursor, { x: entryX, y: entryY, opacity: 0 }, SCENE_START);
    master.to(cursor,
      { opacity: 1, duration: 0.35, ease: 'power2.out' },
      SCENE_START + 1.1);
    master.to(cursor,
      { x: setupRefs.targetRowRect.x, y: setupRefs.targetRowRect.y,
        duration: 1.0, ease: 'power2.inOut' },
      SCENE_START + 1.4);

    // Click pulse on cursor at ~SCENE_START + 2.7
    if (pulse) {
      master.set(pulse, { x: -3, y: -3, scale: 0, opacity: 0.6 }, SCENE_START + 2.7);
      master.to(pulse,
        { scale: 1.2, opacity: 0, duration: 0.5, ease: 'power2.out' },
        SCENE_START + 2.7);
    }

    // Highlight target row (background tint) at click time.
    if (setupRefs.targetRow) {
      master.set(setupRefs.targetRow, { backgroundColor: '#FFF1F8' }, SCENE_START + 2.7);
    }

    // Scrubber fill animates from current pos to chapter-target pct.
    master.set(__streamScope + '.stream-scrubber-fill',
      { scaleX: setupRefs.startPct }, SCENE_START + 0);
    master.to(__streamScope + '.stream-scrubber-fill',
      { scaleX: setupRefs.targetPct, duration: 0.7, ease: 'power2.inOut' },
      SCENE_START + 2.85);

    // Player surface dim + chapter-title slide in from bottom.
    master.to(setupRefs.dim,
      { opacity: 1, duration: 0.3, ease: 'power2.out' },
      SCENE_START + 3.0);
    master.to(setupRefs.chtitle,
      { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' },
      SCENE_START + 3.05);
    // Wait via: the y was translateY(100%); we tween to y:0. We need to
    // express that as percentage: easier — set initial transform inline,
    // then tween to translateY(0px). gsap.to with y will use px which is
    // ~viewport bottom. Initial translateY(100%) is already in CSS; gsap
    // will read computed value. Good enough for the slide-in feel.

    // Hold ~1.2s then fade overlay + dim.
    master.to(setupRefs.chtitle,
      { opacity: 0, duration: 0.4, ease: 'power2.in' },
      SCENE_START + 4.6);
    master.to(setupRefs.dim,
      { opacity: 0, duration: 0.4, ease: 'power2.in' },
      SCENE_START + 4.6);

    // After overlay clears: scrubber continues filling toward end-of-scene
    // for visual continuity with Wave A's "video is still playing" feel.
    master.to(__streamScope + '.stream-scrubber-fill',
      { scaleX: 1, duration: dur - 5.4, ease: 'none' },
      SCENE_START + 5.0);

    animateTimeCounter();
    animateCopilotPulse();
  }

  // ── VARIANT 3: searchResults ────────────────────────────────────────────

  function buildSearch() {
    buildChapterMarkers();
    var setup = buildTranscriptAndCaptions(true);

    // Insert search shell as the first child of the side panel (above tabs).
    var sidepanel = __streamRoot.querySelector('.stream-sidepanel');
    var shell = document.createElement('div');
    shell.className = 'stream-search-shell';

    var icon = document.createElement('span');
    icon.className = 'stream-search-icon';
    icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">' +
      '<path d="M11.5 11.5L15 15M13 7.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" stroke="currentColor" stroke-width="1.5" fill="none"/>' +
      '</svg>';

    var inputWrap = document.createElement('span');
    inputWrap.className = 'stream-search-input';
    var textSpan = document.createElement('span');
    textSpan.className = 'stream-search-text';
    var caret = document.createElement('span');
    caret.className = 'stream-search-caret';
    inputWrap.appendChild(textSpan);
    inputWrap.appendChild(caret);

    var badge = document.createElement('span');
    badge.className = 'stream-search-badge';
    badge.textContent = '0 results';

    shell.appendChild(icon);
    shell.appendChild(inputWrap);
    shell.appendChild(badge);
    if (sidepanel) sidepanel.insertBefore(shell, sidepanel.firstChild);

    // Cursor (Avery, magenta — distinguishes from chapters variant blue).
    var cursor = buildCursor('Avery', '#E3008C');

    // Pre-compute target: 2nd matching segment.
    var matches = [];
    for (var mi = 0; mi < setup.segmentRefs.length; mi++) {
      if (setup.segmentRefs[mi].hasMatch) matches.push(setup.segmentRefs[mi]);
    }
    var targetSeg = matches[1] || matches[0] || setup.segmentRefs[0] || null;
    var targetWord = targetSeg && targetSeg.hlWordEls && targetSeg.hlWordEls[0];

    var rootRect = __streamRoot.getBoundingClientRect();
    var targetWordRect = null;
    if (targetWord) {
      var rW = targetWord.getBoundingClientRect();
      targetWordRect = {
        x: rW.left - rootRect.left + rW.width / 2,
        y: rW.top - rootRect.top + rW.height / 2
      };
    } else {
      targetWordRect = { x: rootRect.width - 220, y: 240 };
    }

    // Scrubber jump pct: targetSeg.firstT0 / dur.
    var jumpPct = targetSeg
      ? streamClampNum(targetSeg.firstT0 / dur, 0, 1)
      : 0.4;

    return {
      setup: setup,
      shell: shell,
      textSpan: textSpan,
      badge: badge,
      cursor: cursor,
      cursorPulse: cursor.querySelector('.stream-cursor-pulse'),
      matches: matches,
      targetSeg: targetSeg,
      targetWord: targetWord,
      targetWordRect: targetWordRect,
      jumpPct: jumpPct
    };
  }

  function animateSearch(refs) {
    animateRootFades();

    // 1. Focus the search shell (CSS handles ring via class).
    master.call(function () {
      refs.shell.classList.add('stream-search-shell--focus');
    }, null, SCENE_START + 0.5);

    // 2. Type "rollout" — 7 stepped master.call events. NO onUpdate, NO
    //    GSAP text plugin. Mutates textContent on a pre-existing <span>.
    //    Wave D polish: delay start to SCENE_START+1.5s and stretch each
    //    keystroke to 0.45s so the whole word takes ~2.7s to type — clearly
    //    mid-type at audit t=2s, complete by ~t=4s.
    var typeStart = SCENE_START + 1.5;
    var typeStep = 0.45;
    var word = 'rollout';
    for (var k = 1; k <= word.length; k++) {
      (function (slice) {
        master.call(function () {
          refs.textSpan.textContent = slice;
        }, null, typeStart + (slice.length - 1) * typeStep);
      })(word.slice(0, k));
    }

    // 3. Match counter badge appears after typing finishes.
    var typeEnd = typeStart + (word.length - 1) * typeStep + 0.08;
    master.call(function () {
      refs.badge.textContent = (refs.matches.length || 0) + ' results';
    }, null, typeEnd);
    master.fromTo(refs.badge,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' },
      typeEnd);

    // 4. Hold ~1.0s after typing then fade non-matching segments to 0.15
    //    while staggering the matching segments back to full opacity (0.1s
    //    per match) so the result list animates in clearly.
    var fadeAt = typeEnd + 1.0;
    var matchSeen = 0;
    for (var s = 0; s < refs.setup.segmentRefs.length; s++) {
      var sref = refs.setup.segmentRefs[s];
      if (!sref.rootEl) continue;
      if (sref.hasMatch) {
        master.to(sref.rootEl,
          { opacity: 1, duration: 0.4, ease: 'power2.out' },
          fadeAt + matchSeen * 0.1);
        matchSeen++;
      } else {
        master.to(sref.rootEl,
          { opacity: 0.15, duration: 0.4, ease: 'power2.out' },
          fadeAt);
      }
    }

    // 5. Cursor flies in then to the 2nd match's matched word, then click.
    var cursor = refs.cursor;
    var pulse = refs.cursorPulse;
    var rootW = __streamRoot.getBoundingClientRect().width;
    master.set(cursor, { x: rootW - 380, y: 80, opacity: 0 }, SCENE_START);
    master.to(cursor,
      { opacity: 1, duration: 0.3, ease: 'power2.out' },
      typeEnd + 0.2);
    master.to(cursor,
      { x: refs.targetWordRect.x, y: refs.targetWordRect.y,
        duration: 0.9, ease: 'power2.inOut' },
      typeEnd + 0.35);

    var clickAt = typeEnd + 1.4;
    if (pulse) {
      master.set(pulse, { x: -3, y: -3, scale: 0, opacity: 0.6 }, clickAt);
      master.to(pulse,
        { scale: 1.2, opacity: 0, duration: 0.5, ease: 'power2.out' },
        clickAt);
    }

    // 6. Scrubber jumps to target chapter pct.
    master.set(__streamScope + '.stream-scrubber-fill',
      { scaleX: 0 }, SCENE_START);
    master.to(__streamScope + '.stream-scrubber-fill',
      { scaleX: refs.jumpPct, duration: 0.45, ease: 'power2.inOut' },
      clickAt);

    // 7. Matched word in the 2nd match pulses pink.
    if (refs.targetWord) {
      master.fromTo(refs.targetWord,
        { scale: 1.0 },
        { scale: 1.18, duration: 0.20, ease: 'power2.out',
          yoyo: true, repeat: 1, transformOrigin: '50% 50%' },
        clickAt + 0.05);
    }

    animateTimeCounter();
    animateCopilotPulse();
  }

  // ── VARIANT 4: videoClipMode ────────────────────────────────────────────

  function buildVideoMode() {
    buildChapterMarkers();
    var setup = buildTranscriptAndCaptions(false);

    // The <video> is emitted into the viewport at compile time by
    // scf-to-html.mjs's StreamScene prop transformer (videoElementHtml slot).
    // This is required so @hyperframes/producer's "Extracting video frames"
    // preprocessing step (which scans build-time HTML for <video> tags) sees
    // it. Runtime-injected videos report videoCount=0 and play back as a
    // frozen first frame under headless deterministic seek. We just look up
    // the existing element here — no creation, no fallback.
    var videoEl = __streamRoot.querySelector('.stream-video');

    return { setup: setup, videoEl: videoEl };
  }

  function animateVideoMode(refs) {
    animateRootFades();

    // No Ken Burns on the synthetic poster — the real video occludes it
    // and provides its own motion. (Keeping the chrome & transport
    // animations identical to Wave A.)

    animateScrubberFill();
    animateTimeCounter();
    animateTranscriptAndCaptions(refs.setup);
    animateCopilotPulse();

    // The producer's video pipeline owns currentTime/play/pause for the
    // statically-emitted <video[data-composition-id][data-start]>. Issuing
    // any manual currentTime / play here would race that pipeline and
    // re-introduce the frozen-frame bug. Intentionally a no-op.
  }

  // ── DISPATCHER (fail-closed) ────────────────────────────────────────────

  var variant = (typeof SCENE_PROPS === 'object' && SCENE_PROPS && SCENE_PROPS.variant)
    ? String(SCENE_PROPS.variant) : 'playerWithTranscript';

  switch (variant) {
    case 'playerWithTranscript': {
      var pRefs = buildPlayer();
      animatePlayer(pRefs);
      break;
    }
    case 'chaptersNavigation': {
      var cRefs = buildChapters();
      animateChapters(cRefs);
      break;
    }
    case 'searchResults': {
      var sRefs = buildSearch();
      animateSearch(sRefs);
      break;
    }
    case 'videoClipMode': {
      var vRefs = buildVideoMode();
      animateVideoMode(vRefs);
      break;
    }
    default:
      throw new Error('StreamScene: unknown variant "' + variant + '"');
  }

})();
