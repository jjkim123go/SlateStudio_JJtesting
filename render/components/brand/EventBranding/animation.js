/*
 * EventBranding — animation contract
 *
 * Three style modes: opener (~6s), bumper (~1.5s), lower-frame (~4s hold).
 * Sponsor logos read from data-island, DOM built once before any tweens.
 * linearGradient id: eb-grad-${SCENE_ID}
 *
 * Globals: master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION
 */
(function () {
  var S = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(S + '.eb-root');
  if (!root) return;

  // ── Helpers ───────────────────────────────────────────────────────────

  function isPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }

  function safeJsonArray(idPrefix) {
    var el = document.getElementById(idPrefix + '-' + SCENE_ID);
    if (!el) return [];
    var raw = (el.textContent || '').trim();
    if (!raw || raw === 'undefined' || raw === 'null') return [];
    try { var p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
    catch (_) { return []; }
  }

  // ── Read props ────────────────────────────────────────────────────────

  var style = (root.getAttribute('data-style') || 'opener').toLowerCase();
  if (isPlaceholder(style) || (style !== 'opener' && style !== 'bumper' && style !== 'lower-frame')) {
    style = 'opener';
  }

  var themeArt = root.getAttribute('data-theme-art') || '';
  if (isPlaceholder(themeArt)) themeArt = '';

  var sponsors = safeJsonArray('eb-sponsors');

  // ── Resolve background ────────────────────────────────────────────────

  var bg = root.querySelector('.eb-bg');
  // PR 9 Lane B (final): Lottie container is injected at compile time via a
  // triple-stash slot inside .eb-bg. No data-attribute round-trip; no
  // innerHTML mutation. The driver picks it up on initial scan.
  var lottieCont = bg ? bg.querySelector('.lottie-container') : null;

  if (bg) {
    if (lottieCont) {
      // Normalize sizing so it covers the full .eb-bg (compileLottieEmbed
      // emits explicit width/height — override to full-bleed).
      lottieCont.classList.add('eb-bg-lottie');
      lottieCont.style.position = 'absolute';
      lottieCont.style.inset = '0';
      lottieCont.style.width = '100%';
      lottieCont.style.height = '100%';
    } else if (themeArt) {
      bg.style.backgroundImage = 'url("' + themeArt + '")';
      bg.style.backgroundColor = '#0f172a';
    } else {
      bg.style.background = 'linear-gradient(135deg, #0078d4 0%, #5c2d91 50%, #0f172a 100%)';
    }
  }

  // ── Accent line gradient ──────────────────────────────────────────────

  var accentLine = root.querySelector('.eb-accent-line');
  if (accentLine) {
    accentLine.style.background = 'url(#eb-grad-' + SCENE_ID + ')';
    // SVG paint won't work on a div; use CSS gradient fallback
    accentLine.style.background = 'linear-gradient(90deg, #0078d4, #5c2d91)';
  }

  // ── Hide venue separator if venue is empty ────────────────────────────

  var venueEl = root.querySelector('.eb-venue');
  var sepEl = root.querySelector('.eb-meta-sep');
  if (venueEl && !venueEl.textContent.trim()) {
    venueEl.style.display = 'none';
    if (sepEl) sepEl.style.display = 'none';
  }

  // ── Build sponsor DOM (opener only, before any tweens) ────────────────

  var sponsorsContainer = root.querySelector('.eb-sponsors');
  if (sponsorsContainer && sponsors.length > 0 && style === 'opener') {
    for (var i = 0; i < sponsors.length; i++) {
      var sp = sponsors[i];
      if (!sp || typeof sp !== 'object') continue;
      var wrap = document.createElement('div');
      wrap.className = 'eb-sponsor';
      if (sp.logoSrc && typeof sp.logoSrc === 'string') {
        var img = document.createElement('img');
        img.className = 'eb-sponsor-logo';
        img.src = sp.logoSrc;
        img.alt = String(sp.label || '');
        wrap.appendChild(img);
      }
      if (sp.label && typeof sp.label === 'string') {
        var lbl = document.createElement('span');
        lbl.className = 'eb-sponsor-label';
        lbl.textContent = sp.label;
        wrap.appendChild(lbl);
      }
      sponsorsContainer.appendChild(wrap);
    }
  }

  // ── Selector constants ────────────────────────────────────────────────

  var nameSel       = S + '.eb-event-name';
  var seriesSel     = S + '.eb-series';
  var metaSel       = S + '.eb-meta';
  var sessionSel    = S + '.eb-session';
  var sponsorsSel   = S + '.eb-sponsors';
  var sponsorItemSel = S + '.eb-sponsor';
  var bgSel         = S + '.eb-bg';
  var overlaySel    = S + '.eb-overlay';
  var contentSel    = S + '.eb-content';
  var accentSel     = S + '.eb-accent-line';
  var rootSel       = S + '.eb-root';

  // ── OPENER ────────────────────────────────────────────────────────────

  if (style === 'opener') {
    // bg wash 0–0.6s
    master.fromTo(bgSel,
      { scale: 1.08, opacity: 0 },
      { scale: 1.0, opacity: 1, duration: 0.6, ease: 'power2.out' },
      SCENE_START);

    master.fromTo(overlaySel,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' },
      SCENE_START);

    // Ambient slow drift on bg
    master.to(bgSel,
      { scale: 1.06, rotation: 0.8, duration: SCENE_DURATION, ease: 'sine.inOut' },
      SCENE_START);

    // eventName slide + scale 0.6–1.6s
    master.fromTo(nameSel,
      { opacity: 0, scale: 0.85, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 1.0, ease: 'power3.out' },
      SCENE_START + 0.6);

    // series fade (if present)
    var seriesEl = root.querySelector('.eb-series');
    if (seriesEl && seriesEl.textContent.trim()) {
      master.fromTo(seriesSel,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        SCENE_START + 1.3);
    }

    // date + venue 1.6–2.4s
    master.fromTo(metaSel,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
      SCENE_START + 1.6);

    // sessionId pill 2.4–3.0s
    var sessionEl = root.querySelector('.eb-session');
    if (sessionEl && sessionEl.textContent.trim()) {
      master.fromTo(sessionSel,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.4)' },
        SCENE_START + 2.4);
    }

    // sponsors stagger 3.0–4.5s
    if (sponsors.length > 0) {
      master.fromTo(sponsorsSel,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' },
        SCENE_START + 3.0);
      master.fromTo(sponsorItemSel,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.15 },
        SCENE_START + 3.0);
    }

    // Exit fade (≥0.3s margin per CONTRACT §7)
    master.to(rootSel,
      { opacity: 0, duration: 0.4, ease: 'power2.in' },
      SCENE_START + SCENE_DURATION - 0.4);

  // ── BUMPER ──────────────────────────────────────────────────────────

  } else if (style === 'bumper') {
    // bg wash (fast)
    master.fromTo(bgSel,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: 'power2.out' },
      SCENE_START);
    master.fromTo(overlaySel,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: 'power2.out' },
      SCENE_START);

    // full pop scale 0–0.4s
    master.fromTo(nameSel,
      { opacity: 0, scale: 0.3 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' },
      SCENE_START);

    var sessionEl2 = root.querySelector('.eb-session');
    if (sessionEl2 && sessionEl2.textContent.trim()) {
      master.fromTo(sessionSel,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' },
        SCENE_START + 0.15);
    }

    // scale-out + fade 1.0–1.5s
    master.to(nameSel,
      { opacity: 0, scale: 1.3, duration: 0.5, ease: 'power2.in' },
      SCENE_START + 1.0);
    if (sessionEl2 && sessionEl2.textContent.trim()) {
      master.to(sessionSel,
        { opacity: 0, scale: 1.3, duration: 0.5, ease: 'power2.in' },
        SCENE_START + 1.0);
    }

  // ── LOWER-FRAME ─────────────────────────────────────────────────────

  } else if (style === 'lower-frame') {
    // slide up from bottom 0–0.5s
    master.fromTo(contentSel,
      { y: '100%' },
      { y: '0%', duration: 0.5, ease: 'power3.out' },
      SCENE_START);

    // accent line scrub across the hold period
    master.fromTo(accentSel,
      { width: '0%' },
      { width: '100%', duration: SCENE_DURATION - 0.9, ease: 'none' },
      SCENE_START + 0.5);

    // exit: slide back down
    master.to(contentSel,
      { y: '100%', duration: 0.4, ease: 'power2.in' },
      SCENE_START + SCENE_DURATION - 0.4);
  }
})();
