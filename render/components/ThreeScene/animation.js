// Intent: glass - cinematic depth with deterministic exact-text texture
var S = '.scene-' + SCENE_ID;
var root = document.querySelector(S + ' .three-scene');
var canvas = document.querySelector(S + ' .three-canvas');
var titleEl = document.querySelector(S + ' .three-title');

function threeSceneColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? String(value) : fallback;
}

function threeSceneHash(value) {
  var h = 2166136261;
  var text = String(value || 'slate-three');
  for (var i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function threeSceneRandom(seed) {
  var state = seed >>> 0;
  return function() {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
}

if (root && canvas && window.__slateThree && typeof window.__slateThree.register === 'function') {
  var primary = threeSceneColor(root.getAttribute('data-primary-color'), '#8B5CF6');
  var accent = threeSceneColor(root.getAttribute('data-accent-color'), '#E7D7A2');
  var title = root.getAttribute('data-title') || (titleEl ? titleEl.textContent.trim() : 'Slate Three');
  var mode = root.getAttribute('data-mode') || 'orbital';
  var seedValue = Number(root.getAttribute('data-seed'));
  var seed = Number.isFinite(seedValue) ? seedValue : threeSceneHash(SCENE_ID + ':' + title);
  var state = { initialized: false };

  window.__slateThree.register(SCENE_ID, {
    init: function(THREE) {
      var width = root.clientWidth || 1920;
      var height = root.clientHeight || 1080;
      var rng = threeSceneRandom(seed);

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

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 0, 7.2);

      var group = new THREE.Group();
      scene.add(group);

      var key = new THREE.PointLight(new THREE.Color(primary), 6, 18);
      key.position.set(-3.5, 3.2, 5.5);
      scene.add(key);
      var rim = new THREE.PointLight(new THREE.Color(accent), 4, 16);
      rim.position.set(4.2, -2.6, 4.8);
      scene.add(rim);
      scene.add(new THREE.AmbientLight(0xffffff, 0.42));

      var core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.42, 3),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(primary),
          metalness: 0.22,
          roughness: 0.34,
          emissive: new THREE.Color(primary),
          emissiveIntensity: 0.08
        })
      );
      group.add(core);

      var wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.48, 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), wireframe: true, transparent: true, opacity: 0.36 })
      );
      group.add(wire);

      var labelCanvas = document.createElement('canvas');
      labelCanvas.width = 1024;
      labelCanvas.height = 512;
      var ctx2d = labelCanvas.getContext('2d');
      ctx2d.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
      ctx2d.fillStyle = 'rgba(5, 8, 22, 0.72)';
      ctx2d.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      ctx2d.strokeStyle = accent;
      ctx2d.lineWidth = 8;
      ctx2d.strokeRect(20, 20, labelCanvas.width - 40, labelCanvas.height - 40);
      ctx2d.fillStyle = '#F8F4EC';
      ctx2d.font = '700 76px Inter, Arial, sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText(title.slice(0, 34), labelCanvas.width / 2, 218);
      ctx2d.fillStyle = accent;
      ctx2d.font = '500 34px Inter, Arial, sans-serif';
      ctx2d.fillText(mode.toUpperCase(), labelCanvas.width / 2, 310);
      var labelTexture = new THREE.CanvasTexture(labelCanvas);
      labelTexture.needsUpdate = true;
      var label = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 1.25),
        new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, opacity: 0.92 })
      );
      label.position.set(0, 0, 1.62);
      group.add(label);

      var particles = new THREE.Group();
      var particleMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.58 });
      var particleGeometry = new THREE.SphereGeometry(0.025, 8, 8);
      for (var i = 0; i < 90; i++) {
        var p = new THREE.Mesh(particleGeometry, particleMaterial);
        var radius = 2.1 + rng() * 2.2;
        var angle = rng() * Math.PI * 2;
        var y = (rng() - 0.5) * 3.2;
        p.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        p.userData = { radius: radius, angle: angle, y: y, speed: 0.12 + rng() * 0.2 };
        particles.add(p);
      }
      scene.add(particles);

      state = {
        initialized: true,
        disposed: false,
        renderer: renderer,
        scene: scene,
        camera: camera,
        group: group,
        core: core,
        wire: wire,
        label: label,
        particles: particles,
        labelTexture: labelTexture
      };
    },
    renderAtTime: function(compositionTime) {
      if (!state.initialized || state.disposed) return;
      var local = Math.max(0, Math.min(SCENE_DURATION, compositionTime - SCENE_START));
      var progress = SCENE_DURATION > 0 ? local / SCENE_DURATION : 0;
      var orbit = local * 0.36 + seed * 0.00001;

      state.group.rotation.y = orbit;
      state.group.rotation.x = Math.sin(local * 0.42) * 0.16;
      state.core.rotation.z = local * 0.22;
      state.wire.rotation.y = -local * 0.5;
      state.label.position.z = 1.62 + Math.sin(progress * Math.PI) * 0.16;

      for (var i = 0; i < state.particles.children.length; i++) {
        var p = state.particles.children[i];
        var a = p.userData.angle + local * p.userData.speed;
        p.position.x = Math.cos(a) * p.userData.radius;
        p.position.z = Math.sin(a) * p.userData.radius;
        p.position.y = p.userData.y + Math.sin(local * 0.7 + i) * 0.08;
      }

      state.camera.position.x = Math.sin(local * 0.22) * 0.34;
      state.camera.position.y = Math.cos(local * 0.18) * 0.18;
      state.camera.lookAt(0, 0, 0);
      state.renderer.render(state.scene, state.camera);
    },
    dispose: function() {
      if (!state.initialized || state.disposed) return;
      var disposed = typeof Set !== 'undefined' ? new Set() : null;
      function disposeOnce(resource) {
        if (!resource || typeof resource.dispose !== 'function') return;
        if (disposed) {
          if (disposed.has(resource)) return;
          disposed.add(resource);
        }
        resource.dispose();
      }
      if (state.scene && typeof state.scene.traverse === 'function') {
        state.scene.traverse(function(obj) {
          disposeOnce(obj.geometry);
          var material = obj.material;
          if (Array.isArray(material)) {
            for (var i = 0; i < material.length; i++) {
              disposeOnce(material[i] && material[i].map);
              disposeOnce(material[i]);
            }
          } else {
            disposeOnce(material && material.map);
            disposeOnce(material);
          }
        });
      }
      disposeOnce(state.labelTexture);
      if (state.renderer && typeof state.renderer.dispose === 'function') state.renderer.dispose();
      state.disposed = true;
      state.initialized = false;
    }
  });

  master.fromTo(S + ' .three-copy',
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' },
    SCENE_START + 0.28);

  master.to(S + ' .three-copy',
    { autoAlpha: 0, y: -12, duration: 0.28, ease: 'power2.in' },
    SCENE_START + Math.max(0.5, SCENE_DURATION - 0.42));
}
