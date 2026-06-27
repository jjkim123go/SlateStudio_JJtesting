const bpmScope = '.scene-' + SCENE_ID + ' ';
const rootNode = document.querySelector(bpmScope + '.book-page-metrics-root');
const pageArt = document.querySelector(bpmScope + '.book-page-art');
if (rootNode && pageArt) {
  const pageImage = (rootNode.getAttribute('data-page-image') || '').trim();
  if (pageImage && pageImage.indexOf('{{') !== 0) {
    pageArt.style.backgroundImage = `url("${pageImage.replace(/"/g, '\\"')}")`;
  }
}

master.fromTo(bpmScope + '.book-page-book',
  { autoAlpha: 0, y: 80, rotationX: 10, rotationY: -12, scale: 0.94 },
  { autoAlpha: 1, y: 0, rotationX: 6, rotationY: -9, scale: 1, duration: 0.9, ease: 'power3.out' },
  SCENE_START + 0.08);

master.fromTo(bpmScope + '.book-page-kicker',
  { autoAlpha: 0, y: 14 },
  { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' },
  SCENE_START + 0.34);

master.fromTo(bpmScope + '.book-page-title',
  { autoAlpha: 0, y: 18 },
  { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out' },
  SCENE_START + 0.52);

master.fromTo(bpmScope + '.book-page-body',
  { autoAlpha: 0, y: 16 },
  { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out' },
  SCENE_START + 0.74);

master.fromTo(bpmScope + '.book-page-overlay',
  { autoAlpha: 0, y: 34, rotationX: 4, scale: 0.98 },
  { autoAlpha: 1, y: 0, rotationX: 0, scale: 1, duration: 0.62, ease: 'power3.out' },
  SCENE_START + 0.98);

master.to(bpmScope + '.book-page-book',
  { y: -6, duration: Math.max(0.6, SCENE_DURATION * 0.7), ease: 'sine.inOut' },
  SCENE_START + 1.05);

master.to(bpmScope + '.book-page-metrics-root',
  { autoAlpha: 0, duration: 0.32, ease: 'power2.in' },
  SCENE_START + Math.max(0.2, SCENE_DURATION - 0.32));
