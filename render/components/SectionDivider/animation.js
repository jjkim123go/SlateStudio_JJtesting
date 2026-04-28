// SectionDivider — animation contract
//
// Lane A data-array pattern: complex props (e.g. gradientStops) are read from
// JSON-stringified data attributes. Until the Lane C compiler prop-builder
// ships, SCF authors should pass `gradientStopsJson` as a pre-stringified JSON
// string (mirrors the DataFlow / DataChart precedent).
//
// Globals provided by the renderer (do NOT redeclare): master, gsap,
// SCENE_ID, SCENE_START, SCENE_DURATION.
(function () {
  var root = document.querySelector('.scene-' + SCENE_ID + ' .sd-root');
  if (!root) return;

  function isPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }
  function num(attr, fb) {
    var v = root.getAttribute(attr);
    if (isPlaceholder(v)) return fb;
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : fb;
  }
  function safeJson(v, fb) {
    if (isPlaceholder(v)) return fb;
    try { return JSON.parse(v); } catch (_e) { return fb; }
  }

  // Apply brand color override (CSS custom property fallback if absent).
  var brand = root.getAttribute('data-brand-primary');
  if (brand && !isPlaceholder(brand) && brand.trim()) {
    root.style.setProperty('--sd-brand', brand.trim());
    root.style.setProperty('--sd-accent', brand.trim());
  }

  // Resolve background per backgroundMode.
  var bg = root.querySelector('.sd-bg');
  var mode = (root.getAttribute('data-bg-mode') || 'gradient').toLowerCase();
  if (isPlaceholder(mode)) mode = 'gradient';
  var bgColor = root.getAttribute('data-bg-color') || '';
  var bgImage = root.getAttribute('data-bg-image') || '';
  var stops = safeJson(root.getAttribute('data-gradient-stops'), null);
  if (!Array.isArray(stops) || !stops.length) stops = ['#0a0e27', '#1a1f3a'];

  if (bg) {
    if (mode === 'solid' && bgColor && !isPlaceholder(bgColor)) {
      bg.style.background = bgColor;
    } else if (mode === 'image' && bgImage && !isPlaceholder(bgImage)) {
      bg.style.backgroundImage = 'url("' + bgImage + '")';
      bg.style.backgroundColor = stops[0];
    } else {
      bg.style.background = 'linear-gradient(135deg, ' + stops.map(String).join(', ') + ')';
    }
  }

  // Hide subtitle if empty so layout collapses cleanly.
  var sub = root.querySelector('.sd-subtitle');
  if (sub && !sub.textContent.trim()) sub.style.display = 'none';

  // Hide progress block if no totalChapters supplied.
  var totalAttr = root.getAttribute('data-total-chapters') || '';
  var total = parseFloat(totalAttr);
  var chapter = parseFloat(root.getAttribute('data-chapter-number') || '');
  var hasProgress = !isPlaceholder(totalAttr) && Number.isFinite(total) && total > 0;
  var progress = root.querySelector('.sd-progress');
  if (progress && !hasProgress) progress.style.display = 'none';

  // Read timing props (all override-able for narration sync).
  var numeralStart  = num('data-numeral-scale-start', 0.20);
  var numeralDur    = num('data-numeral-scale-duration', 0.80);
  var titleStart    = num('data-title-wipe-start', 0.60);
  var titleDur      = num('data-title-wipe-duration', 0.70);
  var subStart      = num('data-subtitle-fade-start', 1.40);
  var progStart     = num('data-progress-tick-start', 1.80);

  var bgSel       = '.scene-' + SCENE_ID + ' .sd-bg';
  var numeralSel  = '.scene-' + SCENE_ID + ' .sd-numeral, .scene-' + SCENE_ID + ' .sd-ribbon-numeral';
  var titleSel    = '.scene-' + SCENE_ID + ' .sd-title';
  var subSel      = '.scene-' + SCENE_ID + ' .sd-subtitle';
  var progSel     = '.scene-' + SCENE_ID + ' .sd-progress';
  var progFillSel = '.scene-' + SCENE_ID + ' .sd-progress-fill';
  var rootSel     = '.scene-' + SCENE_ID + ' .sd-root';

  // Ambient slow drift on the background — runs the entire scene length.
  master.fromTo(bgSel,
    { rotation: -1.2, scale: 1.04 },
    { rotation: 1.2, scale: 1.10, duration: SCENE_DURATION, ease: 'sine.inOut' },
    SCENE_START);

  // Numeral scale-in with overshoot (CSS hides the inactive variant).
  master.fromTo(numeralSel,
    { opacity: 0, scale: 0.30 },
    { opacity: 1, scale: 1.00, duration: numeralDur, ease: 'back.out(1.7)' },
    SCENE_START + numeralStart);

  // Title clip-path wipe (left → right reveal).
  master.fromTo(titleSel,
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0% 0 0)', duration: titleDur, ease: 'power3.out' },
    SCENE_START + titleStart);

  // Subtitle fade + lift.
  if (sub && sub.style.display !== 'none') {
    master.fromTo(subSel,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
      SCENE_START + subStart);
  }

  // Progress block fade + tick fill.
  if (hasProgress) {
    var ratio = Math.min(1, Math.max(0, chapter / total));
    master.fromTo(progSel,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      SCENE_START + progStart);
    master.fromTo(progFillSel,
      { width: '0%' },
      { width: (ratio * 100) + '%', duration: 0.85, ease: 'power2.inOut' },
      SCENE_START + progStart + 0.20);
  }

  // Exit fade lands 0.4s before scene end (CONTRACT §7 ≥ 0.3s margin).
  master.to(rootSel,
    { opacity: 0, duration: 0.4, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.4);
})();
