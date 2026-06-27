// BookingsScene — Wave A animation (PR 8c)
// Chrome cascade (suite → home header / public card) → content stagger → optional modal beat → exit fade.

const ROOT       = '.scene-' + SCENE_ID + ' .bs-bg';
const SUITE      = '.scene-' + SCENE_ID + ' .bs-suite';

// Home
const HOME_HEAD  = '.scene-' + SCENE_ID + ' .bs-home-header';
const SECTIONS   = '.scene-' + SCENE_ID + ' .bs-section';
const CARDS      = '.scene-' + SCENE_ID + ' .bs-card';

// Public-page
const PUB_CARD   = '.scene-' + SCENE_ID + ' .bs-public-card';
const CAL        = '.scene-' + SCENE_ID + ' .bs-cal';
const TIMES      = '.scene-' + SCENE_ID + ' .bs-times';
const SLOTS      = '.scene-' + SCENE_ID + ' .bs-slot';

// Modal
const SCRIM      = '.scene-' + SCENE_ID + ' .bs-scrim';
const MODAL      = '.scene-' + SCENE_ID + ' .bs-modal';

const variant   = (SCENE_PROPS && SCENE_PROPS.variant)   || 'home';
const state     = (SCENE_PROPS && SCENE_PROPS.state)     || 'default';
const hasModal  = !!(SCENE_PROPS && SCENE_PROPS.hasModal);

// 1. Outer fade-in
master.fromTo(ROOT,
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.05);

// 2. Suite bar (only when present)
if (variant !== 'public-page') {
  master.to(SUITE, { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.15);
}

// 3. Variant-specific reveal
if (variant === 'home') {
  master.to(HOME_HEAD,
    { opacity: 1, duration: 0.35, ease: 'power2.out' },
    SCENE_START + 0.25);
  master.to(SECTIONS,
    { opacity: 1, y: 0, duration: 0.30, ease: 'power2.out', stagger: 0.10 },
    SCENE_START + 0.42);
  master.to(CARDS,
    { opacity: 1, y: 0, duration: 0.30, ease: 'power2.out', stagger: 0.06 },
    SCENE_START + 0.62);
} else if (variant === 'public-page') {
  master.to(PUB_CARD,
    { opacity: 1, duration: 0.40, ease: 'power2.out' },
    SCENE_START + 0.20);
  master.to(CAL,
    { opacity: 1, y: 0, duration: 0.30, ease: 'power2.out' },
    SCENE_START + 0.45);
  master.to(TIMES,
    { opacity: 1, y: 0, duration: 0.30, ease: 'power2.out' },
    SCENE_START + 0.55);
  master.to(SLOTS,
    { opacity: 1, y: 0, duration: 0.20, ease: 'power2.out', stagger: 0.04 },
    SCENE_START + 0.70);
}

// 4. Optional create-modal overlay beat
if (hasModal) {
  master.to(SCRIM,
    { opacity: 1, duration: 0.25, ease: 'power2.out' },
    SCENE_START + 1.20);
  master.fromTo(MODAL,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.32, ease: 'back.out(1.4)' },
    SCENE_START + 1.30);
}

// 5. Exit fade — last 0.5s of the scene
master.to(ROOT,
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
