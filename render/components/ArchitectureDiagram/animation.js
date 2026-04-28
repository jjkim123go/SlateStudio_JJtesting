// ArchitectureDiagram — title fades, boxes pop in staggered, arrows stroke-draw on
master.fromTo('.scene-' + SCENE_ID + ' .ad-title',
  { opacity: 0, y: -16 },
  { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  SCENE_START + 0.2);

// Boxes: stagger pop-in
master.fromTo('.scene-' + SCENE_ID + ' .ad-box',
  { opacity: 0, scale: 0.7, transformOrigin: 'center' },
  { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.18 },
  SCENE_START + 0.7);

// Arrows: draw via stroke-dashoffset
master.call(function() {
  const arrows = document.querySelectorAll('.scene-' + SCENE_ID + ' .ad-arrow');
  arrows.forEach(function(line, idx) {
    if (!line.getTotalLength) return;
    const len = line.getTotalLength();
    line.style.opacity = '1';
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
    gsap.to(line, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', delay: idx * 0.15 });
  });
}, [], SCENE_START + 1.5);

master.fromTo('.scene-' + SCENE_ID + ' .ad-arrow-label',
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.15 },
  SCENE_START + 2.0);

master.to('.scene-' + SCENE_ID + ' .ad-svg, .scene-' + SCENE_ID + ' .ad-title',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
