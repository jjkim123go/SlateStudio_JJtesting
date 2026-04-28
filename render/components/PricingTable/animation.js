// PricingTable — animation contract
//
// Renders a column-based pricing grid (≤4 tiers, ≤8 features per tier).
// Reads the tiers array from a JSON data-island (`<script type="application/json">`)
// — mirrors the SectionDivider / DataChart precedent. Until the Lane C compiler
// prop-builder ships, SCF authors pass `tiersJson` as a pre-stringified JSON
// string of the tiers array.
//
// Shared cmp-* grid structure per pr3-comparison-grid-spec.md.
// Choreography phases:
//   0.0 → 0.6s  Header rise
//   0.6 → 1.4s  Column reveal (left → right)
//   1.0 → 1.6s  Recommended emphasis (Flip lift)
//   1.6 → ...   Feature-bullet cascade per column
//   −1.0 → end  Footer fade
//   −0.4 → end  Exit fade (CONTRACT §7)
//
// Globals: master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION.
// `Flip` is a global injected by the runtime (gsap/Flip plugin).
(function () {
  var root = document.querySelector('.scene-' + SCENE_ID + ' .pt-root');
  if (!root) return;

  function isPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }
  function safeJson(text, fb) {
    if (isPlaceholder(text)) return fb;
    try { return JSON.parse(text); } catch (_e) { return fb; }
  }
  function escText(s) { return s == null ? '' : String(s); }

  // --- Parse data island ----------------------------------------------------
  var island = root.querySelector('script.pt-data');
  var raw = island ? island.textContent : '';
  var tiers = safeJson(raw, []);
  if (!Array.isArray(tiers)) tiers = [];
  if (tiers.length > 4) tiers = tiers.slice(0, 4); // schema cap (pr3 spec)

  var recommendedId = root.getAttribute('data-recommended-tier-id') || '';
  if (isPlaceholder(recommendedId)) recommendedId = '';

  // --- Build grid DOM (initial render — animation-only mutation rule
  // applies AFTER this point). ---------------------------------------------
  var grid = root.querySelector('.cmp-grid');
  if (!grid) return;
  grid.setAttribute('data-cols', String(Math.max(1, tiers.length)));

  for (var i = 0; i < tiers.length; i++) {
    var t = tiers[i] || {};
    var features = Array.isArray(t.features) ? t.features.slice(0, 8) : [];
    var isRec = recommendedId ? (t.id === recommendedId) : !!t.recommended;

    var col = document.createElement('div');
    col.className = 'cmp-col-head';
    col.setAttribute('data-col-id', escText(t.id || ('tier-' + i)));
    col.setAttribute('data-recommended', isRec ? 'true' : 'false');

    if (isRec) {
      var badge = document.createElement('div');
      badge.className = 'pt-recommended-badge';
      badge.textContent = 'Recommended';
      col.appendChild(badge);
    }

    var name = document.createElement('h3');
    name.className = 'pt-tier-name';
    name.textContent = escText(t.name);
    col.appendChild(name);

    var priceBlock = document.createElement('div');
    priceBlock.className = 'pt-price-block';
    var priceEl = document.createElement('span');
    priceEl.className = 'pt-price';
    priceEl.textContent = escText(t.price);
    priceBlock.appendChild(priceEl);
    if (t.billing) {
      var billing = document.createElement('span');
      billing.className = 'pt-billing';
      billing.textContent = escText(t.billing);
      priceBlock.appendChild(billing);
    }
    col.appendChild(priceBlock);

    var ul = document.createElement('ul');
    ul.className = 'pt-feature-list';
    for (var f = 0; f < features.length; f++) {
      var li = document.createElement('li');
      li.className = 'pt-feature-li';
      var bullet = document.createElement('span');
      bullet.className = 'pt-feature-bullet';
      var label = document.createElement('span');
      label.className = 'pt-feature-label';
      label.textContent = escText(features[f]);
      li.appendChild(bullet);
      li.appendChild(label);
      ul.appendChild(li);
    }
    col.appendChild(ul);

    if (t.ctaLabel) {
      var cta = document.createElement('div');
      cta.className = 'pt-cta';
      cta.textContent = escText(t.ctaLabel);
      col.appendChild(cta);
    }

    grid.appendChild(col);
  }

  // Hide footer if no disclaimer text present.
  var footer = root.querySelector('.cmp-footer');
  var disc = root.querySelector('.cmp-disclaimer');
  if (footer && disc && (!disc.textContent || !disc.textContent.trim())) {
    footer.style.display = 'none';
  }

  // --- Selectors ------------------------------------------------------------
  var sceneSel  = '.scene-' + SCENE_ID + ' ';
  var headerSel = sceneSel + '.cmp-header';
  var colSel    = sceneSel + '.cmp-col-head';
  var badgeSel  = sceneSel + '.pt-recommended-badge';
  var liSel     = sceneSel + '.pt-feature-li';
  var footerSel = sceneSel + '.cmp-footer';
  var rootSel   = sceneSel + '.pt-root';

  // --- Timeline (group tweens — no per-cell free-for-all) ------------------
  // Phase 1: header rise (0.0 → 0.6s)
  master.fromTo(headerSel,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
    SCENE_START + 0.0);

  // Phase 2: column reveal (0.6 → 1.4s, stagger 0.10 left→right)
  master.fromTo(colSel,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.10 },
    SCENE_START + 0.60);

  // Phase 3: recommended emphasis with Flip (1.0 → 1.6s)
  var recCol = recommendedId
    ? root.querySelector('.cmp-col-head[data-col-id="' + recommendedId.replace(/"/g, '\\"') + '"]')
    : root.querySelector('.cmp-col-head[data-recommended="true"]');
  if (recCol) {
    var doFlip = function () {
      try {
        if (typeof Flip !== 'undefined' && Flip && typeof Flip.getState === 'function') {
          var state = Flip.getState(colSel);
          recCol.classList.add('cmp-col-head--lifted');
          recCol.style.transform = 'translateY(-8px) scale(1.04)';
          Flip.from(state, { duration: 0.5, ease: 'power3.out', scale: true });
          gsap.to(recCol, { y: 0, scale: 1.04, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        } else {
          gsap.fromTo(recCol,
            { scale: 1.0 },
            { scale: 1.04, duration: 0.6, ease: 'back.out(1.6)', overwrite: 'auto' });
        }
      } catch (_e) {
        gsap.to(recCol, { scale: 1.04, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      }
    };
    master.call(doFlip, [], SCENE_START + 1.0);

    // Recommended badge fade
    master.fromTo(badgeSel,
      { opacity: 0, y: -6, scale: 0.85 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)' },
      SCENE_START + 1.20);
  }

  // Phase 4: feature-bullet cascade (1.6s → ...) — group tween, no per-cell
  if (root.querySelector('.pt-feature-li')) {
    master.fromTo(liSel,
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out', stagger: 0.05 },
      SCENE_START + 1.60);
  }

  // Phase 5: footer fade — last 1.0s of scene
  if (footer && footer.style.display !== 'none') {
    master.fromTo(footerSel,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      Math.max(SCENE_START + 1.6, SCENE_START + SCENE_DURATION - 1.4));
  }

  // Phase 6: exit fade — lands at SCENE_START + SCENE_DURATION − 0.4s
  master.to(rootSel,
    { opacity: 0, duration: 0.4, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.4);
})();
