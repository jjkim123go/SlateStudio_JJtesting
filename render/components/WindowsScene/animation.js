/* WindowsScene animation — minimal fade-in (PR 10e Wave A).
 * Standing Rule #12/#13: synchronous DOM, no setTimeout/await before GSAP
 * selectors, no gsap.ticker / requestAnimationFrame.
 */
(function () {
  if (typeof gsap === 'undefined') return;
  if (typeof SCENE_START === 'undefined') return;
  if (typeof SCENE_DURATION === 'undefined') return;

  var window$ = document.querySelector('[data-scene-component="WindowsScene"] .fe-window');
  if (!window$) return;

  if (typeof master === 'undefined') return;

  gsap.set(window$, { opacity: 0, y: 16, scale: 0.985, transformOrigin: 'center center' });

  master.to(window$, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.55,
    ease: 'power3.out'
  }, SCENE_START + 0.15);

  master.to(window$, {
    opacity: 0,
    duration: 0.5,
    ease: 'power2.inOut'
  }, SCENE_START + Math.max(0.5, SCENE_DURATION - 0.5));
})();
