// OneDriveScene — Wave A animation (PR 8c)
// Chrome cascade (suite → banner → rail → toolbar/cmdbar → headers)
//   → row stagger → optional context-menu / share-dialog / feedback pop → exit fade.
// Wave B agents may add row hover, command-bar item hover, and dialog field-focus beats.

const ROOT     = '.scene-' + SCENE_ID + ' .od-bg';
const SUITE    = '.scene-' + SCENE_ID + ' .od-suite';
const BANNER   = '.scene-' + SCENE_ID + ' .od-banner';
const RAIL     = '.scene-' + SCENE_ID + ' .od-rail';
const TOOLBAR  = '.scene-' + SCENE_ID + ' .od-toolbar';
const CMDBAR   = '.scene-' + SCENE_ID + ' .od-cmdbar';
const HEADERS  = '.scene-' + SCENE_ID + ' .od-col-headers';
const ROWS     = '.scene-' + SCENE_ID + ' .od-row';
const CTXMENU  = '.scene-' + SCENE_ID + ' .od-context-menu';
const SCRIM    = '.scene-' + SCENE_ID + ' .od-share-scrim';
const DIALOG   = '.scene-' + SCENE_ID + ' .od-share-dialog';
const FEEDBACK_HOST = '.scene-' + SCENE_ID + ' .od-feedback-host';
const FEEDBACK = FEEDBACK_HOST + ' .od-feedback';

const variant = (SCENE_PROPS && SCENE_PROPS.variant) || 'default';
const state   = (SCENE_PROPS && SCENE_PROPS.state)   || 'default';
const showFeedback = !!(SCENE_PROPS && SCENE_PROPS.showFeedbackCard);

// 1. Outer chrome fade
master.fromTo(ROOT,
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.05);

// 2. Chrome elements cascade (suite → banner → rail → toolbar → headers)
master.to(SUITE,    { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.15);
master.to(BANNER,   { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.22);
master.to(RAIL,     { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.28);
if (variant === 'selected') {
  master.to(CMDBAR, { opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.34);
} else {
  master.to(TOOLBAR,{ opacity: 1, duration: 0.25, ease: 'power2.out' }, SCENE_START + 0.34);
}
master.to(HEADERS,  { opacity: 1, duration: 0.20, ease: 'power2.out' }, SCENE_START + 0.40);

// 3. File rows stagger in
master.to(ROWS,
  { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', stagger: 0.025 },
  SCENE_START + 0.50);

// 4. Modal beats
if (state === 'context-menu') {
  master.to(CTXMENU,
    { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'back.out(1.6)' },
    SCENE_START + 0.95);
}
if (state === 'share-dialog') {
  master.to(SCRIM,
    { opacity: 1, duration: 0.20, ease: 'power2.out' },
    SCENE_START + 0.95);
  master.to(DIALOG,
    { opacity: 1, scale: 1, x: '-50%', y: '-50%', duration: 0.26, ease: 'back.out(1.5)' },
    SCENE_START + 1.00);
}
if (showFeedback) {
  master.to(FEEDBACK,
    { opacity: 1, y: 0, duration: 0.30, ease: 'power2.out' },
    SCENE_START + 1.30);
}

// 5. Exit fade — last 0.5s of the scene
master.to(ROOT,
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
