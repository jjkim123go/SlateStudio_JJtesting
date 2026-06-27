// CalloutBox — leader draws from target → box, card scales in with bounce,
// holds, fades out. Pulse ring loops while card is visible.
// Props consumed: enterDelay, holdDuration (numeric Mustache substitutions).

var __cbxEnter = parseFloat('{{enterDelay}}');
if (!isFinite(__cbxEnter)) __cbxEnter = 0;
var __cbxHold = parseFloat('{{holdDuration}}');
if (!isFinite(__cbxHold)) __cbxHold = Math.max(0.6, SCENE_DURATION - __cbxEnter - 0.5);

var __cbxStart = SCENE_START + __cbxEnter;
var __cbxOutAt = Math.min(
  SCENE_START + SCENE_DURATION - 0.4,
  __cbxStart + 0.9 + __cbxHold
);
var __cbxScope = '.scene-' + SCENE_ID + ' ';

// 1. Target dot lands first
master.fromTo(__cbxScope + '.cbx-target',
  { opacity: 0, scale: 0.2 },
  { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' },
  __cbxStart);

// 2. Pulse ring — repeats throughout the hold
master.fromTo(__cbxScope + '.cbx-pulse',
  { opacity: 0.7, scale: 1 },
  { opacity: 0, scale: 3.2, duration: 1.4, ease: 'power2.out', repeat: -1 },
  __cbxStart + 0.1);

// 3. Leader line draws outward from target
master.to(__cbxScope + '.cbx-leader-line',
  { scaleX: 1, duration: 0.45, ease: 'power2.out' },
  __cbxStart + 0.25);

// 4. Card scales in with a bounce, anchored at its corner nearest the target
master.fromTo(__cbxScope + '.cbx-card',
  { opacity: 0, scale: 0.7 },
  { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.7)' },
  __cbxStart + 0.55);

// 5. Coordinated fade-out near scene end (or after holdDuration)
master.to(__cbxScope + '.cbx-card, ' + __cbxScope + '.cbx-leader-line, ' + __cbxScope + '.cbx-target, ' + __cbxScope + '.cbx-pulse',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  __cbxOutAt);
