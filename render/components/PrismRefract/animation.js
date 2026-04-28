// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION
(function () {
  var root = document.querySelector('.scene-' + SCENE_ID + ' .pr-root');
  if (!root) return;

  function clean(value) {
    if (!value || typeof value !== 'string') return '';
    if (value.indexOf('{{') === 0) return '';
    return value.trim();
  }

  function setBackground(node, src, fallback) {
    if (!node) return;
    node.style.backgroundImage = src ? 'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.22)), url("' + src.replace(/"/g, '\\"') + '")' : fallback;
  }

  var outgoingSrc = clean(root.getAttribute('data-outgoing-src'));
  var incomingSrc = clean(root.getAttribute('data-incoming-src'));
  var outgoing = document.querySelector('.scene-' + SCENE_ID + ' .pr-outgoing');
  var incoming = document.querySelector('.scene-' + SCENE_ID + ' .pr-incoming');
  var slices = document.querySelectorAll('.scene-' + SCENE_ID + ' .pr-slice');
  var bands = document.querySelectorAll('.scene-' + SCENE_ID + ' .pr-band');
  var tints = document.querySelectorAll('.scene-' + SCENE_ID + ' .pr-tint');
  var flare = '.scene-' + SCENE_ID + ' .pr-flare';
  var copy = '.scene-' + SCENE_ID + ' .pr-copy';
  var incomingFallback = 'linear-gradient(135deg, rgba(29,78,216,0.36) 0%, rgba(14,165,233,0.18) 36%, rgba(192,38,211,0.26) 100%), radial-gradient(circle at 68% 22%, rgba(255,255,255,0.22), transparent 28%)';

  setBackground(outgoing, outgoingSrc, 'linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.84) 44%, rgba(2,6,23,0.98) 100%), radial-gradient(circle at 18% 18%, rgba(255,255,255,0.10), transparent 36%)');
  setBackground(incoming, incomingSrc, incomingFallback);

  for (var i = 0; i < slices.length; i += 1) {
    setBackground(slices[i], incomingSrc, incomingFallback);
  }

  var title = document.querySelector('.scene-' + SCENE_ID + ' .pr-title');
  var subtitle = document.querySelector('.scene-' + SCENE_ID + ' .pr-subtitle');
  if (title) title.textContent = clean(root.getAttribute('data-headline')) || 'Spectrum resolves';
  if (subtitle) subtitle.textContent = clean(root.getAttribute('data-subline')) || 'Color bands sweep through frame, then collapse into a single unified scene.';

  var enterWindow = SCENE_DURATION * 0.54;
  var holdWindow = SCENE_DURATION * 0.12;
  var resolveWindow = Math.max(0.34, SCENE_DURATION - enterWindow - holdWindow);
  var bandDur = Math.max(0.32, SCENE_DURATION * 0.3);
  var stagger = Math.min(0.08, enterWindow / 14);
  var yOffsets = [-180, -132, -88, -40, 16, 56, 98, 142];
  var exitOffsets = [-42, -28, -14, -6, 6, 14, 28, 42];
  var resolveStart = SCENE_START + enterWindow + holdWindow;

  master.fromTo(copy,
    { autoAlpha: 0, y: 26, filter: 'blur(8px)' },
    { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: Math.max(0.35, SCENE_DURATION * 0.22), ease: 'power2.out' },
    SCENE_START + SCENE_DURATION * 0.08);

  master.to(outgoing,
    { autoAlpha: 0, duration: SCENE_DURATION * 0.34, ease: 'power2.inOut' },
    SCENE_START + SCENE_DURATION * 0.14);

  master.fromTo(incoming,
    { autoAlpha: 0.02, scale: 1.04, filter: 'blur(18px) saturate(1.18)' },
    { autoAlpha: 1, scale: 1, filter: 'blur(0px) saturate(1)', duration: resolveWindow, ease: 'power3.out' },
    resolveStart - SCENE_DURATION * 0.08);

  master.fromTo(flare,
    { autoAlpha: 0, scale: 0.84 },
    { autoAlpha: 0.95, scale: 1.08, duration: enterWindow * 0.55, ease: 'sine.out' },
    SCENE_START + SCENE_DURATION * 0.05);

  master.to(flare,
    { autoAlpha: 0.18, scale: 1.18, duration: resolveWindow, ease: 'sine.inOut' },
    resolveStart);

  for (var bandIndex = 0; bandIndex < bands.length; bandIndex += 1) {
    var band = bands[bandIndex];
    var tint = tints[bandIndex];
    var start = SCENE_START + bandIndex * stagger;
    var localExit = resolveStart + bandIndex * 0.018;

    master.fromTo(band,
      { x: -1800, y: yOffsets[bandIndex], rotation: -31, autoAlpha: 0, filter: 'blur(6px)' },
      { x: 0, y: 0, rotation: -24, autoAlpha: 1, filter: 'blur(0px)', duration: bandDur, ease: 'power3.out' },
      start);

    master.fromTo(tint,
      { autoAlpha: 0.96 },
      { autoAlpha: 0.88, duration: enterWindow * 0.5, ease: 'sine.out' },
      start + bandDur * 0.12);

    master.to(band,
      { x: 220 + bandIndex * 26, y: exitOffsets[bandIndex], rotation: -18, autoAlpha: 0, duration: resolveWindow, ease: 'power3.inOut' },
      localExit);

    master.to(tint,
      { autoAlpha: 0, duration: resolveWindow * 0.8, ease: 'power2.out' },
      localExit);
  }
})();
