// FormsScene — Wave A animation (PR 8c)
// Chrome cascade (suite → banner → variant header) → content stagger → optional state beat → exit fade.

const ROOT       = '.scene-' + SCENE_ID + ' .fs-bg';
const SUITE      = '.scene-' + SCENE_ID + ' .fs-suite';
const BANNER     = '.scene-' + SCENE_ID + ' .fs-banner';

// Home
const HOME_LOGO  = '.scene-' + SCENE_ID + ' .fs-home-logo';
const HOME_TITLE = '.scene-' + SCENE_ID + ' .fs-home-title';
const HOME_SUB   = '.scene-' + SCENE_ID + ' .fs-home-subtitle';
const HOME_PROMPT= '.scene-' + SCENE_ID + ' .fs-home-prompt';
const SCENARIOS  = '.scene-' + SCENE_ID + ' .fs-scenario';

// Gallery
const G_HEADER   = '.scene-' + SCENE_ID + ' .fs-gallery-header';
const G_CONTROLS = '.scene-' + SCENE_ID + ' .fs-gallery-controls';
const TEMPLATES  = '.scene-' + SCENE_ID + ' .fs-tmpl';

// Builder
const B_TITLEBAR = '.scene-' + SCENE_ID + ' .fs-builder-titlebar';
const B_TOOLBAR  = '.scene-' + SCENE_ID + ' .fs-builder-toolbar';
const HERO       = '.scene-' + SCENE_ID + ' .fs-hero';
const SECTION    = '.scene-' + SCENE_ID + ' .fs-section';
const AI_BANNER  = '.scene-' + SCENE_ID + ' .fs-ai-banner';
const SIDE       = '.scene-' + SCENE_ID + ' .fs-side';

// Preview
const P_TOPBAR   = '.scene-' + SCENE_ID + ' .fs-preview-topbar';
const P_FRAME    = '.scene-' + SCENE_ID + ' .fs-preview-frame';
const P_PAUSE    = '.scene-' + SCENE_ID + ' .fs-preview-pause';

const variant       = (SCENE_PROPS && SCENE_PROPS.variant)       || 'home';
const state         = (SCENE_PROPS && SCENE_PROPS.state)         || 'default';
const hasSidePanel  = !!(SCENE_PROPS && SCENE_PROPS.hasSidePanel);

// 1. Outer chrome fade
master.fromTo(ROOT,
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.05);

// 2. Common chrome (skipped on preview)
if (variant !== 'preview') {
  master.to(SUITE,  { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.15);
  master.to(BANNER, { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.22);
}

// 3. Variant-specific reveal
if (variant === 'home') {
  master.to(HOME_LOGO,   { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.30);
  master.to(HOME_TITLE,  { opacity: 1, duration: 0.30, ease: 'power2.out' }, SCENE_START + 0.40);
  master.to(HOME_SUB,    { opacity: 1, duration: 0.30, ease: 'power2.out' }, SCENE_START + 0.50);
  master.to(HOME_PROMPT, { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.65);
  master.to(SCENARIOS,
    { opacity: 1, y: 0, duration: 0.30, ease: 'power2.out', stagger: 0.08 },
    SCENE_START + 0.75);
} else if (variant === 'gallery') {
  master.to(G_HEADER,   { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.30);
  master.to(G_CONTROLS, { opacity: 1, duration: 0.30, ease: 'power2.out' }, SCENE_START + 0.40);
  master.to(TEMPLATES,
    { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', stagger: 0.04 },
    SCENE_START + 0.55);
} else if (variant === 'builder') {
  master.to(B_TITLEBAR, { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.30);
  master.to(B_TOOLBAR,  { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.38);
  if (state === 'ai-reviewing') {
    master.to(AI_BANNER,
      { opacity: 1, y: 0, duration: 0.30, ease: 'back.out(1.5)' },
      SCENE_START + 0.50);
  }
  master.to(HERO,
    { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
    SCENE_START + 0.62);
  master.to(SECTION,
    { opacity: 1, y: 0, duration: 0.30, ease: 'power2.out' },
    SCENE_START + 0.80);
  if (hasSidePanel) {
    master.to(SIDE,
      { opacity: 1, y: 0, duration: 0.32, ease: 'back.out(1.4)' },
      SCENE_START + 1.00);
  }
} else if (variant === 'preview') {
  master.to(P_TOPBAR, { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.15);
  master.to(P_PAUSE,  { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.30);
  master.to(P_FRAME,
    { opacity: 1, y: 0, duration: 0.40, ease: 'power2.out' },
    SCENE_START + 0.40);
}

// 4. Exit fade — last 0.5s of the scene
master.to(ROOT,
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
