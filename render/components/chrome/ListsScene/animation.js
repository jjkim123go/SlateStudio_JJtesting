// ListsScene — Wave A animation (PR 8c)
// Chrome reveal → row stagger → optional context-menu pop → exit fade.
// Wave B agents may add cell-edit, sort-flip, and pill-toggle micro-interactions.

const ROOT = '.scene-' + SCENE_ID + ' .ls-bg';
const ROWS = '.scene-' + SCENE_ID + ' .ls-row';
const MENU = '.scene-' + SCENE_ID + ' .ls-context-menu';

// 1. Chrome fade in
master.fromTo(ROOT,
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.05);

// 2. Row reveal — staggered drop-in once chrome is visible
master.to(ROWS,
  { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', stagger: 0.04 },
  SCENE_START + 0.35);

// 3. Context menu pop (only matters when state=menu-open; harmless otherwise)
if (SCENE_PROPS && SCENE_PROPS.state === 'menu-open') {
  master.to(MENU,
    { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
    SCENE_START + 0.65);
}

// 4. Exit fade — last 0.5s of the scene
master.to(ROOT,
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
