// CollageShatter — bridge transition: tiles shatter outward revealing incoming scene.
// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  var scope = '.scene-' + SCENE_ID + ' ';
  var grid = document.querySelector(scope + '.csh-grid');
  if (!grid) return;

  var cols = parseInt(grid.dataset.cols, 10) || 4;
  var rows = parseInt(grid.dataset.rows, 10) || 4;
  var totalTiles = cols * rows;

  // Set grid template
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  grid.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';

  // Create tiles in DOM
  for (var i = 0; i < totalTiles; i++) {
    var tile = document.createElement('div');
    tile.className = 'csh-tile';
    tile.dataset.idx = String(i);
    var inner = document.createElement('div');
    inner.className = 'csh-tile-inner';
    tile.appendChild(inner);
    grid.appendChild(tile);
  }

  // Show incoming image if src is present
  var img = document.querySelector(scope + '.csh-reveal-img');
  var imgSrc = img ? img.getAttribute('src') : '';
  if (img && imgSrc && imgSrc !== '' && imgSrc.indexOf('{{') === -1) {
    img.style.display = 'block';
  }

  // Read spread factor from props (embedded via mustache, fall back to 1.5)
  var spreadRaw = '{{spreadFactor}}';
  var spreadFactor = parseFloat(spreadRaw);
  if (isNaN(spreadFactor) || spreadFactor <= 0) spreadFactor = 1.5;

  // Deterministic pseudo-random based on tile index (no Math.random at runtime)
  function seedRand(index) {
    var s = (index + 1) * 2654435761;
    s = ((s >>> 16) ^ s) * 0x45d9f3b;
    s = ((s >>> 16) ^ s) * 0x45d9f3b;
    s = (s >>> 16) ^ s;
    return (s & 0x7fffffff) / 0x7fffffff; // 0..1
  }

  // Pre-compute per-tile shatter vectors
  var tileData = [];
  for (var t = 0; t < totalTiles; t++) {
    var col = t % cols;
    var row = Math.floor(t / cols);
    // Direction: away from center
    var cx = (col + 0.5) / cols - 0.5; // -0.5..0.5
    var cy = (row + 0.5) / rows - 0.5;
    var dist = Math.sqrt(cx * cx + cy * cy) || 0.1;
    var nx = cx / dist;
    var ny = cy / dist;
    var r = seedRand(t);
    var travel = (300 + r * 500) * spreadFactor;
    tileData.push({
      x: nx * travel,
      y: ny * travel,
      rotation: (r - 0.5) * 180, // -90..+90 degrees
      scale: 0.3 + r * 0.4,      // shrink to 0.3-0.7
      delay: seedRand(t + 100) * 0.15 // stagger 0..0.15s
    });
  }

  // Timeline phases scaled to SCENE_DURATION
  var shatterStart = SCENE_START;
  var shatterDur = SCENE_DURATION * 0.65;
  var revealStart = SCENE_START + SCENE_DURATION * 0.1;
  var revealDur = SCENE_DURATION * 0.5;

  // Phase 0: tiles start visible (inner fill)
  var tiles = scope + '.csh-tile';
  master.set(tiles, { autoAlpha: 1 }, SCENE_START);
  master.set(scope + '.csh-tile-inner', { autoAlpha: 0.92 }, SCENE_START);

  // Phase 1: each tile shatters outward
  for (var j = 0; j < totalTiles; j++) {
    var sel = scope + '.csh-tile[data-idx="' + j + '"]';
    var td = tileData[j];
    master.fromTo(sel,
      { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1 },
      {
        x: td.x,
        y: td.y,
        rotation: td.rotation,
        scale: td.scale,
        autoAlpha: 0,
        duration: shatterDur,
        ease: 'power3.in'
      },
      shatterStart + td.delay);
  }

  // Phase 2: reveal background fades up behind the shattering tiles
  master.fromTo(scope + '.csh-reveal',
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: revealDur, ease: 'power2.out' },
    revealStart);

  // Fade out at scene end
  master.to(scope + '.csh-root',
    { autoAlpha: 0, duration: Math.min(SCENE_DURATION * 0.15, 0.3), ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - Math.min(SCENE_DURATION * 0.15, 0.3));
})();
