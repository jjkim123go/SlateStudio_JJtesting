// SwirlVortex — bridge transition: radial vortex rotation with brand-colored bands.
// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  var scope = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(scope + '.svx-root');
  if (!root) return;

  // Parse props with defaults
  var bandCountRaw = root.dataset.bandCount;
  var bandCount = parseInt(bandCountRaw, 10);
  if (isNaN(bandCount) || bandCount < 2) bandCount = 6;

  var vortexRotRaw = root.dataset.vortexRotation;
  var vortexRotation = parseInt(vortexRotRaw, 10);
  if (isNaN(vortexRotation) || vortexRotation <= 0) vortexRotation = 720;

  var brandColor = root.style.getPropertyValue('--svx-brand').trim();
  if (!brandColor || brandColor.indexOf('{{') !== -1) {
    brandColor = 'var(--brand-primary, #0078D4)';
    root.style.setProperty('--svx-brand', brandColor);
  }

  // Create radial bands in the vortex container
  var vortex = document.querySelector(scope + '.svx-vortex');
  if (!vortex) return;

  var angleStep = 360 / bandCount;
  for (var i = 0; i < bandCount; i++) {
    var band = document.createElement('div');
    band.className = 'svx-band';
    // Deterministic alpha variation based on index
    var alpha = 0.6 + (i % 3) * 0.15;
    band.style.background = brandColor;
    band.style.opacity = String(alpha);
    band.style.transform = 'rotate(' + (angleStep * i) + 'deg)';
    band.style.transformOrigin = '0% 50%';
    vortex.appendChild(band);
  }

  // Phase timing — scaled to SCENE_DURATION
  // Phase 1 (0-40%): outgoing rotates+scales into vortex center
  // Phase 2 (30-65%): vortex bands spin and pulse
  // Phase 3 (55-100%): vortex unfurls, incoming fades up
  var p1Start = SCENE_START;
  var p1Dur = SCENE_DURATION * 0.40;
  var p2Start = SCENE_START + SCENE_DURATION * 0.30;
  var p2Dur = SCENE_DURATION * 0.35;
  var p3Start = SCENE_START + SCENE_DURATION * 0.55;
  var p3Dur = SCENE_DURATION * 0.45;

  // Phase 1: outgoing content spirals into center
  master.fromTo(scope + '.svx-outgoing',
    { scale: 1, rotation: 0, autoAlpha: 1, filter: 'blur(0px)' },
    {
      scale: 0.05,
      rotation: vortexRotation * 0.5,
      autoAlpha: 0,
      filter: 'blur(8px)',
      duration: p1Dur,
      ease: 'power3.in',
      transformOrigin: '50% 50%'
    },
    p1Start);

  // Phase 2: vortex appears, spins
  master.fromTo(scope + '.svx-vortex',
    { autoAlpha: 0, scale: 0.1, rotation: 0 },
    {
      autoAlpha: 1,
      scale: 1,
      rotation: vortexRotation * 0.3,
      duration: p2Dur * 0.5,
      ease: 'power2.out',
      transformOrigin: '50% 50%'
    },
    p2Start);

  // Vortex continues spinning then fades
  master.to(scope + '.svx-vortex',
    {
      rotation: vortexRotation * 0.7,
      scale: 3,
      autoAlpha: 0,
      duration: p2Dur * 0.5,
      ease: 'power2.in',
      transformOrigin: '50% 50%'
    },
    p2Start + p2Dur * 0.5);

  // Phase 3: incoming unfurls from vortex center
  master.fromTo(scope + '.svx-incoming',
    { scale: 0.1, rotation: -vortexRotation * 0.3, autoAlpha: 0, filter: 'blur(12px)' },
    {
      scale: 1,
      rotation: 0,
      autoAlpha: 1,
      filter: 'blur(0px)',
      duration: p3Dur,
      ease: 'power2.out',
      transformOrigin: '50% 50%'
    },
    p3Start);

  // Fade out at scene end
  master.to(scope + '.svx-root',
    { autoAlpha: 0, duration: Math.min(SCENE_DURATION * 0.12, 0.25), ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - Math.min(SCENE_DURATION * 0.12, 0.25));
})();
