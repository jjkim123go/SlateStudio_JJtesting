// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION
(function () {
  var root = document.querySelector('.scene-' + SCENE_ID + ' .iz-root');
  if (!root) return;

  function clean(value) {
    if (!value || typeof value !== 'string') return '';
    if (value.indexOf('{{') === 0) return '';
    return value.trim();
  }

  function setBackground(node, src, fallback) {
    if (!node) return;
    node.style.backgroundImage = src ? 'linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.24)), url("' + src.replace(/"/g, '\\"') + '")' : fallback;
  }

  function setText(selector, value, fallback) {
    var node = document.querySelector('.scene-' + SCENE_ID + ' ' + selector);
    if (!node) return;
    node.textContent = value || fallback;
  }

  var focalPoint = clean(root.getAttribute('data-focal-point')) || '50% 50%';
  var parts = focalPoint.split(/\s+/);
  var focalX = parts[0] || '50%';
  var focalY = parts[1] || '50%';
  root.style.setProperty('--iz-x', focalX);
  root.style.setProperty('--iz-y', focalY);

  setBackground(document.querySelector('.scene-' + SCENE_ID + ' .iz-outgoing'), clean(root.getAttribute('data-outgoing-src')), 'linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.84) 48%, rgba(2,6,23,0.98) 100%), radial-gradient(circle at 24% 22%, rgba(255,255,255,0.12), transparent 34%)');
  setBackground(document.querySelector('.scene-' + SCENE_ID + ' .iz-incoming'), clean(root.getAttribute('data-incoming-src')), 'linear-gradient(135deg, rgba(2,132,199,0.78) 0%, rgba(59,130,246,0.64) 42%, rgba(147,51,234,0.82) 100%), radial-gradient(circle at 78% 18%, rgba(255,255,255,0.16), transparent 28%)');

  setText('.iz-kicker-outgoing', clean(root.getAttribute('data-outgoing-label')), 'Current focus');
  setText('.iz-title-outgoing', 'Iris closes', 'Iris closes');
  setText('.iz-subtitle-outgoing', clean(root.getAttribute('data-subline')), 'The outgoing scene contracts into a precise focal point before the next image blooms open.');
  setText('.iz-kicker-incoming', clean(root.getAttribute('data-incoming-label')), 'Next focus');
  setText('.iz-title-incoming', 'Iris opens', 'Iris opens');
  setText('.iz-subtitle-incoming', clean(root.getAttribute('data-subline')), 'The outgoing scene contracts into a precise focal point before the next image blooms open.');

  var outgoing = '.scene-' + SCENE_ID + ' .iz-outgoing';
  var incoming = '.scene-' + SCENE_ID + ' .iz-incoming';
  var ring = '.scene-' + SCENE_ID + ' .iz-ring';
  var maxRadius = 'circle(150% at ' + focalX + ' ' + focalY + ')';
  var closedRadius = 'circle(0% at ' + focalX + ' ' + focalY + ')';
  var beat = Math.min(0.15, SCENE_DURATION * 0.12);
  var closeDur = Math.max(0.42, (SCENE_DURATION - beat) * 0.5);
  var openDur = Math.max(0.42, SCENE_DURATION - closeDur - beat);
  var reopenStart = SCENE_START + closeDur + beat;

  master.set(incoming, { clipPath: closedRadius, autoAlpha: 1, scale: 1.08, filter: 'blur(12px)' }, SCENE_START);
  master.set(outgoing, { clipPath: maxRadius, autoAlpha: 1, scale: 1, filter: 'blur(0px)' }, SCENE_START);

  master.fromTo(outgoing,
    { clipPath: maxRadius, scale: 1, filter: 'blur(0px)' },
    { clipPath: closedRadius, scale: 0.92, filter: 'blur(4px)', duration: closeDur, ease: 'power2.inOut' },
    SCENE_START);

  master.fromTo(ring,
    { autoAlpha: 0, scale: 0.84 },
    { autoAlpha: 0.95, scale: 1.08, duration: closeDur * 0.82, ease: 'sine.out' },
    SCENE_START + closeDur * 0.08);

  master.to(ring,
    { autoAlpha: 0.22, duration: beat, ease: 'power1.out' },
    SCENE_START + closeDur);

  master.to(outgoing,
    { autoAlpha: 0, duration: 0.02, ease: 'none' },
    SCENE_START + closeDur);

  master.fromTo(incoming,
    { clipPath: closedRadius, scale: 1.08, filter: 'blur(12px)' },
    { clipPath: maxRadius, scale: 1, filter: 'blur(0px)', duration: openDur, ease: 'power2.inOut' },
    reopenStart);

  master.to(ring,
    { autoAlpha: 0, duration: openDur * 0.9, ease: 'sine.out' },
    reopenStart);
})();
