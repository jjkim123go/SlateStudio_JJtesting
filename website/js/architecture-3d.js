/* Architecture section — CSS fallback only, no Three.js */
(function () {
  const canvas = document.getElementById('arch-canvas');
  const fallback = document.getElementById('arch-fallback');
  if (canvas) canvas.style.display = 'none';
  if (fallback) fallback.classList.remove('hidden');
})();

  layerData.forEach((data, i) => {
    // Main layer plane
    const geo = new THREE.BoxGeometry(data.width, data.depth, 2.5);
    const mat = new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = data.y;

    // Wireframe edges
    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.4,
    });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    mesh.add(edges);

    // Top glow line
    const glowGeo = new THREE.PlaneGeometry(data.width, 0.02);
    const glowMat = new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = data.depth / 2 + 0.01;
    glow.rotation.x = -Math.PI / 2;
    mesh.add(glow);

    layerGroup.add(mesh);
    layers.push({ mesh, mat, edgesMat, originalY: data.y, color: data.color });
  });

  scene.add(layerGroup);

  // ---- Connection beams between layers ----
  const beamMaterial = new THREE.LineBasicMaterial({
    color: 0x6366f1,
    transparent: true,
    opacity: 0.1,
  });

  for (let i = 0; i < layerData.length - 1; i++) {
    const points = [
      new THREE.Vector3(0, layerData[i].y - layerData[i].depth / 2, 0),
      new THREE.Vector3(0, layerData[i + 1].y + layerData[i + 1].depth / 2, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, beamMaterial.clone());
    layerGroup.add(line);
  }

  // ---- Small data particles flowing between layers ----
  const flowParticleCount = 80;
  const flowPositions = new Float32Array(flowParticleCount * 3);
  const flowVelocities = [];

  for (let i = 0; i < flowParticleCount; i++) {
    const i3 = i * 3;
    flowPositions[i3] = (Math.random() - 0.5) * 3;
    flowPositions[i3 + 1] = (Math.random() - 0.5) * 8;
    flowPositions[i3 + 2] = (Math.random() - 0.5) * 1.5;
    flowVelocities.push({
      x: (Math.random() - 0.5) * 0.005,
      y: -0.01 - Math.random() * 0.02,
      z: (Math.random() - 0.5) * 0.003,
    });
  }

  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPositions, 3));
  const flowMat = new THREE.PointsMaterial({
    color: 0x06b6d4,
    size: 0.03,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flowParticles = new THREE.Points(flowGeo, flowMat);
  layerGroup.add(flowParticles);

  // ---- Mouse tracking ----
  const mouse = { x: 0, y: 0 };

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  // ---- Scroll-driven explode ----
  let explodeFactor = 0;

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '#architecture',
      start: 'top 80%',
      end: 'center center',
      scrub: 1,
      onUpdate: (self) => {
        explodeFactor = self.progress;
      },
    });
  }

  // ---- Animation loop ----
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Subtle orbit
    layerGroup.rotation.y = mouse.x * 0.15 + Math.sin(elapsed * 0.2) * 0.05;
    layerGroup.rotation.x = -mouse.y * 0.08;

    // Explode layers on scroll
    layers.forEach((layer, i) => {
      const offset = (i - (layers.length - 1) / 2) * explodeFactor * 0.8;
      layer.mesh.position.y = layer.originalY + offset;

      // Pulse opacity
      const pulse = Math.sin(elapsed * 0.8 + i * 0.5) * 0.03;
      layer.mat.opacity = 0.15 + pulse + explodeFactor * 0.05;
    });

    // Flow particles
    const posArray = flowGeo.attributes.position.array;
    for (let i = 0; i < flowParticleCount; i++) {
      const i3 = i * 3;
      posArray[i3] += flowVelocities[i].x;
      posArray[i3 + 1] += flowVelocities[i].y;
      posArray[i3 + 2] += flowVelocities[i].z;

      // Reset when below bottom
      if (posArray[i3 + 1] < -5) {
        posArray[i3] = (Math.random() - 0.5) * 3;
        posArray[i3 + 1] = 5;
        posArray[i3 + 2] = (Math.random() - 0.5) * 1.5;
      }
    }
    flowGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();

  // ---- Resize ----
  function onResize() {
    const width = canvas.clientWidth;
    camera.aspect = width / 600;
    camera.updateProjectionMatrix();
    renderer.setSize(width, 600);
  }

  window.addEventListener('resize', onResize);
})();
