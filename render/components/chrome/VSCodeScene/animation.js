/* VSCodeScene animation — Wave A chrome shell.
 * Mirrors EdgeBrowserScene timing pattern.
 * Standing Rule #12/#13: synchronous DOM, no setTimeout/await before GSAP
 * selectors, no gsap.ticker / requestAnimationFrame.
 */
(function () {
  if (typeof gsap === 'undefined') return;
  if (typeof SCENE_START === 'undefined') return;
  if (typeof SCENE_DURATION === 'undefined') return;

  var sceneSel = '.scene-' + SCENE_ID + ' ';
  var window$ = document.querySelector(sceneSel + '[data-scene-component="VSCodeScene"] .vs-window');
  if (!window$) return;

  if (typeof master === 'undefined') return;

  gsap.set(window$, { opacity: 0, y: 16, scale: 0.985, transformOrigin: 'center center' });
  master.to(window$, {
    opacity: 1, y: 0, scale: 1,
    duration: 0.55, ease: 'power3.out'
  }, SCENE_START + 0.15);
  master.to(window$, {
    opacity: 0,
    duration: 0.5, ease: 'power2.inOut'
  }, SCENE_START + Math.max(0.5, SCENE_DURATION - 0.5));

  var enterTargets = document.querySelectorAll(sceneSel + '[data-scene-component="VSCodeScene"] [data-anim="enter"]');
  if (enterTargets.length) {
    gsap.set(enterTargets, { opacity: 0, y: 8 });
    master.to(enterTargets, {
      opacity: 1, y: 0,
      duration: 0.4, ease: 'power2.out',
      stagger: 0.06
    }, SCENE_START + 0.55);
  }

  var chromeRoot = sceneSel + '[data-scene-component="VSCodeScene"] ';
  var sidebarRows = document.querySelectorAll(chromeRoot + '.vs-primary-sidebar .vs-tree-row, ' + chromeRoot + '.vs-primary-sidebar [style*="border-bottom"]');
  if (sidebarRows.length) {
    gsap.set(sidebarRows, { autoAlpha: 0, x: -10 });
    master.to(sidebarRows, {
      autoAlpha: 1,
      x: 0,
      duration: 0.28,
      ease: 'power2.out',
      stagger: { each: 0.035, from: 'start' }
    }, SCENE_START + 0.75);
  }

  var codeLines = document.querySelectorAll(chromeRoot + '.vs-code-line');
  if (codeLines.length) {
    gsap.set(codeLines, { autoAlpha: 0, x: -8 });
    master.to(codeLines, {
      autoAlpha: 1,
      x: 0,
      duration: 0.22,
      ease: 'power1.out',
      stagger: { amount: Math.min(1.4, Math.max(0.45, SCENE_DURATION * 0.22)), from: 'start' }
    }, SCENE_START + 0.95);
  }

  var minimapViewport = document.querySelector(chromeRoot + '.vs-minimap-viewport');
  if (minimapViewport) {
    master.fromTo(minimapViewport,
      { y: -10 },
      { y: Math.min(42, Math.max(16, SCENE_DURATION * 5)), duration: Math.max(1.2, SCENE_DURATION - 1.6), ease: 'sine.inOut' },
      SCENE_START + 1.05);
  }

  var editorBody = document.querySelector(chromeRoot + '.vs-codebody');
  if (editorBody && SCENE_DURATION > 3.2) {
    master.fromTo(editorBody,
      { y: 0 },
      { y: -Math.min(24, Math.max(8, SCENE_DURATION * 1.4)), duration: Math.max(1.2, SCENE_DURATION - 1.5), ease: 'sine.inOut' },
      SCENE_START + 1.2);
  }

  var secondaryRows = document.querySelectorAll(chromeRoot + '.vs-secondary-sidebar [style*="border-bottom"], ' + chromeRoot + '.vs-secondary-sidebar .vs-side-section');
  if (secondaryRows.length) {
    gsap.set(secondaryRows, { autoAlpha: 0, x: 10 });
    master.to(secondaryRows, {
      autoAlpha: 1,
      x: 0,
      duration: 0.3,
      ease: 'power2.out',
      stagger: { each: 0.04, from: 'start' }
    }, SCENE_START + 0.9);
  }

  var panel = document.querySelector(chromeRoot + '.vs-panel');
  var panelBody = document.querySelector(chromeRoot + '.vs-panel-body');
  if (panel && panelBody) {
    master.fromTo(panel,
      { y: 34, autoAlpha: 0.86 },
      { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out' },
      SCENE_START + 1.05);
    master.fromTo(panelBody,
      { y: 10 },
      { y: -12, duration: Math.max(1.0, SCENE_DURATION - 1.8), ease: 'sine.inOut' },
      SCENE_START + 1.35);
  }

  var activeActivity = document.querySelector(chromeRoot + '.vs-ab-item[aria-label="Explorer"], ' + chromeRoot + '.vs-ab-item[aria-label="Source Control"], ' + chromeRoot + '.vs-ab-item[aria-label="Chat"]');
  if (activeActivity) {
    master.fromTo(activeActivity,
      { scale: 0.96 },
      { scale: 1.04, duration: 0.42, ease: 'sine.inOut', yoyo: true, repeat: 1 },
      SCENE_START + 1.0);
  }

  var legacySteps = document.querySelectorAll(sceneSel + '.vs-step');
  var cursor = SCENE_START + 0.65;

  legacySteps.forEach(function (step) {
    var kind = step.getAttribute('data-kind') || 'open_file';
    var dur = parseFloat(step.getAttribute('data-duration') || '0.6') || 0.6;

    if (kind === 'pause') {
      cursor += dur;
      return;
    }

    if (kind === 'type') {
      var typeEl = step.querySelector('.vs-type-text');
      var fullText = '';
      if (typeEl) {
        fullText = typeEl.getAttribute('data-text') || typeEl.textContent || '';
        typeEl.textContent = '';
      } else {
        fullText = step.textContent || '';
        step.textContent = '';
      }
      master.to(step, { opacity: 1, duration: 0.08 }, cursor);
      var state = { chars: 0 };
      master.to(state, {
        chars: fullText.length,
        duration: Math.max(0.3, dur),
        ease: 'none',
        onUpdate: function () {
          var nextText = fullText.slice(0, Math.round(state.chars));
          if (typeEl) typeEl.textContent = nextText;
          else step.textContent = nextText;
        }
      }, cursor);
      cursor += Math.max(0.3, dur) + 0.12;
      return;
    }

    if (kind === 'pill' || kind === 'gutter_marker') {
      master.fromTo(step,
        { opacity: 0, scale: 0.9, transformOrigin: 'left center' },
        { opacity: 1, scale: 1, duration: Math.min(0.35, dur), ease: 'back.out(1.4)' },
        cursor);
      cursor += dur + 0.08;
      return;
    }

    master.fromTo(step,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: Math.min(0.3, dur), ease: 'power2.out' },
      cursor);
    cursor += dur + 0.08;
  });
})();
