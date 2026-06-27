// Intent: liquid — guided momentum from human action to account evidence
var S = '.scene-' + SCENE_ID;
var MAT = {
  enter: { duration: 0.8, ease: 'power1.inOut' },
  exit: { duration: 0.6, ease: 'power1.inOut' },
  stagger: 0.15,
  distance: 40
};

master.fromTo(S + ' .mt-orb',
  { autoAlpha: 0.10, scale: 0.92 },
  { autoAlpha: 0.26, scale: 1.08, duration: Math.max(3.2, SCENE_DURATION - 0.8), ease: 'sine.inOut', stagger: 0.2 },
  SCENE_START + 0.1);

master.fromTo(S + ' .mt-kicker',
  { autoAlpha: 0, y: -12 },
  { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.18);

master.fromTo(S + ' .mt-title',
  { autoAlpha: 0, y: -18 },
  { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 0.34);

master.fromTo(S + ' .mt-customer',
  { autoAlpha: 0, x: -MAT.distance, scale: 0.96 },
  { autoAlpha: 1, x: 0, scale: 1, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 0.72);

master.fromTo(S + ' .mt-account',
  { autoAlpha: 0, y: 28, scale: 0.94 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'power2.out' },
  SCENE_START + 1.30);

master.fromTo(S + ' .mt-finance',
  { autoAlpha: 0, x: MAT.distance, scale: 0.96 },
  { autoAlpha: 1, x: 0, scale: 1, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 2.10);

master.call(function() {
  var rail = document.querySelector(S + ' .mt-rail');
  if (!rail || !rail.getTotalLength) return;
  var len = rail.getTotalLength();
  rail.style.strokeDasharray = len;
  rail.style.strokeDashoffset = len;
  gsap.to(rail, { strokeDashoffset: 0, duration: Math.min(3.3, SCENE_DURATION - 2.0), ease: 'power1.inOut' });
}, [], SCENE_START + 1.02);

master.fromTo(S + ' .mt-rail-glow',
  { autoAlpha: 0 },
  { autoAlpha: 1, duration: 0.5, ease: 'power1.out' },
  SCENE_START + 0.94);

var coinStarts = [1.18, 1.48, 1.78, 2.08, 2.38];
var coinYs = [0, -52, 38, -22, 62];
for (var i = 0; i < coinStarts.length; i++) {
  master.fromTo(S + ' .mt-coin-' + (i + 1),
    { autoAlpha: 0, x: 0, y: coinYs[i] * 0.3, scale: 0.62, rotation: -18 },
    { autoAlpha: 1, x: 650, y: coinYs[i], scale: 1, rotation: 360, duration: 1.55, ease: 'power1.inOut' },
    SCENE_START + coinStarts[i]);
  master.to(S + ' .mt-coin-' + (i + 1),
    { x: 1080, y: coinYs[i] * 0.18, scale: 0.76, autoAlpha: 0.18, duration: 1.25, ease: 'power1.in' },
    SCENE_START + coinStarts[i] + 1.55);
}

master.fromTo(S + ' .mt-signal',
  { autoAlpha: 0, y: 18 },
  { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 2.05);

master.to(S + ' .mt-dial',
  { rotation: 120, transformOrigin: '50% 50%', duration: 1.4, ease: 'power1.inOut' },
  SCENE_START + 2.55);

master.fromTo(S + ' .mt-balance-pulse',
  { scaleX: 0.28, autoAlpha: 0.42, transformOrigin: '0% 50%' },
  { scaleX: 1, autoAlpha: 1, duration: 0.9, ease: 'power2.out' },
  SCENE_START + 2.75);

master.fromTo(S + ' .mt-proof-beam',
  { autoAlpha: 0, scaleX: 0.2, transformOrigin: '100% 50%' },
  { autoAlpha: 1, scaleX: 1, duration: 0.7, ease: 'power1.out' },
  SCENE_START + 3.35);

master.fromTo(S + ' .mt-question',
  { autoAlpha: 0, y: 24, scale: 0.98 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'power2.out' },
  SCENE_START + 3.75);

master.to(S + ' .mt-actor',
  { y: -8, duration: Math.max(1.8, SCENE_DURATION - 4.6), ease: 'sine.inOut', stagger: { each: 0.08, from: 'center' } },
  SCENE_START + 4.15);

master.to(S + ' .money-transfer-scene',
  { autoAlpha: 0, duration: MAT.exit.duration, ease: MAT.exit.ease },
  SCENE_START + Math.max(0.7, SCENE_DURATION - MAT.exit.duration));
