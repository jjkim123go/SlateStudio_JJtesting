// HTMLTextureWall — 3D wall/carousel of card planes textured via CanvasTexture
// (when `cards` are provided) or TextureLoader (when `textureSrcs` are
// provided). Renders deterministically through window.__slateThree.
//
// Authoring contract — see render/components/ThreeScene/animation.js.

(() => {
  const root = document.querySelector('.scene-' + SCENE_ID + ' [data-scene-component="HTMLTextureWall"]');
  if (!root) return;
  if (!window.__slateThree || typeof window.__slateThree.register !== 'function') return;

  const mode = (root.getAttribute('data-mode') || 'wall').toLowerCase();
  const primaryColor = root.getAttribute('data-primary-color') || '#8B5CF6';
  const accentColor = root.getAttribute('data-accent-color') || '#E7D7A2';
  const seed = root.getAttribute('data-seed') || (SCENE_ID + ':' + mode);
  const canvas = root.querySelector('canvas.wall-canvas');
  if (!canvas) return;

  function safeJsonParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return fallback;
    } catch (_) {
      return fallback;
    }
  }
  const cards = safeJsonParse(root.getAttribute('data-cards-json'), []);
  const textureSrcs = safeJsonParse(root.getAttribute('data-texture-srcs-json'), []);

  // Final card count: prefer cards array if non-empty, else textureSrcs length,
  // else 6 (deterministic placeholder set so the scene is never blank).
  const itemCount = cards.length > 0
    ? cards.length
    : (textureSrcs.length > 0 ? textureSrcs.length : 6);

  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function makeRng(s) {
    let state = hash(String(s)) || 1;
    return () => {
      state = (state + 0x6D2B79F5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = makeRng(seed);

  // Render an exact-text card to a 2D canvas; wrap it in a CanvasTexture.
  function buildCardTexture(THREE, card, idx) {
    const w = 1024;
    const h = 640;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');

    // Background — deep navy with a subtle accent gradient corner.
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#10142A');
    bg.addColorStop(1, '#070912');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Accent corner glow.
    const cornerGrad = ctx.createRadialGradient(w - 80, 80, 12, w - 80, 80, 360);
    cornerGrad.addColorStop(0, accentColor + 'CC');
    cornerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cornerGrad;
    ctx.fillRect(0, 0, w, h);

    // Border accent — thin top stripe in primary color.
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, w, 8);

    // Outer card border.
    ctx.strokeStyle = 'rgba(248,244,236,0.10)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    const padding = 64;
    let cursorY = padding + 32;

    // Kicker — small caps, accent color.
    if (card && card.kicker) {
      ctx.fillStyle = accentColor;
      ctx.font = '600 28px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(String(card.kicker).toUpperCase().slice(0, 32), padding, cursorY);
      cursorY += 60;
    }

    // Title — bold, big, single-line truncate at ~22 chars.
    ctx.fillStyle = '#F8F4EC';
    ctx.font = '780 64px Inter, system-ui, sans-serif';
    const titleText = String((card && card.title) || `Item ${idx + 1}`).slice(0, 24);
    ctx.fillText(titleText, padding, cursorY);
    cursorY += 96;

    // Subtitle — wrapped at ~38 chars/line, max 4 lines.
    if (card && card.subtitle) {
      ctx.fillStyle = 'rgba(248,244,236,0.78)';
      ctx.font = '500 30px Inter, system-ui, sans-serif';
      const subtitleText = String(card.subtitle);
      const words = subtitleText.split(/\s+/);
      const lines = [];
      let current = '';
      for (const word of words) {
        const candidate = current ? current + ' ' + word : word;
        if (candidate.length > 36) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
        if (lines.length >= 4) break;
      }
      if (current && lines.length < 4) lines.push(current);
      const lineHeight = 42;
      lines.forEach((line, i) => {
        ctx.fillText(line, padding, cursorY + i * lineHeight);
      });
    }

    // Footer index marker.
    ctx.fillStyle = 'rgba(248,244,236,0.40)';
    ctx.font = '500 22px Inter, system-ui, sans-serif';
    ctx.fillText(String(idx + 1).padStart(2, '0'), padding, h - padding);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace || tex.colorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  let scene, camera, renderer;
  let group;
  const meshes = [];
  const ownedTextures = [];
  const ownedGeometries = [];
  const ownedMaterials = [];

  function init(THREE) {
    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / Math.max(1, canvas.clientHeight), 0.1, 100);
    camera.position.set(0, 0, mode === 'carousel' ? 8.6 : 9.4);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    // Lighting — flat-ish; the textures do the work.
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    fill.position.set(0, 4, 6);
    scene.add(fill);

    group = new THREE.Group();
    scene.add(group);

    const cardW = 2.0;
    const cardH = cardW * (640 / 1024);

    let usingImageLoader = textureSrcs.length > 0 && cards.length === 0;
    const loader = usingImageLoader ? new THREE.TextureLoader() : null;
    if (loader) { try { loader.setCrossOrigin('anonymous'); } catch (_) {} }
    const textureLoadPromises = [];

    function placeMesh(mesh, idx) {
      if (mode === 'carousel') {
        // Cylindrical arrangement — equally spaced around a vertical axis.
        const angle = (idx / itemCount) * Math.PI * 2;
        const radius = 4.4;
        mesh.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
        mesh.lookAt(0, 0, 0);
        // Flip so the front face points outward (toward the viewer when in front).
        mesh.rotateY(Math.PI);
      } else {
        // Wall mode — grid with computed columns; max 4 wide for readability.
        const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(itemCount * 1.4))));
        const rows = Math.ceil(itemCount / cols);
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const gapX = 0.4;
        const gapY = 0.4;
        const totalW = cols * cardW + (cols - 1) * gapX;
        const totalH = rows * cardH + (rows - 1) * gapY;
        const x = -totalW / 2 + col * (cardW + gapX) + cardW / 2;
        const y = totalH / 2 - row * (cardH + gapY) - cardH / 2;
        // Slight depth jitter so cards aren't perfectly coplanar — reads as 3D.
        const z = (rng() - 0.5) * 0.18;
        mesh.position.set(x, y, z);
        // Subtle tilt toward the camera for an arc effect.
        mesh.rotation.y = -x * 0.045;
        mesh.rotation.x = y * 0.025;
      }
    }

    for (let i = 0; i < itemCount; i++) {
      const geom = new THREE.PlaneGeometry(cardW, cardH);
      ownedGeometries.push(geom);

      let texture;
      if (cards.length > 0) {
        texture = buildCardTexture(THREE, cards[i], i);
        ownedTextures.push(texture);
      } else {
        // Build a placeholder card texture; if textureSrcs has an entry, swap it
        // when the image loads.
        texture = buildCardTexture(THREE, { title: `Item ${i + 1}` }, i);
        ownedTextures.push(texture);
      }

      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      ownedMaterials.push(mat);

      const mesh = new THREE.Mesh(geom, mat);
      placeMesh(mesh, i);
      group.add(mesh);
      meshes.push(mesh);

      if (loader && textureSrcs[i]) {
        const idxLocal = i;
        textureLoadPromises.push(new Promise((resolve, reject) => {
          loader.load(
            String(textureSrcs[i]),
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace || tex.colorSpace;
              tex.anisotropy = 4;
              tex.needsUpdate = true;
              const oldMat = meshes[idxLocal].material;
              const newMat = new THREE.MeshBasicMaterial({
                map: tex,
                side: THREE.DoubleSide,
                toneMapped: false,
              });
              meshes[idxLocal].material = newMat;
              ownedMaterials.push(newMat);
              ownedTextures.push(tex);
              // Old mat/texture remain owned (will be disposed on teardown).
              if (oldMat) { /* keep — disposed at end */ }
              resolve();
            },
            undefined,
            (err) => {
              reject(new Error(`HTMLTextureWall failed to load textureSrcs[${idxLocal}]: ${textureSrcs[i]}${err && err.message ? ' — ' + err.message : ''}`));
            }
          );
        }));
      }
    }

    // Initial pose so the first frame already reads as 3D.
    if (mode === 'carousel') {
      group.rotation.y = -0.18;
    } else {
      group.rotation.y = -0.06;
      group.rotation.x = 0.04;
    }

    return Promise.all(textureLoadPromises);
  }

  function renderAtTime(compositionTime, THREE) {
    if (!renderer || !scene || !camera) return;
    const local = Math.max(0, Math.min(SCENE_DURATION, compositionTime - SCENE_START));
    const t = local / Math.max(0.0001, SCENE_DURATION);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w > 0 && h > 0 && (renderer.domElement.width !== w || renderer.domElement.height !== h)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    if (mode === 'carousel') {
      // Steady rotation across the scene duration.
      group.rotation.y = -0.18 + t * Math.PI * 0.55;
    } else {
      // Wall — gentle pan and slight rotate, as if a camera glides past.
      group.rotation.y = -0.18 + Math.sin(t * Math.PI) * 0.36;
      group.rotation.x = 0.05 - Math.sin(t * Math.PI) * 0.04;
      group.position.y = Math.sin(t * Math.PI * 2) * 0.05;
    }

    // Per-card stagger reveal — opacity sweep keyed off `t`.
    for (let i = 0; i < meshes.length; i++) {
      const enter = (i / Math.max(1, meshes.length - 1)) * 0.55;
      const phase = Math.max(0, Math.min(1, (t - enter) / 0.20));
      const mat = meshes[i].material;
      if (mat) {
        if (mat.transparent !== true) {
          mat.transparent = true;
          mat.needsUpdate = true;
        }
        mat.opacity = phase;
      }
    }

    renderer.render(scene, camera);
  }

  function dispose() {
    try {
      ownedGeometries.forEach((g) => { try { g.dispose(); } catch (_) {} });
      ownedMaterials.forEach((m) => { try { m.dispose(); } catch (_) {} });
      ownedTextures.forEach((t) => { try { t.dispose(); } catch (_) {} });
      if (renderer && typeof renderer.dispose === 'function') renderer.dispose();
    } catch (_) { /* dispose is best-effort */ }
  }

  window.__slateThree.register(SCENE_ID, { init, renderAtTime, dispose });

  // GSAP overlay reveal for the title copy.
  if (typeof master !== 'undefined' && master && typeof master.fromTo === 'function') {
    const reveal = Math.min(1.0, SCENE_DURATION * 0.18);
    master.fromTo(
      root.querySelector('.wall-copy'),
      { autoAlpha: 0, y: -16 },
      { autoAlpha: 1, y: 0, duration: reveal, ease: 'power2.out' },
      SCENE_START + 0.15
    );
    if (SCENE_DURATION > 1.2) {
      master.to(
        root.querySelector('.wall-copy'),
        { autoAlpha: 0, y: -8, duration: 0.5, ease: 'power1.in' },
        SCENE_START + SCENE_DURATION - 0.5
      );
    }
  }
})();
