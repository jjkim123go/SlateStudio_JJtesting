// PowerPointScene — Wave A Chrome Shell (PR 10c)
// Minimal animation stub. Wave B adds step-kind animations.
//
// Mode toggle: .ppt-mode-edit (default) ↔ .ppt-mode-present (full-bleed)
// Call pptSetMode('present') / pptSetMode('edit') from step handlers.

var S = '.scene-' + SCENE_ID;
var root = document.querySelector(S + ' .ppt-root');

/**
 * Toggle between edit and present modes.
 * @param {'edit'|'present'} mode
 */
function pptSetMode(mode) {
  if (!root) return;
  root.classList.remove('ppt-mode-edit', 'ppt-mode-present');
  root.classList.add('ppt-mode-' + mode);
}

// Reveal chrome
master.fromTo(S + ' .ppt-root',
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.1);

// Exit fade
master.to(S + ' .ppt-root',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
