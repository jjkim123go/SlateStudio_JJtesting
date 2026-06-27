// TeamsScene — view-aware reveal animation.
// All structure & theming pre-rendered by the TeamsScene PROP_TRANSFORMER.
// Contract globals (injected by compiler): SCENE_ID, SCENE_START, SCENE_DURATION,
//   SCENE_PROPS, and a shared `master` GSAP timeline.

var view = (SCENE_PROPS && SCENE_PROPS.view) || 'chat';
var sel = '.scene-' + SCENE_ID + ' ';

// Pre-state: hide steps; chrome stays at opacity 1 from frame 0 (no intro animation)
master.set(sel + '.tm-step', { opacity: 0 }, SCENE_START);
master.set(
  sel + '.tm-topbar, ' + sel + '.tm-rail, ' + sel + '.tm-nav, ' +
  sel + '.tm-content-header, ' + sel + '.tm-cal-toolbar, ' + sel + '.tm-shared-toolbar',
  { opacity: 1, x: 0, y: 0 },
  SCENE_START);

// Step cadence (seconds)
var STEP_DUR = {
  pause: 0,
  date_divider: 0.4,
  message: 0.5,
  message_with_quote: 0.6,
  file_link: 0.55,
  activity_item: 0.5,
  reaction: 0.35,
};
var STEP_PAUSE = {
  pause: 0,
  date_divider: 0.2,
  message: 0.4,
  message_with_quote: 0.5,
  file_link: 0.5,
  activity_item: 0.35,
  reaction: 0.25,
};

var steps = document.querySelectorAll(sel + '.tm-step');
var cursor = SCENE_START + 0.2;

steps.forEach(function (step) {
  var kind = step.getAttribute('data-kind') || 'message';
  var dur = STEP_DUR[kind] != null ? STEP_DUR[kind] : 0.5;

  if (kind === 'pause') {
    var customPause = parseFloat(step.getAttribute('data-duration') || '1');
    cursor += customPause;
    return;
  }

  if (kind === 'reaction') {
    var targetId = step.getAttribute('data-target');
    var emoji = step.getAttribute('data-emoji') || '👍';
    if (targetId) {
      var targetEl = document.querySelector(sel + '.tm-step[data-step-id="' + targetId + '"]');
      if (targetEl) {
        var rxBox = targetEl.querySelector('.tm-msg-reactions');
        if (!rxBox) {
          rxBox = document.createElement('div');
          rxBox.className = 'tm-msg-reactions';
          rxBox.style.opacity = '0';
          var body = targetEl.querySelector('.tm-msg-body');
          if (body) body.appendChild(rxBox);
        }
        var pill = document.createElement('span');
        pill.className = 'tm-reaction-pill';
        pill.style.opacity = '0';
        pill.innerHTML = emoji + '<span>1</span>';
        rxBox.appendChild(pill);
        master.to(rxBox, { opacity: 1, duration: 0.2 }, cursor);
        master.fromTo(pill,
          { opacity: 0, scale: 0.85, transformOrigin: 'center' },
          { opacity: 1, scale: 1, duration: dur, ease: 'back.out(1.4)' },
          cursor);
      }
    }
    cursor += dur + (STEP_PAUSE[kind] || 0);
    return;
  }

  // Default: subtle fade-up reveal
  var stepDur = Math.min(dur, 0.3);
  master.fromTo(step,
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: stepDur, ease: 'power2.out' },
    cursor);
  cursor += dur + (STEP_PAUSE[kind] || 0);
});

// Composer: already on screen as part of chrome (no intro animation)
if (view === 'chat' || view === 'channel_post') {
  master.set(sel + '.tm-composer-wrap', { opacity: 1, y: 0 }, SCENE_START);
}

// Calendar: subtle highlight on the selected event near the end
if (view === 'calendar') {
  master.fromTo(sel + '.tm-cal-event[data-state="selected"]',
    { opacity: 0.6 },
    { opacity: 1, duration: 0.3, ease: 'power2.out' },
    cursor);
}

// Exit fade
master.to(sel + '.teams-bg',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
