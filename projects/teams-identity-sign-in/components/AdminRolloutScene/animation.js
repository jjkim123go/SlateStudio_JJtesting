// Intent: glass - guided momentum from protected admins to broad rollout.
const S = '.scene-' + SCENE_ID;
const t = SCENE_START;

master.fromTo(S + ' .ars-admin',
  { autoAlpha: 0, x: -20, scale: 0.96 },
  { autoAlpha: 1, x: 0, scale: 1, duration: 0.6, ease: 'power2.out' },
  t + 0.2);

master.fromTo(S + ' .ars-arrow-line',
  { strokeDashoffset: 380 },
  { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' },
  t + 1.15);

master.fromTo(S + ' .ars-arrow-head',
  { autoAlpha: 0, x: -20 },
  { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' },
  t + 1.68);

master.fromTo(S + ' .ars-everyone',
  { autoAlpha: 0, x: 20, scale: 0.96 },
  { autoAlpha: 1, x: 0, scale: 1, duration: 0.6, ease: 'power2.out' },
  t + 2.15);