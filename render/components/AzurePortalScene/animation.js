// AzurePortalScene — synthetic Azure Portal recording
// step kinds: navigate (breadcrumb segment fade-in), select_resource (row highlight + slide-in),
//   tab_change (tab underline slides), field_input (typewriter into form field),
//   click_button (button ripple/flash), notification (toast slides in top-right),
//   pause (hold), pill (status badge fade-in)
// v1 OUT-OF-SCOPE: real ARM API responses, mouse cursor, multi-blade stacking,
//   keyboard shortcut surfaces, dark theme, command bar overflow menus.

master.fromTo('.scene-' + SCENE_ID + ' .az-window',
  { opacity: 0, y: 16, scale: 0.985 },
  { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' },
  SCENE_START + 0.15);

const steps = document.querySelectorAll('.scene-' + SCENE_ID + ' .az-step');
let cursor = SCENE_START + 0.85;

steps.forEach(function(step) {
  const kind = step.getAttribute('data-kind');
  const dur = parseFloat(step.getAttribute('data-duration')) || 0.5;

  if (kind === 'navigate') {
    master.fromTo(step,
      { opacity: 0, x: -6 },
      { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' },
      cursor);
    cursor += dur;
  } else if (kind === 'select_resource') {
    master.fromTo(step,
      { opacity: 0, x: 12 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' },
      cursor);
    cursor += dur;
  } else if (kind === 'tab_change') {
    master.fromTo(step,
      { opacity: 0, scaleX: 0.3, transformOrigin: 'left center' },
      { opacity: 1, scaleX: 1, duration: 0.35, ease: 'power2.out' },
      cursor);
    cursor += dur;
  } else if (kind === 'field_input') {
    const txt = step.querySelector('.az-field-text');
    if (txt) {
      const fullText = txt.getAttribute('data-text') || txt.textContent;
      txt.textContent = '';
      master.to(step, { opacity: 1, duration: 0.05 }, cursor);
      master.call(function() {
        const obj = { i: 0 };
        gsap.to(obj, {
          i: fullText.length,
          duration: dur,
          ease: 'none',
          onUpdate: function() {
            txt.textContent = fullText.substring(0, Math.floor(obj.i));
          }
        });
      }, [], cursor + 0.05);
      cursor += dur + 0.2;
    } else {
      master.to(step, { opacity: 1, duration: 0.2 }, cursor);
      cursor += dur;
    }
  } else if (kind === 'click_button') {
    master.fromTo(step,
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' },
      cursor);
    master.to(step,
      { boxShadow: '0 0 0 6px rgba(0,120,212,0.25)', duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' },
      cursor + 0.2);
    cursor += dur;
  } else if (kind === 'notification') {
    master.fromTo(step,
      { opacity: 0, x: 60 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' },
      cursor);
    cursor += dur;
  } else if (kind === 'pause') {
    cursor += dur;
  } else if (kind === 'pill') {
    master.fromTo(step,
      { opacity: 0, scale: 0.85, transformOrigin: 'left center' },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' },
      cursor);
    cursor += dur;
  }
});

master.to('.scene-' + SCENE_ID + ' .az-window',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
