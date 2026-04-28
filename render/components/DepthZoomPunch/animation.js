// DepthZoomPunch — bridge transition: depth-zoom forward, flash, zoom-in from depth.
// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  var scope = '.scene-' + SCENE_ID + ' ';

  // Show images if src is provided
  var outImg = document.querySelector(scope + '.dzp-out-img');
  var inImg = document.querySelector(scope + '.dzp-in-img');
  if (outImg) {
    var outSrc = outImg.getAttribute('src') || '';
    if (outSrc && outSrc.indexOf('{{') === -1) outImg.style.display = 'block';
  }
  if (inImg) {
    var inSrc = inImg.getAttribute('src') || '';
    if (inSrc && inSrc.indexOf('{{') === -1) inImg.style.display = 'block';
  }

  // Parse props with defaults
  var flashDurRaw = '{{flashDuration}}';
  var flashDur = parseFloat(flashDurRaw);
  if (isNaN(flashDur) || flashDur <= 0) flashDur = 0.06;

  var maxBlurRaw = '{{maxBlur}}';
  var maxBlur = parseInt(maxBlurRaw, 10);
  if (isNaN(maxBlur) || maxBlur <= 0) maxBlur = 20;

  // Phase timing — scaled to SCENE_DURATION
  var midpoint = SCENE_DURATION * 0.5;
  var outDur = midpoint - flashDur * 0.5;    // outgoing zoom duration
  var inDur = SCENE_DURATION - midpoint - flashDur * 0.5; // incoming zoom duration

  // Phase 1: outgoing zooms forward — scale 1→3, blur 0→max, opacity 1→0
  master.fromTo(scope + '.dzp-outgoing',
    { scale: 1, autoAlpha: 1, filter: 'blur(0px)' },
    {
      scale: 3,
      autoAlpha: 0,
      filter: 'blur(' + maxBlur + 'px)',
      duration: outDur,
      ease: 'power2.in',
      transformOrigin: '50% 50%'
    },
    SCENE_START);

  // Phase 2: white flash at midpoint
  var flashStart = SCENE_START + midpoint - flashDur * 0.5;
  master.fromTo(scope + '.dzp-flash',
    { autoAlpha: 0 },
    { autoAlpha: 0.85, duration: flashDur * 0.5, ease: 'power1.in' },
    flashStart);
  master.to(scope + '.dzp-flash',
    { autoAlpha: 0, duration: flashDur * 0.5, ease: 'power1.out' },
    flashStart + flashDur * 0.5);

  // Phase 3: incoming zooms in from depth — scale 0.3→1, blur max→0, opacity 0→1
  var inStart = SCENE_START + midpoint - flashDur * 0.3; // slight overlap with flash
  master.fromTo(scope + '.dzp-incoming',
    { scale: 0.3, autoAlpha: 0, filter: 'blur(' + maxBlur + 'px)' },
    {
      scale: 1,
      autoAlpha: 1,
      filter: 'blur(0px)',
      duration: inDur,
      ease: 'power2.out',
      transformOrigin: '50% 50%'
    },
    inStart);

  // Fade out at scene end
  master.to(scope + '.dzp-root',
    { autoAlpha: 0, duration: Math.min(SCENE_DURATION * 0.12, 0.2), ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - Math.min(SCENE_DURATION * 0.12, 0.2));
})();
