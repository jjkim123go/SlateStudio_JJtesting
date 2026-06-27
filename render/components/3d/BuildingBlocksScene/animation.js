// Intent: glass — premium clarity for turning financial complexity into architecture.
(function () {
  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' .bbs-root');
  if (!root) return;

  var variant = (root.getAttribute('data-variant') || 'architecture').toLowerCase();
  var stage = root.querySelector('.bbs-stage');
  var cardsLayer = root.querySelector('.bbs-card-layer');
  var nodesLayer = root.querySelector('.bbs-node-layer');
  var formulaLayer = root.querySelector('.bbs-formula-layer');
  var domainsLayer = root.querySelector('.bbs-domain-layer');
  var wireLayer = root.querySelector('.bbs-wire-layer');

  var MAT = {
    enter: { duration: 0.4, ease: 'power2.out' },
    exit: { duration: 0.28, ease: 'power2.in' },
    stagger: 0.08,
    distance: 20
  };

  function parseJson(attr, fallback) {
    var raw = root.getAttribute(attr);
    if (!raw || raw.indexOf('{{') !== -1) return fallback;
    try { return JSON.parse(raw); } catch (_e) { return fallback; }
  }

  function clear(el) {
    if (el) el.innerHTML = '';
  }

  function addCard(label, x, y, cls) {
    var el = document.createElement('div');
    el.className = 'bbs-card' + (cls ? ' ' + cls : '');
    el.innerHTML = '<span class="bbs-card-label">' + escapeHtml(label) + '</span>';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    cardsLayer.appendChild(el);
    return el;
  }

  function addNode(node, cls) {
    var el = document.createElement('div');
    el.className = 'bbs-node' + (cls ? ' ' + cls : '');
    el.setAttribute('data-node-id', node.id || node.label);
    el.style.left = (node.x || 0) + 'px';
    el.style.top = (node.y || 0) + 'px';
    var sub = node.sub ? '<div class="bbs-node-sub">' + escapeHtml(node.sub) + '</div>' : '';
    el.innerHTML = '<div class="bbs-node-label">' + escapeHtml(node.label || node.id || '') + '</div>' + sub;
    nodesLayer.appendChild(el);
    return el;
  }

  function addDomain(label, x, y) {
    var el = document.createElement('div');
    el.className = 'bbs-domain';
    el.textContent = label;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    domainsLayer.appendChild(el);
    return el;
  }

  function addFormula(line) {
    var el = document.createElement('div');
    el.className = 'bbs-formula-line';
    el.textContent = line;
    formulaLayer.querySelector('.bbs-formula').appendChild(el);
    return el;
  }

  function addWire(x1, y1, x2, y2, cls, label) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var mid = Math.max(80, Math.abs(x2 - x1) * 0.35);
    var d = 'M' + x1 + ',' + y1 + ' C' + (x1 + mid) + ',' + y1 + ' ' + (x2 - mid) + ',' + y2 + ' ' + x2 + ',' + y2;
    path.setAttribute('d', d);
    path.setAttribute('class', 'bbs-wire' + (cls ? ' ' + cls : ''));
    if (label) path.setAttribute('data-label', label);
    wireLayer.appendChild(path);
    return path;
  }

  function cardCenter(point) {
    return [point[0] + 118, point[1] + 43];
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function repeatAcross(startOffset, cycleSeconds, endPad) {
    var span = Math.max(0, SCENE_DURATION - startOffset - (endPad || 0.55));
    return Math.max(0, Math.ceil(span / cycleSeconds) - 1);
  }

  function layoutStorm() {
    var isV2 = variant === 'storm-v2';
    var chips = parseJson('data-chips', isV2 ? ['Seats', 'Usage', 'Credits', 'Commitments', 'Tax', 'Invoices', 'Payouts', 'Currency', 'Marketplace', 'Partner'] : ['Seats', 'Azure usage', 'Marketplace', 'Credits', 'Invoice', 'Currency', 'Tax', 'Payout']);
    var points = isV2 ? [[120, 384], [382, 312], [650, 404], [904, 304], [1192, 388], [1440, 326], [1270, 608], [930, 650], [560, 590], [254, 620]] : [[186, 412], [484, 326], [802, 368], [1124, 322], [1402, 424], [1190, 616], [802, 654], [410, 582]];
    chips.forEach(function (chip, i) {
      addCard(chip, points[i % points.length][0], points[i % points.length][1], i % 3 === 0 ? 'anchor' : '');
    });
  }

  function layoutTangle() {
    var isV2 = variant === 'tangle-v2';
    var labels = isV2 ? ['Billed?', 'Earned?', 'Balance?', 'Tax?', 'Paid?', 'Proven?'] : parseJson('data-chips', ['Revenue', 'Billing', 'Balance', 'Tax', 'Reporting', 'Payouts', 'Controls']);
    var points = isV2 ? [[230, 330], [610, 286], [1010, 324], [1390, 304], [1132, 586], [408, 586]] : [[210, 330], [600, 294], [996, 330], [1380, 304], [1130, 572], [400, 572], [760, 450]];
    labels.forEach(function (label, i) { addCard(label, points[i][0], points[i][1]); });
    var pairs = isV2 ? [[0, 2], [1, 4], [2, 5], [3, 0], [4, 3], [5, 1], [0, 4], [2, 3], [5, 0]] : [[0, 2], [0, 4], [1, 5], [2, 4], [3, 6], [5, 1], [6, 0], [4, 3], [1, 3]];
    pairs.forEach(function (p, i) {
      var a = cardCenter(points[p[0]]);
      var b = cardCenter(points[p[1]]);
      addWire(a[0], a[1], b[0], b[1], i % 3 === 0 ? 'hot' : '');
    });
  }

  function layoutPressure() {
    var labels = ['Speed', 'Consistency', 'Auditability', 'Trust', 'One-off path', 'One-off path'];
    var points = [[258, 326], [520, 610], [1004, 296], [1288, 614], [728, 428], [914, 486]];
    labels.forEach(function (label, i) { addCard(label, points[i][0], points[i][1], i > 3 ? 'anchor' : ''); });
    points.forEach(function (point, i) {
      var c = cardCenter(point);
      addWire(c[0], c[1], 870, 508, i > 3 ? 'hot' : '');
    });
  }

  function layoutPatternExtract() {
    var labels = ['Recognize', 'Bill', 'Decrement', 'Tax', 'Report', 'Pay'];
    var points = [[190, 410], [460, 590], [740, 350], [1030, 590], [1292, 410], [790, 620]];
    labels.forEach(function (label, i) { addCard(label, points[i][0], points[i][1], i === 0 ? 'anchor' : ''); });
    points.forEach(function (point, i) {
      var c = cardCenter(point);
      addWire(870, 506, c[0], c[1], i % 2 === 0 ? 'hot' : '');
    });
  }

  function layoutArchitecture() {
    var isAssembly = variant === 'assembly-v2';
    var chips = parseJson('data-chips', isAssembly ? ['Recognize', 'Bill', 'Track', 'Tax', 'Report', 'Control'] : ['Revenue', 'Billing', 'Commitments', 'Credits', 'Tax', 'Reporting']);
    var startX = 256, startY = 344, gapX = 410, gapY = 164;
    chips.forEach(function (chip, i) {
      addCard(chip, startX + (i % 3) * gapX, startY + Math.floor(i / 3) * gapY, i === 0 ? 'anchor' : '');
    });
    if (isAssembly) {
      [[374, 387, 784, 387], [1194, 387, 784, 550], [374, 550, 784, 550], [1194, 550, 784, 550]].forEach(function (w, i) {
        addWire(w[0], w[1], w[2], w[3], i % 2 === 0 ? 'hot' : '');
      });
    }
  }

  function layoutDualPath() {
    var nodes = [
      { id: 'sub', label: 'Subscription', sub: 'one path', x: 168, y: 342 },
      { id: 'seat', label: 'Per Seat', sub: 'quantity', x: 500, y: 278 },
      { id: 'rec', label: 'Recognition', sub: 'earning', x: 500, y: 430 },
      { id: 'bill', label: 'Billing', sub: 'timing', x: 500, y: 582 },
      { id: 'usage', label: 'Consumption', sub: 'another path', x: 1000, y: 342 },
      { id: 'macc', label: 'Commitment', sub: 'decrement', x: 1326, y: 278 },
      { id: 'credit', label: 'Credits', sub: 'blend', x: 1326, y: 430 },
      { id: 'control', label: 'Controls', sub: 'prove', x: 1326, y: 582 }
    ];
    nodes.forEach(function (node, i) { addNode(node, i === 0 || i === 4 ? 'anchor' : ''); });
    [[448, 402, 500, 338], [448, 402, 500, 490], [448, 402, 500, 642], [1280, 402, 1326, 338], [1280, 402, 1326, 490], [1280, 402, 1326, 642]].forEach(function (w, i) {
      addWire(w[0], w[1], w[2], w[3], i % 2 === 0 ? 'hot' : '');
    });
  }

  function layoutArchitectureMorph() {
    var blockPoints = [[232, 352], [530, 586], [796, 346], [1070, 586], [1350, 352]];
    var nodePoints = [[198, 426], [500, 294], [500, 570], [920, 426], [1306, 426]];
    var labels = ['Offer', 'Revenue', 'Billing', 'Balance', 'Controls'];
    labels.forEach(function (label, i) { addCard(label, blockPoints[i][0], blockPoints[i][1], i === 0 ? 'anchor' : ''); });
    labels.forEach(function (label, i) { addNode({ id: label.toLowerCase(), label: label, sub: i === 0 ? 'scenario' : 'building block', x: nodePoints[i][0], y: nodePoints[i][1] }, i === 0 ? 'anchor' : ''); });
    [[478, 486, 500, 354], [478, 486, 500, 630], [780, 354, 920, 486], [780, 630, 920, 486], [1200, 486, 1306, 486]].forEach(function (w, i) {
      addWire(w[0], w[1], w[2], w[3], i % 2 === 0 ? 'hot' : '');
    });
  }

  function layoutBlockGrid() {
    var chips = parseJson('data-chips', ['Revenue Recognition', 'Billing Plans', 'Commitments', 'Credits', 'Tax', 'Invoicing', 'Reporting', 'Payouts']);
    var startX = 92, startY = 348, gapX = 410, gapY = 172;
    chips.forEach(function (chip, i) {
      var cls = chip.length > 12 ? 'wide' : '';
      if (i === 0) cls += (cls ? ' ' : '') + 'anchor';
      addCard(chip, startX + (i % 4) * gapX, startY + Math.floor(i / 4) * gapY, cls);
    });
  }

  function layoutComposition() {
    var formula = parseJson('data-formula', ['Subscription', '= Per Seat', '+ Time-Based Rev Rec', '+ Billing Plans', '+ Dimensions']);
    var wrap = document.createElement('div');
    wrap.className = 'bbs-formula';
    formulaLayer.appendChild(wrap);
    formula.forEach(addFormula);
    addNode({ id: 'offer', label: 'Subscription', sub: 'simple customer promise', x: 188, y: 430 }, 'anchor');
    addNode({ id: 'path', label: 'Control Path', sub: 'assembled from trusted parts', x: 1426, y: 430 }, 'anchor');
    addWire(468, 490, 1426, 490, 'hot');
  }

  function layoutConsumption() {
    var nodes = [
      { id: 'usage', label: 'Usage events', sub: 'metered activity', x: 212, y: 348 },
      { id: 'cbrr', label: 'CBRR', sub: 'consumption revenue', x: 638, y: 348 },
      { id: 'credits', label: 'Credits', sub: 'blend rules', x: 638, y: 594 },
      { id: 'controls', label: 'Controls', sub: 'validate result', x: 1232, y: 482 }
    ];
    nodes.forEach(function (n, i) { addNode(n, i === 0 ? 'anchor' : ''); });
    addWire(492, 408, 638, 408, 'hot');
    addWire(918, 408, 1222, 524, 'hot');
    addWire(918, 654, 1222, 552, 'hot');
    addWire(878, 468, 1210, 562, '');
  }

  function layoutDomainMap() {
    var domains = parseJson('data-domains', ['Revenue', 'Balance', 'Invoicing', 'Tax', 'Reporting', 'Payouts', 'Cross-cutting']);
    var cx = 870, cy = 540, rx = 560, ry = 230;
    domains.forEach(function (label, i) {
      if (i === 0) {
        addDomain(label, cx - 115, cy - 58);
      } else {
        var a = ((i - 1) / Math.max(domains.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
        var x = cx + Math.cos(a) * rx;
        var y = cy + Math.sin(a) * ry;
        addDomain(label, x - 115, y - 58);
        if (variant === 'domain-orbit') addWire(cx, cy, x, y, i % 2 ? 'hot' : '');
      }
    });
  }

  function layoutBlueprint() {
    layoutArchitecture();
  }

  function build() {
    clear(cardsLayer); clear(nodesLayer); clear(formulaLayer); clear(domainsLayer); clear(wireLayer);
    root.querySelector('.bbs-blueprint-frame').style.display = (variant === 'blueprint' || variant === 'architecture-morph') ? 'block' : 'none';
    root.querySelector('.bbs-reservoir').style.display = variant === 'consumption' ? 'grid' : 'none';
    root.querySelector('.bbs-pulse').style.display = variant === 'consumption' ? 'block' : 'none';
    if (variant !== 'consumption') root.querySelector('.bbs-pulse').style.opacity = 0;
    if (variant === 'storm' || variant === 'storm-v2') layoutStorm();
    else if (variant === 'tangle' || variant === 'tangle-v2') layoutTangle();
    else if (variant === 'pressure') layoutPressure();
    else if (variant === 'pattern-extract') layoutPatternExtract();
    else if (variant === 'block-grid') layoutBlockGrid();
    else if (variant === 'composition') layoutComposition();
    else if (variant === 'dual-path') layoutDualPath();
    else if (variant === 'consumption') layoutConsumption();
    else if (variant === 'domain-map' || variant === 'domain-orbit') layoutDomainMap();
    else if (variant === 'blueprint') layoutBlueprint();
    else if (variant === 'architecture-morph') layoutArchitectureMorph();
    else layoutArchitecture();
  }

  build();

  var t = SCENE_START;
  var out = Math.max(t + SCENE_DURATION - 0.55, t + 0.5);
  gsap.set(S + ' .bbs-hero-statement', { xPercent: -50 });

  function hashSeed(value) {
    var h = 2166136261;
    var text = String(value || 'building-blocks');
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededRandom(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      var x = state;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function easeOutCubic(value) {
    var t = clamp01(value);
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOut(value) {
    var t = clamp01(value);
    return t * t * (3 - 2 * t);
  }

  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  function registerThreeDepthLayer() {
    var canvas = root.querySelector('.bbs-three-canvas');
    if (!canvas || !window.__slateThree || typeof window.__slateThree.register !== 'function') return;

    var state = { initialized: false, disposed: false };
    var seed = hashSeed(SCENE_ID + ':' + variant);
    var rng = seededRandom(seed);
    var accentA = 0x20a6c9;
    var accentB = 0xcaa86a;
    var accentC = 0x8d6df5;

    window.__slateThree.register(SCENE_ID + ':building-blocks-depth', {
      init: function (THREE) {
        var width = canvas.clientWidth || 1740;
        var height = canvas.clientHeight || 892;
        var renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        renderer.setClearColor(0x000000, 0);
        if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace) {
          renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(34, width / Math.max(1, height), 0.1, 100);
        camera.position.set(0, 0.32, 8.4);

        var rig = new THREE.Group();
        var blockGroup = new THREE.Group();
        var particleGroup = new THREE.Group();
        var lineGroup = new THREE.Group();
        rig.add(lineGroup);
        rig.add(blockGroup);
        rig.add(particleGroup);
        scene.add(rig);

        scene.add(new THREE.AmbientLight(0xffffff, 0.82));
        var key = new THREE.DirectionalLight(0xffffff, 1.65);
        key.position.set(-3.6, 4.8, 6.2);
        scene.add(key);
        var cyan = new THREE.PointLight(accentA, 4.5, 14);
        cyan.position.set(-4.4, 0.8, 4.8);
        scene.add(cyan);
        var gold = new THREE.PointLight(accentB, 3.2, 13);
        gold.position.set(4.2, -1.4, 5.2);
        scene.add(gold);

        var blockGeometry = new THREE.BoxGeometry(0.86, 0.38, 0.18);
        var nodeGeometry = new THREE.IcosahedronGeometry(0.1, 1);
        var particleGeometry = new THREE.SphereGeometry(0.025, 8, 8);
        var torusGeometry = new THREE.TorusGeometry(2.56, 0.012, 8, 120);
        var geometries = [blockGeometry, nodeGeometry, particleGeometry, torusGeometry];
        var materials = [];

        function makeMaterial(color, opacity) {
          var material = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.18,
            roughness: 0.18,
            transparent: true,
            opacity: opacity,
            transmission: 0.42,
            thickness: 0.18,
            clearcoat: 0.72,
            clearcoatRoughness: 0.16,
            emissive: color,
            emissiveIntensity: 0.035,
            depthWrite: false
          });
          materials.push(material);
          return material;
        }

        var glass = makeMaterial(0xfdfaf2, 0.54);
        var hotGlass = makeMaterial(accentB, 0.48);
        var coolGlass = makeMaterial(accentA, 0.42);
        var violetGlass = makeMaterial(accentC, 0.30);
        var lineMaterial = new THREE.LineBasicMaterial({ color: accentA, transparent: true, opacity: 0.32, depthWrite: false });
        var hotLineMaterial = new THREE.LineBasicMaterial({ color: accentB, transparent: true, opacity: 0.52, depthWrite: false });
        var particleMaterial = new THREE.MeshBasicMaterial({ color: accentB, transparent: true, opacity: 0.58, depthWrite: false });
        var ringMaterial = new THREE.MeshBasicMaterial({ color: accentA, transparent: true, opacity: 0.18, depthWrite: false });
        materials.push(lineMaterial, hotLineMaterial, particleMaterial, ringMaterial);

        var finalPositions = [
          [-2.95, 0.9, 0.2], [-1.48, 1.32, -0.05], [0.1, 0.95, 0.16], [1.62, 1.28, -0.08], [3.02, 0.88, 0.18],
          [-2.4, -0.7, -0.04], [-0.88, -1.0, 0.14], [0.62, -0.66, -0.12], [2.1, -1.02, 0.10], [3.18, -0.34, -0.18]
        ];
        var blocks = [];
        for (var i = 0; i < 10; i++) {
          var material = i % 5 === 0 ? hotGlass : (i % 3 === 0 ? coolGlass : glass);
          var mesh = new THREE.Mesh(blockGeometry, material);
          var startAngle = (i / 10) * Math.PI * 2 + rng() * 0.35;
          mesh.userData = {
            final: finalPositions[i],
            orbitRadius: 2.2 + rng() * 1.75,
            startAngle: startAngle,
            ySeed: -0.9 + rng() * 1.8,
            spin: (rng() > 0.5 ? 1 : -1) * (0.35 + rng() * 0.9)
          };
          blockGroup.add(mesh);
          blocks.push(mesh);
        }

        var rings = [];
        for (var r = 0; r < 3; r++) {
          var ring = new THREE.Mesh(torusGeometry, ringMaterial);
          ring.rotation.x = Math.PI / 2 + r * 0.28;
          ring.rotation.y = r * 0.55;
          ring.scale.setScalar(0.78 + r * 0.34);
          rig.add(ring);
          rings.push(ring);
        }

        var particles = [];
        for (var p = 0; p < 120; p++) {
          var particle = new THREE.Mesh(particleGeometry, particleMaterial);
          var radius = 1.35 + rng() * 3.65;
          var angle = rng() * Math.PI * 2;
          particle.userData = {
            radius: radius,
            angle: angle,
            y: -1.8 + rng() * 3.6,
            speed: 0.18 + rng() * 0.38
          };
          particleGroup.add(particle);
          particles.push(particle);
        }

        var lines = [];
        function makeLine(a, b, hot) {
          var geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(finalPositions[a][0], finalPositions[a][1], finalPositions[a][2] - 0.08),
            new THREE.Vector3(finalPositions[b][0], finalPositions[b][1], finalPositions[b][2] - 0.08)
          ]);
          geometries.push(geometry);
          var line = new THREE.Line(geometry, hot ? hotLineMaterial : lineMaterial);
          line.userData = { a: a, b: b, hot: hot };
          lineGroup.add(line);
          lines.push(line);
        }
        [[0, 2, true], [1, 4, false], [2, 6, true], [3, 7, false], [4, 8, true], [5, 6, false], [6, 8, true], [7, 9, false], [2, 8, true]].forEach(function (edge) {
          makeLine(edge[0], edge[1], edge[2]);
        });

        state = {
          initialized: true,
          disposed: false,
          renderer: renderer,
          scene: scene,
          camera: camera,
          rig: rig,
          blockGroup: blockGroup,
          particleGroup: particleGroup,
          lineGroup: lineGroup,
          blocks: blocks,
          rings: rings,
          particles: particles,
          lines: lines,
          geometries: geometries,
          materials: materials
        };
      },
      renderAtTime: function (compositionTime, THREE) {
        if (!state.initialized || state.disposed) return;
        var local = Math.max(0, Math.min(SCENE_DURATION, compositionTime - SCENE_START));
        var progress = SCENE_DURATION > 0 ? local / SCENE_DURATION : 0;
        var width = canvas.clientWidth || 1740;
        var height = canvas.clientHeight || 892;
        if (state.renderer.domElement.width !== width || state.renderer.domElement.height !== height) {
          state.renderer.setSize(width, height, false);
          state.camera.aspect = width / Math.max(1, height);
          state.camera.updateProjectionMatrix();
        }

        var storm = variant === 'storm-v2';
        var pressureLike = variant === 'tangle-v2' || variant === 'pressure';
        var assemblyLike = variant === 'assembly-v2' || variant === 'architecture-morph' || variant === 'blueprint';
        var orbitLike = variant === 'domain-orbit';
        var patternLike = variant === 'pattern-extract';
        var dualLike = variant === 'dual-path';
        var settle = storm ? easeInOut((local - 1.05) / 2.75) : easeOutCubic(progress * 1.45);
        var compression = pressureLike ? easeInOut((local - SCENE_DURATION * 0.35) / (SCENE_DURATION * 0.45)) : 0;
        var expansion = patternLike ? easeOutCubic((local - 1.15) / 3.2) : 0;
        var architecture = assemblyLike ? easeInOut((local - SCENE_DURATION * 0.18) / (SCENE_DURATION * 0.58)) : 0;

        for (var i = 0; i < state.blocks.length; i++) {
          var block = state.blocks[i];
          var data = block.userData;
          var a = data.startAngle + local * (storm ? 1.45 : orbitLike ? 0.44 : 0.18);
          var orbitRadius = data.orbitRadius * (storm ? mix(1.35, 0.22, settle) : mix(0.58, 0.12, architecture));
          var target = data.final;
          var x = mix(Math.cos(a) * orbitRadius, target[0], settle);
          var y = mix(data.ySeed + Math.sin(a * 1.8) * 0.45, target[1], settle);
          var z = mix(Math.sin(a) * orbitRadius - 0.3, target[2], settle);

          if (pressureLike) {
            x = mix(x, (i % 2 ? 0.22 : -0.22) + Math.sin(local * 5 + i) * 0.08, compression);
            y = mix(y, Math.cos(local * 4.2 + i) * 0.16, compression);
            z = mix(z, 0.2 + Math.sin(local * 6 + i) * 0.12, compression);
          } else if (patternLike) {
            x = mix(Math.sin(i * 1.7) * 0.45, target[0] * 0.9, expansion);
            y = mix(Math.cos(i * 1.3) * 0.22, target[1] * 0.82, expansion);
            z = mix(0.35, target[2], expansion);
          } else if (dualLike) {
            var side = i < 5 ? -1 : 1;
            x = side * (1.05 + (i % 5) * 0.42);
            y = -0.9 + (i % 5) * 0.42 + Math.sin(local * 1.4 + i) * 0.04;
            z = target[2];
          } else if (assemblyLike) {
            x = mix(target[0] * 1.35, target[0] * 0.72, architecture);
            y = mix(target[1] * 1.18, target[1] * 0.78, architecture);
            z = mix(0.45, -0.05, architecture);
          }

          block.position.set(x, y, z);
          block.rotation.x = Math.sin(local * 0.62 + i) * 0.12 + (storm ? (1 - settle) * 0.7 : 0);
          block.rotation.y = data.spin * local + (storm ? (1 - settle) * 1.4 : 0);
          block.rotation.z = Math.sin(local * 0.38 + i * 0.4) * 0.06;
          block.scale.setScalar(mix(0.82, assemblyLike ? 1.08 : 1.0, easeOutCubic(progress * 1.8)) * (pressureLike ? mix(1, 0.62, compression) : 1));
        }

        state.rig.rotation.x = -0.09 + Math.sin(local * 0.25) * 0.035;
        state.rig.rotation.y = (storm ? mix(-0.58, 0.08, settle) : -0.1) + Math.sin(local * 0.2) * 0.08;
        state.rig.position.y = 0.05 + Math.sin(local * 0.33) * 0.035;
        state.rig.position.z = assemblyLike ? mix(0, 0.42, architecture) : 0;

        for (var r = 0; r < state.rings.length; r++) {
          var ring = state.rings[r];
          ring.rotation.z = local * (0.18 + r * 0.08) + r;
          ring.rotation.y += 0.002 * (r + 1);
          ring.material.opacity = storm || orbitLike ? 0.15 + Math.sin(local * 1.2 + r) * 0.035 : 0.07;
        }

        for (var p = 0; p < state.particles.length; p++) {
          var particle = state.particles[p];
          var pd = particle.userData;
          var pa = pd.angle + local * pd.speed * (storm ? 3.2 : pressureLike ? 1.3 : 1.0);
          var pr = pressureLike ? mix(pd.radius, 0.55, compression) : pd.radius;
          particle.position.set(Math.cos(pa) * pr, pd.y + Math.sin(local * 0.7 + p) * 0.08, Math.sin(pa) * pr - 0.2);
          particle.scale.setScalar(pressureLike ? mix(1, 1.8, compression) : 1);
        }

        var lineOpacity = assemblyLike ? mix(0.05, 0.48, architecture) : pressureLike ? mix(0.24, 0.76, compression) : 0.22 + Math.sin(local * 1.4) * 0.06;
        state.lines.forEach(function (line, idx) {
          line.visible = !storm || progress > 0.35;
          line.material.opacity = line.userData.hot ? lineOpacity + 0.16 : lineOpacity;
          var pulse = Math.sin(local * 2.8 + idx * 0.7) * 0.04;
          line.scale.setScalar(1 + pulse);
        });

        state.camera.position.x = Math.sin(local * 0.18) * 0.22;
        state.camera.position.y = 0.28 + Math.cos(local * 0.16) * 0.08;
        state.camera.position.z = 8.35 - (storm ? easeOutCubic(progress) * 0.42 : assemblyLike ? architecture * 0.28 : 0);
        state.camera.lookAt(0, 0, 0);
        state.renderer.render(state.scene, state.camera);
      },
      dispose: function () {
        if (!state.initialized || state.disposed) return;
        state.geometries.forEach(function (geometry) { if (geometry && geometry.dispose) geometry.dispose(); });
        state.materials.forEach(function (material) { if (material && material.dispose) material.dispose(); });
        if (state.renderer && state.renderer.dispose) state.renderer.dispose();
        state.disposed = true;
        state.initialized = false;
      }
    });
  }

  registerThreeDepthLayer();

  master.fromTo(S + ' .bbs-orb-a', { x: -20, y: 8, autoAlpha: 0.36 }, { x: 26, y: -12, autoAlpha: 0.58, duration: SCENE_DURATION, ease: 'sine.inOut' }, t);
  master.fromTo(S + ' .bbs-orb-b', { x: 24, y: -12, autoAlpha: 0.30 }, { x: -18, y: 20, autoAlpha: 0.54, duration: SCENE_DURATION, ease: 'sine.inOut' }, t);
  master.fromTo(S + ' .bbs-spark.s1', { x: -80, y: 30, scale: 0.7, autoAlpha: 0.25 }, { x: 220, y: -44, scale: 1.25, autoAlpha: 0.72, duration: SCENE_DURATION * 0.92, ease: 'sine.inOut' }, t + 0.1);
  master.fromTo(S + ' .bbs-spark.s2', { x: 120, y: -24, scale: 1, autoAlpha: 0.18 }, { x: -240, y: 82, scale: 0.65, autoAlpha: 0.60, duration: SCENE_DURATION * 0.88, ease: 'sine.inOut' }, t + 0.2);
  master.fromTo(S + ' .bbs-spark.s3', { x: -60, y: -40, scale: 0.85, autoAlpha: 0.16 }, { x: 160, y: 38, scale: 1.15, autoAlpha: 0.52, duration: SCENE_DURATION * 0.9, ease: 'sine.inOut' }, t + 0.3);

  master.fromTo(S + ' .bbs-eyebrow', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ...MAT.enter }, t + 0.12);
  master.fromTo(S + ' .bbs-title', { y: MAT.distance, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, t + 0.28);
  master.fromTo(S + ' .bbs-subtitle', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ...MAT.enter }, t + 0.72);
  master.fromTo(S + ' .bbs-footer', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.36, ease: 'power2.out' }, t + Math.max(1.1, SCENE_DURATION - 2.2));

  if (variant === 'storm-v2') {
    master.set(S + ' .bbs-copy', { autoAlpha: 0 }, t);
    master.to(S + ' .bbs-copy', { autoAlpha: 1, duration: 0.28, ease: 'power1.out' }, t + 2.35);
    master.fromTo(S + ' .bbs-card', {
      x: function (i) { return [-1360, 1180, -940, 1120, -220, 760, -1180, 1340, -620, 980][i % 10]; },
      y: function (i) { return [-520, -620, 710, 580, -700, 650, 420, -430, 740, -560][i % 10]; },
      z: function (i) { return [-580, -460, -620, -420, -720, -520, -620, -480, -660, -540][i % 10]; },
      rotation: function (i) { return [-56, 44, 66, -48, 38, -58, 46, -42, 52, -36][i % 10]; },
      rotationX: function (i) { return [28, -22, 32, -28, 24, -34, 22, -26, 30, -20][i % 10]; },
      rotationY: function (i) { return [-62, 52, -44, 64, -50, 46, -56, 58, -48, 50][i % 10]; },
      scale: 0.36,
      autoAlpha: 0
    }, {
      x: function (i) { return [160, -140, 210, -190, 120, -160, 180, -220, 130, -110][i % 10]; },
      y: function (i) { return [-60, 44, 86, -74, 108, -92, 38, 72, -106, 56][i % 10]; },
      z: 90,
      rotation: '+=180_cw',
      rotationX: 0,
      rotationY: 0,
      scale: 0.92,
      autoAlpha: 1,
      duration: 1.05,
      ease: 'power4.out',
      stagger: { each: 0.035, from: 'random' }
    }, t + 0.1);
    master.to(S + ' .bbs-card', { x: 0, y: 0, z: 0, rotation: function (i) { return [-3, 2, -2, 2.6, -2.4, 2.1, -2.6, 1.7, -2, 2.3][i % 10]; }, scale: 1, duration: 1.25, ease: 'power3.inOut', stagger: { each: 0.025, from: 'center' } }, t + 1.35);
    master.to(S + ' .bbs-card', { x: function (i) { return Math.cos(i) * 18; }, y: function (i) { return Math.sin(i * 1.7) * 16; }, duration: Math.max(2.5, SCENE_DURATION - 3.2), ease: 'sine.inOut', stagger: { each: 0.045, from: 'center' } }, t + 3.1);
  } else if (variant === 'storm') {
    master.fromTo(S + ' .bbs-card', {
      x: function (i) { return [-1120, 980, -760, 860, 120, 640, -940, 1120][i % 8]; },
      y: function (i) { return [-430, -520, 610, 520, -620, 610, 330, -340][i % 8]; },
      z: function (i) { return [-360, -240, -420, -260, -520, -320, -440, -220][i % 8]; },
      rotation: function (i) { return [-42, 36, 52, -38, 28, -46, 40, -32][i % 8]; },
      rotationX: function (i) { return [22, -18, 28, -24, 18, -30, 20, -22][i % 8]; },
      rotationY: function (i) { return [-52, 42, -34, 54, -40, 36, -46, 48][i % 8]; },
      scale: 0.48,
      autoAlpha: 0
    }, {
      x: 0,
      y: 0,
      z: 0,
      rotation: function (i) { return [-3, 2.4, -1.8, 2.8, -2.2, 2.1, -2.6, 1.7][i % 8]; },
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      autoAlpha: 1,
      duration: 1.45,
      ease: 'power4.out',
      stagger: { each: 0.04, from: 'random' }
    }, t + 0.28);
    master.to(S + ' .bbs-card', { rotation: '+=8', y: '-=26', z: 72, duration: 0.5, ease: 'power2.inOut', stagger: { each: 0.032, from: 'random', yoyo: true, repeat: 1 } }, t + 1.18);
    master.to(S + ' .bbs-card', { y: '-=14', rotation: '+=1.4', duration: 3.4, ease: 'sine.inOut', stagger: { each: 0.08, yoyo: true, repeat: 1 } }, t + 2.04);
  } else if (variant === 'tangle-v2') {
    master.fromTo(S + ' .bbs-card', { scale: 0.88, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.34, ease: 'power3.out', stagger: 0.06 }, t + 0.2);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 900, strokeDashoffset: 900, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.58, ease: 'power1.out', stagger: 0.06 }, t + 0.9);
    master.to(S + ' .bbs-card', { x: function (i) { return [16, -12, 20, -18, 14, -16][i % 6]; }, y: function (i) { return [-8, 12, -10, 8, -12, 10][i % 6]; }, duration: Math.max(3.2, SCENE_DURATION - 2.0), ease: 'sine.inOut', stagger: { each: 0.05, yoyo: true, repeat: 1 } }, t + 1.7);
    master.fromTo(S + ' .bbs-pressure-point', { scale: 0.4, autoAlpha: 0 }, { scale: 1.35, autoAlpha: 0.75, duration: 0.54, ease: 'power2.out', repeat: 3, yoyo: true, repeatDelay: 0.18 }, t + Math.max(2.6, SCENE_DURATION - 3.4));
  } else if (variant === 'tangle') {
    master.fromTo(S + ' .bbs-card', { scale: 0.88, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ...MAT.enter, stagger: 0.06 }, t + 0.2);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 900, strokeDashoffset: 900, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.7, ease: 'power1.out', stagger: 0.06 }, t + 0.9);
    master.to(S + ' .bbs-card', { scale: 0.96, duration: 0.3, ease: 'power3.inOut', stagger: { each: 0.025, from: 'center', yoyo: true, repeat: 1 } }, t + SCENE_DURATION - 1.7);
  } else if (variant === 'pressure') {
    master.fromTo(S + ' .bbs-card', { scale: 0.72, x: function (i) { return i % 2 ? 80 : -80; }, autoAlpha: 0 }, { scale: 1, x: 0, autoAlpha: 1, duration: 0.34, ease: 'power3.out', stagger: 0.05 }, t + 0.25);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 900, strokeDashoffset: 900, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.55, ease: 'power1.out', stagger: 0.045 }, t + 1.0);
    master.to(S + ' .bbs-card', { x: function (i) { return [150, 94, -114, -150, 56, -50][i % 6]; }, y: function (i) { return [88, -120, 98, -106, 24, -20][i % 6]; }, scale: 0.82, autoAlpha: 0.78, duration: 1.65, ease: 'power3.in' }, t + 2.0);
    master.fromTo(S + ' .bbs-pressure-point', { scale: 0.3, autoAlpha: 0 }, { scale: 1.65, autoAlpha: 0.86, duration: 0.48, ease: 'power3.out', repeat: 5, yoyo: true, repeatDelay: 0.12 }, t + 3.0);
    master.to(S + ' .bbs-stage', { x: 5, duration: 0.06, ease: 'none', repeat: 7, yoyo: true }, t + 4.1);
  } else if (variant === 'pattern-extract') {
    master.fromTo(S + ' .bbs-pressure-point', { scale: 1.4, autoAlpha: 0.72 }, { scale: 0.75, autoAlpha: 0.35, duration: 1.2, ease: 'power1.inOut' }, t + 0.2);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 900, strokeDashoffset: 900, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.72, ease: 'power1.out', stagger: 0.08 }, t + 1.1);
    master.fromTo(S + ' .bbs-card', { scale: 0.58, x: function (i) { return [520, 320, 90, -130, -360, 40][i % 6]; }, y: function (i) { return [80, -120, 150, -140, 90, -80][i % 6]; }, autoAlpha: 0 }, { scale: 1, x: 0, y: 0, autoAlpha: 1, duration: 0.72, ease: 'power2.out', stagger: { each: 0.08, from: 'center' } }, t + 1.75);
    master.to(S + ' .bbs-card', { x: function (i) { return i % 2 ? '+=24' : '-=22'; }, y: function (i) { return i % 2 ? '-=24' : '+=18'; }, rotation: function (i) { return i % 2 ? 3.2 : -3.0; }, duration: 0.68, ease: 'sine.inOut', stagger: 0.055, repeat: repeatAcross(3.25, 0.78), yoyo: true }, t + 3.25);
    master.to(S + ' .bbs-pressure-point', { scale: 1.08, autoAlpha: 0.72, duration: 0.42, ease: 'sine.inOut', repeat: repeatAcross(3.15, 0.52), yoyo: true }, t + 3.15);
    master.to(S + ' .bbs-wire.hot', { strokeDashoffset: '-=180', autoAlpha: 0.92, duration: 0.5, ease: 'sine.inOut', repeat: repeatAcross(3.2, 0.58), yoyo: true }, t + 3.2);
  } else if (variant === 'assembly-v2') {
    master.fromTo(S + ' .bbs-card', { scale: 0.48, rotationY: -50, autoAlpha: 0 }, { scale: 1, rotationY: 0, autoAlpha: 1, duration: 0.56, ease: 'back.out(1.25)', stagger: { each: 0.08, from: 'center' } }, t + 0.45);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 900, strokeDashoffset: 900, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.62, ease: 'power1.out', stagger: 0.06 }, t + 1.85);
    master.to(S + ' .bbs-card', { scale: 1.035, duration: 0.2, ease: 'power2.out', stagger: { each: 0.06, from: 'center', yoyo: true, repeat: 1 } }, t + 2.2);
    master.fromTo(S + ' .bbs-hero-statement', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, t + 3.4);
  } else if (variant === 'composition') {
    master.fromTo(S + ' .bbs-node', { x: -24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ...MAT.enter, stagger: 0.14 }, t + 0.35);
    master.fromTo(S + ' .bbs-formula-line', { x: 30, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.38, ease: 'power2.out', stagger: 0.2 }, t + 1.0);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 800, strokeDashoffset: 800, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.7, ease: 'power1.out' }, t + 1.65);
  } else if (variant === 'dual-path') {
    master.fromTo(S + ' .bbs-node', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.36, ease: 'power2.out', stagger: { each: 0.08, from: 'start' } }, t + 0.35);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 900, strokeDashoffset: 900, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.58, ease: 'power1.out', stagger: 0.055 }, t + 1.25);
    master.to(S + ' .bbs-node', { scale: function (i) { return i < 4 ? 1.04 : 0.96; }, duration: 0.34, ease: 'power2.inOut', stagger: { each: 0.04, yoyo: true, repeat: 1 } }, t + 2.0);
    master.to(S + ' .bbs-node', { scale: function (i) { return i >= 4 ? 1.04 : 0.96; }, duration: 0.34, ease: 'power2.inOut', stagger: { each: 0.04, yoyo: true, repeat: 1 } }, t + 4.25);
    master.to(S + ' .bbs-wire.hot', { autoAlpha: 0.86, duration: Math.max(2.5, SCENE_DURATION - 2.4), ease: 'sine.inOut' }, t + 2.2);
  } else if (variant === 'consumption') {
    master.fromTo(S + ' .bbs-node', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ...MAT.enter, stagger: 0.12 }, t + 0.35);
    master.fromTo(S + ' .bbs-reservoir', { scale: 0.86, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'power2.out' }, t + 1.1);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 900, strokeDashoffset: 900, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.65, ease: 'power1.out', stagger: 0.08 }, t + 1.25);
    master.fromTo(S + ' .bbs-pulse', { left: 960, top: 168, scale: 0.65, autoAlpha: 0 }, { left: 1416, top: 376, scale: 1, autoAlpha: 1, duration: 1.35, ease: 'power1.inOut', repeat: 1, repeatDelay: 0.3 }, t + 2.0);
  } else if (variant === 'domain-orbit') {
    master.fromTo(S + ' .bbs-domain', { scale: 0.84, y: 16, autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, ...MAT.enter, stagger: { each: 0.1, from: 'center' } }, t + 0.52);
    master.to(S + ' .bbs-domain', { x: function (i) { return Math.cos(i * 0.9) * 18; }, y: function (i) { return Math.sin(i * 0.9) * 16; }, rotation: 1.8, duration: Math.max(2.8, SCENE_DURATION - 2.2), ease: 'sine.inOut', stagger: { each: 0.08, yoyo: true, repeat: 1 } }, t + 1.8);
  } else if (variant === 'domain-map') {
    master.fromTo(S + ' .bbs-domain', { scale: 0.84, y: 16, autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, ...MAT.enter, stagger: { each: 0.1, from: 'center' } }, t + 0.52);
    master.to(S + ' .bbs-domain', { y: -8, duration: 1.4, ease: 'sine.inOut', stagger: { each: 0.08, yoyo: true, repeat: 1 } }, t + 2.2);
  } else if (variant === 'architecture-morph') {
    var cardToNode = [[-34, 74], [-30, -292], [6, 80], [-150, -160], [-44, 74]];
    gsap.set(S + ' .bbs-node', { autoAlpha: 0, scale: 0.82 });
    gsap.set(S + ' .bbs-wire', { autoAlpha: 0 });
    master.fromTo(S + ' .bbs-blueprint-frame', { scale: 0.97, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'power2.out' }, t + 0.1);
    master.fromTo(S + ' .bbs-card', { scale: 0.82, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.32, ease: 'power3.out', stagger: 0.05 }, t + 0.25);
    master.to(S + ' .bbs-card', { x: function (i) { return cardToNode[i] ? cardToNode[i][0] : 0; }, y: function (i) { return cardToNode[i] ? cardToNode[i][1] : 0; }, scale: 0.78, autoAlpha: 0.2, duration: 0.8, ease: 'power2.inOut', stagger: 0.04 }, t + 0.95);
    master.to(S + ' .bbs-node', { scale: 1, autoAlpha: 1, duration: 0.48, ease: 'power2.out', stagger: 0.07 }, t + 1.35);
    master.fromTo(S + ' .bbs-wire', { strokeDasharray: 900, strokeDashoffset: 900, autoAlpha: 0 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.62, ease: 'power1.out', stagger: 0.05 }, t + 1.95);
    master.fromTo(S + ' .bbs-hero-statement', { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.36, ease: 'power2.out' }, t + 2.65);
    master.to(S + ' .bbs-node', { scale: 1.035, duration: 0.18, ease: 'power2.out', stagger: { each: 0.04, from: 'center', yoyo: true, repeat: 1 } }, t + 3.1);
  } else if (variant === 'blueprint') {
    master.fromTo(S + ' .bbs-blueprint-frame', { scale: 0.96, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.68, ease: 'power2.out' }, t + 0.16);
    master.fromTo(S + ' .bbs-card', { scale: 0.84, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ...MAT.enter, stagger: { each: 0.08, from: 'center' } }, t + 0.75);
    master.fromTo(S + ' .bbs-hero-statement', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.52, ease: 'power2.out' }, t + 1.45);
  } else {
    master.fromTo(S + ' .bbs-card', { scale: 0.72, y: 24, autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, ...MAT.enter, stagger: { each: 0.08, from: 'center' } }, t + 0.56);
    master.fromTo(S + ' .bbs-hero-statement', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, t + 1.2);
  }

  master.to(S + ' .bbs-visual-field', { scale: 1.012, rotationX: 3.4, duration: 1.15, ease: 'sine.inOut', repeat: repeatAcross(0.8, 1.2), yoyo: true }, t + 0.8);
  master.to(S + ' .bbs-spark', { x: '+=54', y: '-=30', scale: 1.25, autoAlpha: 0.7, duration: 0.95, ease: 'sine.inOut', stagger: 0.16, repeat: repeatAcross(1.4, 1.05), yoyo: true }, t + 1.4);

  if (root.querySelector('.bbs-card')) {
    master.to(S + ' .bbs-card', { y: function (i) { return i % 2 ? '-=22' : '+=18'; }, x: function (i) { return i % 3 === 0 ? '+=14' : '-=10'; }, rotation: function (i) { return i % 2 ? 1.2 : -1.1; }, duration: 0.9, ease: 'sine.inOut', stagger: { each: 0.035, from: 'center' }, repeat: repeatAcross(1.75, 1.05), yoyo: true }, t + 1.75);
  }
  if (root.querySelector('.bbs-node')) {
    master.to(S + ' .bbs-node', { y: function (i) { return i % 2 ? '-=18' : '+=14'; }, scale: function (i) { return i % 2 ? 1.025 : 0.985; }, duration: 0.95, ease: 'sine.inOut', stagger: 0.07, repeat: repeatAcross(1.75, 1.08), yoyo: true }, t + 1.75);
  }
  if (root.querySelector('.bbs-domain')) {
    master.to(S + ' .bbs-domain', { x: function (i) { return Math.cos(i * 1.7) * 22; }, y: function (i) { return Math.sin(i * 1.4) * 18; }, rotation: 1.4, duration: 1.0, ease: 'sine.inOut', stagger: 0.06, repeat: repeatAcross(1.75, 1.12), yoyo: true }, t + 1.75);
  }
  if (root.querySelector('.bbs-formula-line')) {
    master.to(S + ' .bbs-formula-line', { x: '-=16', duration: 0.9, ease: 'sine.inOut', stagger: 0.08, repeat: repeatAcross(1.75, 1.05), yoyo: true }, t + 1.75);
  }
  if (root.querySelector('.bbs-wire')) {
    master.to(S + ' .bbs-wire', { strokeDashoffset: '-=120', duration: 0.95, ease: 'sine.inOut', stagger: 0.035, repeat: repeatAcross(1.7, 1.05), yoyo: true }, t + 1.7);
  }
  if (root.querySelector('.bbs-wire.hot')) {
    master.to(S + ' .bbs-wire.hot', { autoAlpha: 0.9, duration: 0.85, ease: 'sine.inOut', repeat: repeatAcross(1.65, 0.95), yoyo: true }, t + 1.65);
  }
  master.to(S + ' .bbs-stage', { autoAlpha: 0, y: -10, ...MAT.exit }, out);
})();
