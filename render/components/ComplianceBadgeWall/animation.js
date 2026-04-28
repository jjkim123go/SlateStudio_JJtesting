// ComplianceBadgeWall — staggered tile pop-in, optional spotlight halo,
// group separator sweeps. All DOM is built imperatively in the first
// master.call so the SCF can pass structured arrays via a JSON data-attr.
//
// Selector hygiene: every selector is namespaced with '.scene-' + SCENE_ID
// per CONTRACT.md §4.3.

// PR 9 fix: build DOM synchronously at script-eval time (NOT inside master.call).
// `master.fromTo('.cbw-tile', ...)` below resolves its selector when the tween
// is added to the timeline (script-eval), so the elements MUST exist by then.
(function buildCbwDom () {
  var root = document.querySelector('.scene-' + SCENE_ID + ' .cbw-root');
  if (!root) return;

  function safeParse(raw, fallback) {
    if (!raw || raw.charAt(0) === '{' && raw.indexOf('{{') !== -1) return fallback;
    try { return JSON.parse(raw); } catch (_e) { return fallback; }
  }

  var badges = safeParse(root.getAttribute('data-cbw-badges'), []);
  var groupBy = root.getAttribute('data-cbw-group-by') || '';
  var spotlightId = root.getAttribute('data-cbw-spotlight') || '';

  var spotlightWrap = root.querySelector('.cbw-spotlight-wrap');
  var groupsWrap = root.querySelector('.cbw-groups');
  if (!spotlightWrap || !groupsWrap) return;

  // ---- helpers --------------------------------------------------------------
  function initialsFor(name) {
    if (!name) return '?';
    var cleaned = String(name).replace(/[^A-Za-z0-9 ]/g, ' ').trim();
    var parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) {
      var p = parts[0];
      return (p.length <= 4 ? p : p.slice(0, 2)).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function escText(s) { return (s == null ? '' : String(s)); }

  function buildIcon(badge) {
    var iconEl = document.createElement('div');
    iconEl.className = 'cbw-tile-icon';
    if (badge._lottieDataIslandId) {
      // PR 9 Lane B: Lottie animated icon
      var lc = document.createElement('div');
      lc.className = 'cbw-tile-icon-lottie lottie-container';
      lc.setAttribute('data-lottie-data-id', badge._lottieDataIslandId);
      lc.setAttribute('data-lottie-scene-start', String(SCENE_START));
      lc.setAttribute('data-lottie-scene-duration', String(SCENE_DURATION));
      lc.setAttribute('data-lottie-speed', '1');
      lc.setAttribute('data-lottie-loop', '1');
      lc.setAttribute('data-lottie-segment-from', '');
      lc.setAttribute('data-lottie-segment-to', '');
      lc.style.width = '100%';
      lc.style.height = '100%';
      iconEl.appendChild(lc);
    } else if (badge.iconSrc) {
      var img = document.createElement('img');
      img.src = badge.iconSrc;
      img.alt = escText(badge.name);
      iconEl.appendChild(img);
    } else {
      iconEl.textContent = initialsFor(badge.name || badge.id);
    }
    return iconEl;
  }

  function buildTile(badge) {
    var tile = document.createElement('div');
    tile.className = 'cbw-tile';
    tile.setAttribute('data-cbw-id', escText(badge.id));
    if (badge.status) tile.setAttribute('data-status', escText(badge.status));
    tile.appendChild(buildIcon(badge));
    var name = document.createElement('div');
    name.className = 'cbw-tile-name';
    name.textContent = escText(badge.name || badge.id);
    tile.appendChild(name);
    var metaText = badge.detail || badge.regionScope || badge.category || '';
    if (metaText) {
      var meta = document.createElement('div');
      meta.className = 'cbw-tile-meta';
      meta.textContent = escText(metaText);
      tile.appendChild(meta);
    }
    if (badge.status === 'planned') {
      var st = document.createElement('div');
      st.className = 'cbw-tile-status';
      st.textContent = 'Planned';
      tile.appendChild(st);
    }
    return tile;
  }

  function buildSpotlight(badge) {
    var card = document.createElement('div');
    card.className = 'cbw-spotlight';
    card.setAttribute('data-cbw-id', escText(badge.id));
    var iconEl = document.createElement('div');
    iconEl.className = 'cbw-spotlight-icon';
    if (badge._lottieDataIslandId) {
      var lc = document.createElement('div');
      lc.className = 'cbw-spotlight-icon-lottie lottie-container';
      lc.setAttribute('data-lottie-data-id', badge._lottieDataIslandId);
      lc.setAttribute('data-lottie-scene-start', String(SCENE_START));
      lc.setAttribute('data-lottie-scene-duration', String(SCENE_DURATION));
      lc.setAttribute('data-lottie-speed', '1');
      lc.setAttribute('data-lottie-loop', '1');
      lc.setAttribute('data-lottie-segment-from', '');
      lc.setAttribute('data-lottie-segment-to', '');
      lc.style.width = '100%';
      lc.style.height = '100%';
      iconEl.appendChild(lc);
    } else if (badge.iconSrc) {
      var img = document.createElement('img');
      img.src = badge.iconSrc; img.alt = escText(badge.name);
      iconEl.appendChild(img);
    } else {
      iconEl.textContent = initialsFor(badge.name || badge.id);
    }
    card.appendChild(iconEl);
    var nm = document.createElement('div');
    nm.className = 'cbw-spotlight-name';
    nm.textContent = escText(badge.name || badge.id);
    card.appendChild(nm);
    var dt = document.createElement('div');
    dt.className = 'cbw-spotlight-detail';
    dt.textContent = escText(badge.detail || badge.regionScope || '');
    card.appendChild(dt);
    return card;
  }

  function groupKey(badge) {
    if (groupBy === 'category') return badge.category || 'Other';
    if (groupBy === 'region') return badge.regionScope || 'Global';
    if (groupBy === 'status') return badge.status === 'planned' ? 'Planned' : 'Current';
    return '';
  }

  // ---- build DOM ------------------------------------------------------------
  var spotlight = null;
  var rest = badges.slice();
  if (spotlightId) {
    for (var i = 0; i < rest.length; i++) {
      if (rest[i] && rest[i].id === spotlightId) {
        spotlight = rest[i];
        rest.splice(i, 1);
        break;
      }
    }
  }
  if (spotlight) {
    spotlightWrap.appendChild(buildSpotlight(spotlight));
  } else {
    spotlightWrap.style.display = 'none';
  }

  if (rest.length === 0 && !spotlight) {
    var empty = document.createElement('div');
    empty.className = 'cbw-empty';
    empty.textContent = 'No compliance badges configured.';
    groupsWrap.appendChild(empty);
    return;
  }

  if (groupBy) {
    var buckets = {};
    var order = [];
    for (var j = 0; j < rest.length; j++) {
      var k = groupKey(rest[j]);
      if (!buckets[k]) { buckets[k] = []; order.push(k); }
      buckets[k].push(rest[j]);
    }
    order.forEach(function (key) {
      var grp = document.createElement('section');
      grp.className = 'cbw-group';
      var hd = document.createElement('div');
      hd.className = 'cbw-group-header';
      var lbl = document.createElement('span');
      lbl.textContent = key;
      var rule = document.createElement('span');
      rule.className = 'cbw-group-rule';
      hd.appendChild(lbl);
      hd.appendChild(rule);
      grp.appendChild(hd);
      var grid = document.createElement('div');
      grid.className = 'cbw-grid';
      buckets[key].forEach(function (b) { grid.appendChild(buildTile(b)); });
      grp.appendChild(grid);
      groupsWrap.appendChild(grp);
    });
  } else {
    var grid2 = document.createElement('div');
    grid2.className = 'cbw-grid';
    rest.forEach(function (b) { grid2.appendChild(buildTile(b)); });
    groupsWrap.appendChild(grid2);
  }
})();

// ---- Animations ------------------------------------------------------------
master.fromTo('.scene-' + SCENE_ID + ' .cbw-header',
  { opacity: 0, y: -12 },
  { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.2);

// Group separator sweeps (rules + headers fade)
master.fromTo('.scene-' + SCENE_ID + ' .cbw-group-header',
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.18 },
  SCENE_START + 0.6);

master.fromTo('.scene-' + SCENE_ID + ' .cbw-group-rule',
  { scaleX: 0 },
  { scaleX: 1, duration: 0.6, ease: 'power3.out', stagger: 0.18 },
  SCENE_START + 0.6);

// Badge tile staggered pop-in (the "matrix" reveal)
master.fromTo('.scene-' + SCENE_ID + ' .cbw-tile',
  { opacity: 0, scale: 0.7, transformOrigin: 'center' },
  { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.5)', stagger: 0.06 },
  SCENE_START + 0.85);

// Spotlight: enlarge + halo (halo is a CSS box-shadow already on .cbw-spotlight;
// we animate scale+opacity, leaving the static glow intact).
master.fromTo('.scene-' + SCENE_ID + ' .cbw-spotlight',
  { opacity: 0, scale: 0.86 },
  { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)' },
  SCENE_START + 1.4);

master.fromTo('.scene-' + SCENE_ID + ' .cbw-spotlight-detail',
  { opacity: 0, y: 6 },
  { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 1.85);

master.fromTo('.scene-' + SCENE_ID + ' .cbw-footer',
  { opacity: 0, y: 8 },
  { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 2.2);

// Exit fade lands 0.4s before scene end (CONTRACT §7: ≥ 0.3s before SCENE_END)
master.to('.scene-' + SCENE_ID + ' .cbw-root',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
