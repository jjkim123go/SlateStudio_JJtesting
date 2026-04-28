master.to('.scene-' + SCENE_ID + ' .lt-bar',
  { x: 0, duration: 0.6, ease: 'power3.out' },
  SCENE_START + 0.2);

master.to('.scene-' + SCENE_ID + ' .lt-bar',
  { x: '-120%', duration: 0.5, ease: 'power3.in' },
  SCENE_START + SCENE_DURATION - 0.6);
