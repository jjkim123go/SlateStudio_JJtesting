// CTABlock — premium closing card with glassmorphic button
var S = '.scene-' + SCENE_ID + ' ';

// Phase 1 (0.0–0.5s): Background glow + headline fade in with y-slide
master.fromTo(S + '.cta-glow',
  { autoAlpha: 0, scale: 0.9 },
  { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' },
  SCENE_START);

master.fromTo(S + '.cta-headline',
  { autoAlpha: 0, y: 30 },
  { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.1);

// Phase 2 (0.5–1.0s): Body text fades in
master.fromTo(S + '.cta-body',
  { autoAlpha: 0, y: 20 },
  { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' },
  SCENE_START + 0.5);

// Phase 3 (1.0–1.8s): Button scales up + glow pulse
master.fromTo(S + '.cta-btn-wrap',
  { autoAlpha: 0, scale: 0.8 },
  { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' },
  SCENE_START + 1.0);

master.fromTo(S + '.cta-btn-glow',
  { autoAlpha: 0, scale: 0.7 },
  { autoAlpha: 0.9, scale: 1, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 1.2);

// Shine sweep across button (transform-only via xPercent)
master.fromTo(S + '.cta-btn-shine',
  { xPercent: -120 },
  { xPercent: 120, duration: 0.7, ease: 'power2.inOut' },
  SCENE_START + 1.8);

// Fade out everything near scene end
master.to(S + '.cta-root',
  { autoAlpha: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
