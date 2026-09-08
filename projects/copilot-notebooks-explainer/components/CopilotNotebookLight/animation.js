// Intent: glass - precise, cursor-led motion in a calm light-mode product surface.
var __cnlScope = '.scene-' + SCENE_ID + ' ';
var __cnlScale = SCENE_DURATION / 12.5;
var __cnlRoot = document.querySelector(__cnlScope + '.cnl-root');

master.fromTo(__cnlScope + '.cnl-camera',
  { scale: 1, x: 0, y: 0 },
  { scale: 1.025, x: -8, y: -5, duration: SCENE_DURATION - 0.25, ease: 'power1.inOut' },
  SCENE_START + 0.15);
master.fromTo(__cnlScope + '.cnl-callout',
  { autoAlpha: 0, y: 20, scale: 0.98 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 5.4 * __cnlScale);

if (__cnlRoot.classList.contains('cnl-mode-home')) {
  master.fromTo(__cnlScope + '.cnl-cursor',
    { autoAlpha: 0, x: -70, y: 55 },
    { autoAlpha: 1, x: 0, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 3.45 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-start-cursor',
    { autoAlpha: 1, x: 0, y: 0 },
    { x: -915, y: -221, duration: 1.15, ease: 'power2.inOut' },
    SCENE_START + 0.85 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-click-ring',
    { autoAlpha: 0, scale: 0.35 },
    { autoAlpha: 1, scale: 1.35, duration: 0.32, ease: 'power2.out' },
    SCENE_START + 2.0 * __cnlScale);
  master.to(__cnlScope + '.cnl-click-ring',
    { autoAlpha: 0, duration: 0.22, ease: 'power2.out' },
    SCENE_START + 2.32 * __cnlScale);
  master.to(__cnlScope + '.cnl-start',
    { autoAlpha: 0, scale: 1.015, duration: 0.5, ease: 'power2.inOut' },
    SCENE_START + 2.5 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-home-heading',
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 3.0 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-home-controls',
    { autoAlpha: 0, y: 14 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 3.35 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-notebook-grid article',
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.08 },
    SCENE_START + 3.7 * __cnlScale);
  master.to(__cnlScope + '.cnl-cursor',
    { x: 74, y: 48, duration: 0.75, ease: 'power2.inOut' },
    SCENE_START + 7.25 * __cnlScale);
  master.to(__cnlScope + '.cnl-cursor',
    { scale: 0.82, duration: 0.1, ease: 'power2.in' },
    SCENE_START + 8.0 * __cnlScale);
  master.to(__cnlScope + '.cnl-cursor',
    { scale: 1, duration: 0.16, ease: 'power2.out' },
    SCENE_START + 8.1 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-create-card',
    { scale: 1 },
    { scale: 0.97, duration: 0.1, ease: 'power2.in', yoyo: true, repeat: 1 },
    SCENE_START + 8.0 * __cnlScale);
} else if (!__cnlRoot.classList.contains('cnl-mode-add')) {
  master.fromTo(__cnlScope + '.cnl-cursor',
    { autoAlpha: 0, x: -70, y: 55 },
    { autoAlpha: 1, x: 0, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.8 * __cnlScale);
}

if (__cnlRoot.classList.contains('cnl-mode-add')) {
  master.fromTo(__cnlScope + '.cnl-picker-scrim',
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.28, ease: 'power2.out' },
    SCENE_START + 0.45 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-picker',
    { autoAlpha: 0, y: 20, scale: 0.98 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.6 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-picker-list label',
    { autoAlpha: 0, x: 20 },
    { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power2.out', stagger: 0.08 },
    SCENE_START + 1.25 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-cursor',
    { autoAlpha: 0, x: -760, y: -390 },
    { autoAlpha: 1, x: -795, y: -363, duration: 0.45, ease: 'power2.inOut' },
    SCENE_START + 1.2 * __cnlScale);
  [1.7, 2.6, 3.5, 4.4].forEach(function (clickAt, index) {
    if (index > 0) {
      master.to(__cnlScope + '.cnl-cursor',
        { x: -795, y: -363 + 66 * index, duration: 0.42, ease: 'power2.inOut' },
        SCENE_START + (clickAt - 0.5) * __cnlScale);
    }
    master.to(__cnlScope + '.cnl-cursor',
      { scale: 0.82, duration: 0.1, ease: 'power2.in' },
      SCENE_START + clickAt * __cnlScale);
    master.to(__cnlScope + '.cnl-cursor',
      { scale: 1, duration: 0.16, ease: 'power2.out' },
      SCENE_START + (clickAt + 0.1) * __cnlScale);
    master.to(__cnlScope + '.cnl-picker-list label:nth-child(' + (index + 1) + ') i',
      { backgroundColor: '#242424', duration: 0.18, ease: 'power2.out' },
      SCENE_START + clickAt * __cnlScale);
  });
  master.to(__cnlScope + '.cnl-cursor',
    { x: -2, y: 19, duration: 0.8, ease: 'power2.inOut' },
    SCENE_START + 4.85 * __cnlScale);
  master.to(__cnlScope + '.cnl-cursor',
    { scale: 0.82, duration: 0.1, ease: 'power2.in' },
    SCENE_START + 5.7 * __cnlScale);
  master.to(__cnlScope + '.cnl-cursor',
    { scale: 1, duration: 0.16, ease: 'power2.out' },
    SCENE_START + 5.8 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-add-button',
    { scale: 1 },
    { scale: 0.94, duration: 0.1, ease: 'power2.in', yoyo: true, repeat: 1 },
    SCENE_START + 5.7 * __cnlScale);
  master.to(__cnlScope + '.cnl-picker, ' + __cnlScope + '.cnl-picker-scrim',
    { autoAlpha: 0, duration: 0.35, ease: 'power2.in' },
    SCENE_START + 6.15 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-reference-list > div',
    { autoAlpha: 0, x: 18 },
    { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power2.out', stagger: 0.08 },
    SCENE_START + 6.35 * __cnlScale);
}

if (__cnlRoot.classList.contains('cnl-mode-ask') || __cnlRoot.classList.contains('cnl-mode-outcomes')) {
  master.fromTo(__cnlScope + '.cnl-user',
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.9 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-answer',
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 3.2 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-answer li',
    { autoAlpha: 0, x: 16 },
    { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power2.out', stagger: 0.12 },
    SCENE_START + 4.4 * __cnlScale);
}

if (__cnlRoot.classList.contains('cnl-mode-boundary')) {
  master.fromTo(__cnlScope + '.cnl-scope',
    { autoAlpha: 0, scale: 0.98 },
    { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.8 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-scope > div span',
    { autoAlpha: 0, y: 14 },
    { autoAlpha: 0.72, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.12 },
    SCENE_START + 2.8 * __cnlScale);
}

if (__cnlRoot.classList.contains('cnl-mode-forward')) {
  master.fromTo(__cnlScope + '.cnl-draft',
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.8 * __cnlScale);
  master.fromTo(__cnlScope + '.cnl-draft li',
    { autoAlpha: 0, x: 16 },
    { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power2.out', stagger: 0.12 },
    SCENE_START + 2.0 * __cnlScale);
}