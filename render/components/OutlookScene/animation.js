// OutlookScene — synthetic Outlook web recording
// step kinds: inbox_arrival, email_open, compose, attach, send, calendar_invite, pause, pill
// v1 OUT-OF-SCOPE: drag-and-drop, multi-select, conversation threading, search, Copilot panel

// Reveal chrome
master.fromTo('.scene-' + SCENE_ID + ' .ol-ribbon',
  { opacity: 0, y: -10 },
  { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
  SCENE_START + 0.1);

master.fromTo('.scene-' + SCENE_ID + ' .ol-folders',
  { opacity: 0, x: -20 },
  { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' },
  SCENE_START + 0.15);

master.fromTo('.scene-' + SCENE_ID + ' .ol-msglist',
  { opacity: 0 },
  { opacity: 1, duration: 0.3, ease: 'power2.out' },
  SCENE_START + 0.25);

// Walk steps
var steps = document.querySelectorAll('.scene-' + SCENE_ID + ' .tm-step, .scene-' + SCENE_ID + ' .ol-step');
var cursor = SCENE_START + 0.7;

steps.forEach(function(step) {
  var kind = step.getAttribute('data-kind');
  var dur = parseFloat(step.getAttribute('data-duration')) || 0.5;

  if (kind === 'inbox_arrival') {
    // New message slides in from top of message list
    master.fromTo(step,
      { opacity: 0, y: -20, height: 0 },
      { opacity: 1, y: 0, height: 'auto', duration: 0.35, ease: 'power2.out' },
      cursor);
    // "New" indicator fades out after 1s
    var badge = step.querySelector('.ol-new-badge');
    if (badge) {
      master.to(badge, { opacity: 0, duration: 0.3 }, cursor + 1.0);
    }
    cursor += dur;

  } else if (kind === 'email_open') {
    // Highlight message row
    master.to(step, { opacity: 1, duration: 0.1 }, cursor);
    master.to(step, { backgroundColor: '#edebe9', duration: 0.2 }, cursor);
    // Fade in reading pane content
    var readingContent = step.querySelector('.ol-reading-body');
    var readingPane = document.querySelector('.scene-' + SCENE_ID + ' .ol-reading-content');
    if (readingPane) {
      master.to(readingPane, { opacity: 0, duration: 0.15 }, cursor);
    }
    if (readingContent) {
      var replacement = readingContent.cloneNode(true);
      replacement.style.display = 'block';
      replacement.style.position = 'relative';
      replacement.style.inset = 'auto';
      replacement.style.zIndex = 'auto';
      if (readingPane) {
        readingPane.innerHTML = '';
        readingPane.appendChild(replacement);
      }
      master.fromTo(replacement,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' },
        cursor + 0.2);
    }
    cursor += dur;

  } else if (kind === 'compose') {
    var composeOverlay = document.querySelector('.scene-' + SCENE_ID + ' .ol-compose-overlay');
    if (composeOverlay) {
      master.to(composeOverlay,
        { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.4, ease: 'power3.out' },
        cursor);
    }
    cursor += dur;

  } else if (kind === 'attach') {
    // Attachment chip slides in inside compose
    master.fromTo(step,
      { opacity: 0, x: -10, scale: 0.9 },
      { opacity: 1, x: 0, scale: 1, duration: 0.3, ease: 'power2.out' },
      cursor);
    cursor += dur;

  } else if (kind === 'send') {
    // Compose slides away
    var composeEl = document.querySelector('.scene-' + SCENE_ID + ' .ol-compose-overlay');
    if (composeEl) {
      master.to(composeEl,
        { y: '100%', opacity: 0, pointerEvents: 'none', duration: 0.35, ease: 'power2.in' },
        cursor);
    }
    // Sent toast
    var toast = document.querySelector('.scene-' + SCENE_ID + ' .ol-sent-toast')
      || document.querySelector('.scene-' + SCENE_ID + ' .ol-toast');
    if (toast) {
      master.fromTo(toast,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
        cursor + 0.4);
      master.to(toast,
        { opacity: 0, duration: 0.3 },
        cursor + 1.6);
    }
    cursor += dur;

  } else if (kind === 'calendar_invite') {
    master.fromTo(step,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
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

// Exit fade
master.to('.scene-' + SCENE_ID + ' .outlook-bg',
  { opacity: 0, duration: 0.5, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
