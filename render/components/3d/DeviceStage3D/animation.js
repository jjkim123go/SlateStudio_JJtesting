// DeviceStage3D — three.js stage with a screen plane (browser/device/glass
// surround). Renders deterministically through window.__slateThree.
//
// Contract (see render/components/ThreeScene/animation.js for reference):
//   * No requestAnimationFrame, Date.now(), performance.now(), or unseeded
//     randomness inside renderAtTime — the producer drives time via
//     compositionTime.
//   * THREE is injected by the lazy three.js driver — never `import 'three'`.
//   * setPixelRatio(1) for capture stability.
//   * dispose() is provided for the driver lifecycle (geometries/materials/
//     textures/renderer all freed).

(() => {
  const root = document.querySelector('.scene-' + SCENE_ID + ' [data-scene-component="DeviceStage3D"]');
  if (!root) return;
  if (!window.__slateThree || typeof window.__slateThree.register !== 'function') return;

  const title = root.getAttribute('data-title') || 'Device stage';
  const mode = (root.getAttribute('data-mode') || 'browser').toLowerCase();
  const screenSrcRaw = root.getAttribute('data-screen-src') || '';
  const primaryColor = root.getAttribute('data-primary-color') || '#8B5CF6';
  const accentColor = root.getAttribute('data-accent-color') || '#E7D7A2';
  const seed = root.getAttribute('data-seed') || (SCENE_ID + ':' + title);
  const canvas = root.querySelector('canvas.device-canvas');
  if (!canvas) return;

  // Deterministic RNG (FNV-like → mulberry32-style LCG).
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

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
    if (!m) return { r: 0.55, g: 0.36, b: 0.96 };
    return {
      r: parseInt(m[1], 16) / 255,
      g: parseInt(m[2], 16) / 255,
      b: parseInt(m[3], 16) / 255,
    };
  }

  // Build a fallback canvas-texture used when no screenSrc is provided.
  function buildPlaceholderTexture(THREE) {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 800;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 1280, 800);
    grad.addColorStop(0, '#16213E');
    grad.addColorStop(1, '#0F1024');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 800);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const y = 140 + i * 96;
      ctx.globalAlpha = 0.18 + (i / 12);
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#F8F4EC';
    ctx.font = '700 56px Inter, system-ui, sans-serif';
    ctx.fillText(title.slice(0, 32), 80, 96);
    ctx.fillStyle = accentColor;
    ctx.font = '500 26px Inter, system-ui, sans-serif';
    ctx.fillText(mode.toUpperCase(), 80, 740);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace || tex.colorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  let scene, camera, renderer;
  let frameMesh, screenMesh, glowMesh;
  let bezelGeom, bezelMat, screenGeom, screenMat, glowGeom, glowMat;
  let screenTexture, placeholderTexture;
  let group;

  function init(THREE) {
    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / Math.max(1, canvas.clientHeight), 0.1, 100);
    camera.position.set(0, 0.4, 7.4);
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

    group = new THREE.Group();
    scene.add(group);

    // Lighting — soft key + accent rim.
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(2.4, 3.2, 4.2);
    scene.add(key);

    const rimColor = new THREE.Color(primaryColor);
    const rim = new THREE.PointLight(rimColor, 1.4, 18);
    rim.position.set(-3.6, 1.2, 2.0);
    scene.add(rim);

    const accentLight = new THREE.PointLight(new THREE.Color(accentColor), 0.85, 14);
    accentLight.position.set(3.2, -1.0, 2.2);
    scene.add(accentLight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.32));

    // Geometry — the screen aspect roughly mirrors a 16:10 display.
    const screenW = mode === 'device' ? 4.6 : 5.2;
    const screenH = mode === 'device' ? 2.875 : 3.0;
    const bezelInsetX = mode === 'glass' ? 0.18 : 0.30;
    const bezelInsetY = mode === 'browser' ? 0.62 : (mode === 'device' ? 0.46 : 0.18);

    bezelGeom = new THREE.BoxGeometry(screenW + bezelInsetX * 2, screenH + bezelInsetY * 2, 0.18);
    const bezelTone = mode === 'glass' ? 0x1A1A2E : (mode === 'device' ? 0x14141C : 0x1F2233);
    bezelMat = new THREE.MeshStandardMaterial({
      color: bezelTone,
      roughness: mode === 'glass' ? 0.18 : 0.62,
      metalness: mode === 'glass' ? 0.9 : 0.55,
      transparent: mode === 'glass',
      opacity: mode === 'glass' ? 0.78 : 1,
    });
    frameMesh = new THREE.Mesh(bezelGeom, bezelMat);
    frameMesh.position.z = -0.02;
    group.add(frameMesh);

    // Browser chrome bar (browser mode only).
    if (mode === 'browser') {
      const barGeom = new THREE.PlaneGeometry(screenW + bezelInsetX * 2 - 0.16, 0.42);
      const barMat = new THREE.MeshBasicMaterial({ color: 0x0E1726 });
      const bar = new THREE.Mesh(barGeom, barMat);
      bar.position.set(0, screenH / 2 + 0.16, 0.10);
      group.add(bar);
      // Three traffic-light dots so the chrome reads as "browser" at 480p.
      const dotColors = [0xff5f57, 0xfebc2e, 0x28c840];
      dotColors.forEach((col, i) => {
        const g = new THREE.CircleGeometry(0.05, 24);
        const m = new THREE.MeshBasicMaterial({ color: col });
        const dot = new THREE.Mesh(g, m);
        dot.position.set(-screenW / 2 + 0.16 + i * 0.16, screenH / 2 + 0.16, 0.12);
        group.add(dot);
        // These small geom/mat instances are tracked for dispose on the parent
        // dispose() pass via traversing `group`.
      });
    }

    // Screen plane.
    screenGeom = new THREE.PlaneGeometry(screenW, screenH, 1, 1);
    placeholderTexture = buildPlaceholderTexture(THREE);
    screenMat = new THREE.MeshBasicMaterial({
      map: placeholderTexture,
      toneMapped: false,
    });
    screenMesh = new THREE.Mesh(screenGeom, screenMat);
    screenMesh.position.z = 0.10;
    group.add(screenMesh);

    let screenTextureReady = Promise.resolve();

    // If a screenSrc is provided, swap the placeholder before capture starts.
    if (screenSrcRaw) {
      const loader = new THREE.TextureLoader();
      try { loader.setCrossOrigin('anonymous'); } catch (_) {}
      screenTextureReady = new Promise((resolve, reject) => {
        loader.load(
          screenSrcRaw,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace || tex.colorSpace;
            tex.anisotropy = 4;
            tex.needsUpdate = true;
            screenTexture = tex;
            screenMat.map = tex;
            screenMat.needsUpdate = true;
            resolve();
          },
          undefined,
          (err) => {
            reject(new Error(`DeviceStage3D failed to load screenSrc texture: ${screenSrcRaw}${err && err.message ? ' — ' + err.message : ''}`));
          }
        );
      });
    }

    // Soft glow plane behind the device for premium ambient lift.
    glowGeom = new THREE.PlaneGeometry(screenW * 1.6, screenH * 1.6);
    glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(primaryColor),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    glowMesh = new THREE.Mesh(glowGeom, glowMat);
    glowMesh.position.z = -0.6;
    group.add(glowMesh);

    // Initial pose — light tilt so the device reads as 3D from frame zero.
    group.rotation.set(-0.05, -0.08 + (rng() - 0.5) * 0.06, 0);
    group.position.y = -0.05;

    return screenTextureReady;
  }

  function renderAtTime(compositionTime, THREE) {
    if (!renderer || !scene || !camera) return;
    const local = Math.max(0, Math.min(SCENE_DURATION, compositionTime - SCENE_START));
    const t = local / Math.max(0.0001, SCENE_DURATION);

    // Resize follow-up (canvas may have been laid out post-init).
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w > 0 && h > 0 && (renderer.domElement.width !== w || renderer.domElement.height !== h)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    // Slow orbit + gentle vertical bob — purely time-driven, deterministic.
    const orbit = -0.20 + Math.sin(t * Math.PI) * 0.18;
    const tilt = -0.06 + Math.sin(t * Math.PI * 1.2) * 0.04;
    group.rotation.y = orbit;
    group.rotation.x = tilt;
    group.position.y = -0.05 + Math.sin(t * Math.PI) * 0.06;

    // Subtle glow pulse keyed to scene midpoint.
    if (glowMat) {
      glowMat.opacity = 0.14 + Math.sin(t * Math.PI) * 0.10;
    }

    renderer.render(scene, camera);
  }

  function dispose() {
    try {
      if (group) {
        group.traverse((obj) => {
          if (obj.geometry && typeof obj.geometry.dispose === 'function') obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              if (m && m.map && typeof m.map.dispose === 'function') m.map.dispose();
              if (m && typeof m.dispose === 'function') m.dispose();
            });
          }
        });
      }
      if (screenTexture && typeof screenTexture.dispose === 'function') screenTexture.dispose();
      if (placeholderTexture && typeof placeholderTexture.dispose === 'function') placeholderTexture.dispose();
      if (renderer && typeof renderer.dispose === 'function') renderer.dispose();
    } catch (_) { /* dispose is best-effort */ }
  }

  window.__slateThree.register(SCENE_ID, { init, renderAtTime, dispose });

  // GSAP overlay reveal — keep the DOM copy crossfade deterministic via master.
  if (typeof master !== 'undefined' && master && typeof master.fromTo === 'function') {
    const reveal = Math.min(1.2, SCENE_DURATION * 0.18);
    master.fromTo(
      root.querySelector('.device-copy'),
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: reveal, ease: 'power2.out' },
      SCENE_START + 0.20
    );
    if (SCENE_DURATION > 1.5) {
      master.to(
        root.querySelector('.device-copy'),
        { autoAlpha: 0, y: -10, duration: 0.6, ease: 'power1.in' },
        SCENE_START + SCENE_DURATION - 0.6
      );
    }
  }
})();
