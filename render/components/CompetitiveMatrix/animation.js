// CompetitiveMatrix — animation contract
//
// Renders a row-aligned product × feature comparison grid (≤4 products,
// ≤12 features). Reads three JSON data-islands (products / features /
// footnotes) — mirrors the SectionDivider + DataChart precedent. Until the
// Lane C compiler prop-builder ships, SCF authors pass `productsJson`,
// `featuresJson`, `footnotesJson` as pre-stringified JSON strings.
//
// Shared cmp-* grid structure per pr3-comparison-grid-spec.md.
// Choreography phases:
//   0.0 → 0.6s  Header rise
//   0.6 → 1.4s  Column reveal (left → right)
//   1.0 → 1.6s  Highlight emphasis (Flip lift)
//   1.6 → ...   Row cascade (each body row stagger 0.12)
//               + per-row icon scale-in (group-tween, NOT per-cell)
//   −1.0 → end  Footer fade
//   −0.4 → end  Exit fade (CONTRACT §7)
//
// Globals: master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION.
// `Flip` is a global injected by the runtime (gsap/Flip plugin).
(function () {
  var root = document.querySelector('.scene-' + SCENE_ID + ' .cm-root');
  if (!root) return;

  function isPlaceholder(v) {
    return !v || typeof v !== 'string' || v.indexOf('{{') === 0;
  }
  function safeJson(text, fb) {
    if (isPlaceholder(text)) return fb;
    try { return JSON.parse(text); } catch (_e) { return fb; }
  }
  function escText(s) { return s == null ? '' : String(s); }

  // --- Parse data islands ---------------------------------------------------
  var pIsland = root.querySelector('script[data-cm-products]');
  var fIsland = root.querySelector('script[data-cm-features]');
  var nIsland = root.querySelector('script[data-cm-footnotes-json]');

  var products = safeJson(pIsland ? pIsland.textContent : '', []);
  var features = safeJson(fIsland ? fIsland.textContent : '', []);
  var footnotes = safeJson(nIsland ? nIsland.textContent : '', []);

  if (!Array.isArray(products)) products = [];
  if (!Array.isArray(features)) features = [];
  if (!Array.isArray(footnotes)) footnotes = [];
  if (products.length > 4)  products  = products.slice(0, 4);  // schema cap
  if (features.length > 12) features  = features.slice(0, 12); // schema cap
  if (footnotes.length > 4) footnotes = footnotes.slice(0, 4); // schema cap

  var highlightId = root.getAttribute('data-highlight-product-id') || '';
  if (isPlaceholder(highlightId)) highlightId = '';

  // --- Build grid DOM (initial render) -------------------------------------
  var grid = root.querySelector('.cmp-grid');
  if (!grid) return;

  // Grid template: label column + N product columns
  grid.style.setProperty('--cm-grid-cols',
    '320px repeat(' + Math.max(1, products.length) + ', 1fr)');

  // ---- Header row (corner spacer + product col-heads) ----
  var headerRow = document.createElement('div');
  headerRow.className = 'cmp-row cmp-row--header';
  var corner = document.createElement('div');
  corner.className = 'cmp-cell cmp-cell--label cm-corner';
  headerRow.appendChild(corner);

  for (var p = 0; p < products.length; p++) {
    var prod = products[p] || {};
    var isHighlight = highlightId
      ? (prod.id === highlightId)
      : !!prod.isUs;

    var col = document.createElement('div');
    col.className = 'cmp-col-head';
    col.setAttribute('data-col-id', escText(prod.id || ('product-' + p)));
    col.setAttribute('data-highlight', isHighlight ? 'true' : 'false');
    col.setAttribute('data-is-us', prod.isUs ? 'true' : 'false');

    if (prod.logoSrc && !isPlaceholder(prod.logoSrc)) {
      var logo = document.createElement('img');
      logo.className = 'cm-product-logo';
      logo.alt = escText(prod.name) + ' logo';
      logo.src = String(prod.logoSrc); // assumed pre-resolved by orchestrator
      col.appendChild(logo);
    }

    var name = document.createElement('h3');
    name.className = 'cm-product-name';
    name.textContent = escText(prod.name);
    col.appendChild(name);

    if (prod.isUs) {
      var badge = document.createElement('span');
      badge.className = 'cm-us-badge';
      badge.textContent = 'Us';
      col.appendChild(badge);
    }

    headerRow.appendChild(col);
  }
  grid.appendChild(headerRow);

  // ---- Body rows (one per feature) ----
  for (var i = 0; i < features.length; i++) {
    var feat = features[i] || {};
    var row = document.createElement('div');
    row.className = 'cmp-row';
    row.setAttribute('data-row-id', escText(feat.id || ('feat-' + i)));

    var labelCell = document.createElement('div');
    labelCell.className = 'cmp-cell cmp-cell--label';
    labelCell.textContent = escText(feat.label);
    row.appendChild(labelCell);

    var ratings = (feat.ratings && typeof feat.ratings === 'object') ? feat.ratings : {};
    for (var q = 0; q < products.length; q++) {
      var prodQ = products[q] || {};
      var prodId = prodQ.id || ('product-' + q);
      var rating = ratings[prodId];
      var ratingValue = 'n/a';
      var ratingNote = '';
      if (typeof rating === 'string') {
        ratingValue = rating;
      } else if (rating && typeof rating === 'object') {
        ratingValue = rating.value || 'n/a';
        ratingNote = rating.note || '';
      }
      // Normalize unexpected values to n/a so the icon CSS still resolves.
      if (['yes', 'partial', 'no', 'n/a'].indexOf(ratingValue) === -1) {
        ratingValue = 'n/a';
      }

      var cell = document.createElement('div');
      cell.className = 'cmp-cell';
      cell.setAttribute('data-col-id', escText(prodId));
      cell.setAttribute('data-row-id', escText(feat.id || ('feat-' + i)));
      cell.setAttribute('data-rating', ratingValue);
      cell.setAttribute('data-highlight', highlightId && prodId === highlightId ? 'true' : 'false');

      var icon = document.createElement('span');
      icon.className = 'cm-rating-icon';
      cell.appendChild(icon);

      if (ratingNote) {
        var noteEl = document.createElement('span');
        noteEl.className = 'cm-rating-note';
        noteEl.textContent = escText(ratingNote);
        cell.appendChild(noteEl);
      }

      row.appendChild(cell);
    }
    grid.appendChild(row);
  }

  // ---- Footnotes ----
  var ulFn = root.querySelector('ul.cmp-footnotes');
  if (ulFn) {
    if (!footnotes.length) {
      ulFn.style.display = 'none';
    } else {
      for (var k = 0; k < footnotes.length; k++) {
        var fnLi = document.createElement('li');
        fnLi.textContent = escText(footnotes[k]);
        ulFn.appendChild(fnLi);
      }
    }
  }

  // Hide footer entirely if neither disclaimer nor footnotes are present.
  var footer = root.querySelector('.cmp-footer');
  var disc = root.querySelector('.cmp-disclaimer');
  var hasDisc = disc && disc.textContent && disc.textContent.trim();
  if (footer && !hasDisc && !footnotes.length) {
    footer.style.display = 'none';
  }
  if (disc && !hasDisc) disc.style.display = 'none';

  // --- Selectors ------------------------------------------------------------
  var sceneSel  = '.scene-' + SCENE_ID + ' ';
  var headerSel = sceneSel + '.cmp-header';
  var colSel    = sceneSel + '.cmp-col-head';
  var rowsSel   = sceneSel + '.cmp-row:not(.cmp-row--header)';
  var iconsSel  = sceneSel + '.cm-rating-icon';
  var notesSel  = sceneSel + '.cm-rating-note';
  var footerSel = sceneSel + '.cmp-footer';
  var rootSel   = sceneSel + '.cm-root';

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

  // Phase 3: highlight emphasis with Flip (1.0 → 1.6s)
  var hCol = highlightId
    ? root.querySelector('.cmp-col-head[data-col-id="' + highlightId.replace(/"/g, '\\"') + '"]')
    : root.querySelector('.cmp-col-head[data-is-us="true"]');
  if (hCol) {
    var doFlip = function () {
      try {
        if (typeof Flip !== 'undefined' && Flip && typeof Flip.getState === 'function') {
          var state = Flip.getState(colSel);
          hCol.classList.add('cmp-col-head--lifted');
          hCol.style.transform = 'translateY(-8px) scale(1.04)';
          Flip.from(state, { duration: 0.5, ease: 'power3.out', scale: true });
          gsap.to(hCol, { y: 0, scale: 1.04, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        } else {
          gsap.fromTo(hCol,
            { scale: 1.0 },
            { scale: 1.04, duration: 0.6, ease: 'back.out(1.6)', overwrite: 'auto' });
        }
      } catch (_e) {
        gsap.to(hCol, { scale: 1.04, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      }
    };
    master.call(doFlip, [], SCENE_START + 1.0);
  }

  // Phase 4: row cascade (1.6s → ...) — group tween across all body rows
  if (features.length > 0) {
    master.fromTo(rowsSel,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.12 },
      SCENE_START + 1.60);

    // Cell content morph — single group tween across ALL icons (CONTRACT
    // budget + spec finding #9: no per-cell free-for-all). Stagger keeps
    // it visually staged in time with the row cascade above.
    master.fromTo(iconsSel,
      { opacity: 0, scale: 0.6 },
      {
        opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(1.7)',
        stagger: { each: 0.04, from: 'start' }
      },
      SCENE_START + 1.65);

    if (root.querySelector('.cm-rating-note')) {
      master.fromTo(notesSel,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.05 },
        SCENE_START + 2.00);
    }
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
