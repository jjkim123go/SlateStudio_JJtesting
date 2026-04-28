// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION
(function () {
  var root = document.querySelector('.scene-' + SCENE_ID + ' .pt-root');
  if (!root) return;

  function clean(value) {
    if (!value || typeof value !== 'string') return '';
    if (value.indexOf('{{') === 0) return '';
    return value.trim();
  }

  function setBackground(node, src, fallback) {
    if (!node) return;
    node.style.backgroundImage = src ? 'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.28)), url("' + src.replace(/"/g, '\\"') + '")' : fallback;
  }

  var direction = clean(root.getAttribute('data-direction')) || 'left-to-right';
  var outgoingSrc = clean(root.getAttribute('data-outgoing-src'));
  var incomingSrc = clean(root.getAttribute('data-incoming-src'));
  var sheet = document.querySelector('.scene-' + SCENE_ID + ' .pt-sheet');
  var frontMedia = document.querySelector('.scene-' + SCENE_ID + ' .pt-front .pt-media');
  var backMedia = document.querySelector('.scene-' + SCENE_ID + ' .pt-back .pt-media');
  var underMedia = document.querySelector('.scene-' + SCENE_ID + ' .pt-backdrop .pt-media');

  root.setAttribute('data-direction', direction);
  if (!clean(root.style.getPropertyValue('--pt-paper'))) {
    root.style.setProperty('--pt-paper', '#f5f1e8');
  }
  if (!clean(root.style.getPropertyValue('--pt-accent'))) {
    root.style.setProperty('--pt-accent', '#0078D4');
  }

  setBackground(frontMedia, outgoingSrc, 'linear-gradient(135deg, rgba(27,38,59,0.96) 0%, rgba(10,18,32,0.92) 45%, rgba(5,8,15,0.95) 100%), radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 40%)');
  setBackground(backMedia, incomingSrc, 'linear-gradient(135deg, rgba(12,74,110,0.88) 0%, rgba(37,99,235,0.76) 42%, rgba(126,34,206,0.82) 100%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.16), transparent 32%)');
  setBackground(underMedia, incomingSrc, 'linear-gradient(135deg, rgba(15,23,42,0.86) 0%, rgba(30,41,59,0.78) 42%, rgba(88,28,135,0.74) 100%), radial-gradient(circle at 82% 24%, rgba(255,255,255,0.16), transparent 32%)');

  var scope = '.scene-' + SCENE_ID + ' ';
  var sweep = scope + '.pt-sweep';
  var backGlow = scope + '.pt-back-glow';
  var cast = scope + '.pt-cast';
  var backdrop = scope + '.pt-backdrop';
  var frontOverlay = scope + '.pt-front .pt-overlay';
  var backOverlay = scope + '.pt-back .pt-overlay';
  var turnDur = Math.max(0.9, SCENE_DURATION * 0.82);
  var settleDur = Math.max(0.16, SCENE_DURATION - turnDur);
  var endRotation = direction === 'right-to-left' ? 179.9 : -179.9;
  var sweepFromX = direction === 'right-to-left' ? 180 : -180;
  var sweepToX = direction === 'right-to-left' ? -24 : 24;

  if (sheet) {
    sheet.style.transformOrigin = direction === 'right-to-left' ? 'right center' : 'left center';
  }

  master.set(sheet, { rotationY: 0 }, SCENE_START);
  master.set(backdrop, { autoAlpha: 0.84, scale: 1.02, filter: 'blur(8px)' }, SCENE_START);
  master.set(backOverlay, { autoAlpha: 0.7 }, SCENE_START);

  master.fromTo(sheet,
    { rotationY: 0, filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.18))' },
    { rotationY: endRotation, filter: 'drop-shadow(0 36px 54px rgba(0,0,0,0.34))', duration: turnDur, ease: 'power2.inOut' },
    SCENE_START);

  master.fromTo(sweep,
    { x: sweepFromX, autoAlpha: 0 },
    { x: sweepToX, autoAlpha: 0.9, duration: turnDur * 0.58, ease: 'power2.inOut' },
    SCENE_START + turnDur * 0.04);

  master.to(sweep,
    { autoAlpha: 0, duration: turnDur * 0.24, ease: 'power2.out' },
    SCENE_START + turnDur * 0.56);

  master.fromTo(backGlow,
    { autoAlpha: 0, x: direction === 'right-to-left' ? -40 : 40 },
    { autoAlpha: 0.75, x: 0, duration: turnDur * 0.42, ease: 'power2.out' },
    SCENE_START + turnDur * 0.46);

  master.to(backGlow,
    { autoAlpha: 0.18, duration: settleDur, ease: 'sine.out' },
    SCENE_START + turnDur);

  master.fromTo(cast,
    { scale: 0.86, autoAlpha: 0.16 },
    { scale: 1.08, autoAlpha: 0.42, duration: turnDur * 0.62, ease: 'power2.inOut' },
    SCENE_START);

  master.to(cast,
    { scale: 1.18, autoAlpha: 0.2, duration: settleDur, ease: 'sine.out' },
    SCENE_START + turnDur);

  master.to(backdrop,
    { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: Math.max(0.5, SCENE_DURATION * 0.48), ease: 'power2.out' },
    SCENE_START + turnDur * 0.34);

  master.to(frontOverlay,
    { autoAlpha: 0.18, duration: turnDur * 0.54, ease: 'power1.inOut' },
    SCENE_START + turnDur * 0.08);

  master.fromTo(backOverlay,
    { autoAlpha: 0.52, filter: 'blur(6px)' },
    { autoAlpha: 1, filter: 'blur(0px)', duration: Math.max(0.36, SCENE_DURATION * 0.28), ease: 'power2.out' },
    SCENE_START + turnDur * 0.54);
})();
