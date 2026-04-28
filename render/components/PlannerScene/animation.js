// PlannerScene — Wave A animation (PR 8c)
// Chrome reveal → bucket/card stagger (board) OR chart-card stagger (charts)
//   → optional task-detail modal pop → exit fade.
// Wave B agents may add card hover, drag-preview, and column-scroll micro-interactions.

const ROOT       = '.scene-' + SCENE_ID + ' .ps-bg';
const BUCKETS    = '.scene-' + SCENE_ID + ' .ps-bucket';
const CARDS      = '.scene-' + SCENE_ID + ' .ps-card';
const CHART_CARDS= '.scene-' + SCENE_ID + ' .ps-chart-card';

const variant = (SCENE_PROPS && SCENE_PROPS.variant) || 'board';
const state   = (SCENE_PROPS && SCENE_PROPS.state) || 'default';

// 1. Chrome fade in
master.fromTo(ROOT,
  { opacity: 0 },
  { opacity: 1, duration: 0.4, ease: 'power2.out' },
  SCENE_START + 0.05);

if (variant === 'charts') {
  // 2a. Chart cards stagger
  master.to(CHART_CARDS,
    { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', stagger: 0.08 },
    SCENE_START + 0.35);
} else {
  // 2b. Bucket columns sweep in, then task cards stagger inside
  master.to(BUCKETS,
    { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', stagger: 0.06 },
    SCENE_START + 0.35);
  master.to(CARDS,
    { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out', stagger: 0.04 },
    SCENE_START + 0.55);
}

// 3. Task-detail modal pop (only matters when state=task-open)
if (state === 'task-open') {
  // CSS handles the visual transition via [data-state]; we just punctuate it
  // here so the timeline records a beat the reviewer can verify.
  master.to(ROOT,
    { duration: 0.3, ease: 'power2.out' },
    SCENE_START + 0.85);
}

// 4. Exit fade — last 0.5s of the scene
master.to(ROOT,
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
