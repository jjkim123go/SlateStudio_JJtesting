// Intent: glass - calm clarity for a Microsoft help-video opening.
var __cneTitleScope = '.scene-' + SCENE_ID + ' ';
master.fromTo(__cneTitleScope + '.cne-title-lockup',
  { autoAlpha: 0, y: 24 },
  { autoAlpha: 1, y: 0, duration: 0.65, ease: 'power2.out' },
  SCENE_START + 0.3);
master.fromTo(__cneTitleScope + '.cne-title-icon',
  { autoAlpha: 0, scale: 0.9 },
  { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'power2.out' },
  SCENE_START + 0.7);
master.fromTo(__cneTitleScope + '.cne-title-rule',
  { scaleY: 0, transformOrigin: 'top center' },
  { scaleY: 1, duration: 0.7, ease: 'power2.out' },
  SCENE_START + 0.1);
