// SplitScreen — wipe-in both sides, labels fade, captions slide up
// Props consumed: leftSrc, rightSrc, orientation, enterStyle
// Compiler injects: master, SCENE_ID, SCENE_START, SCENE_DURATION

var ssRoot = document.querySelector('.scene-' + SCENE_ID + ' .ss-root');
var ssLeft = document.querySelector('.scene-' + SCENE_ID + ' .ss-left');
var ssRight = document.querySelector('.scene-' + SCENE_ID + ' .ss-right');
var ssDivider = document.querySelector('.scene-' + SCENE_ID + ' .ss-divider');
var ssLeftLabel = document.querySelector('.scene-' + SCENE_ID + ' .ss-left-label');
var ssRightLabel = document.querySelector('.scene-' + SCENE_ID + ' .ss-right-label');
var ssLeftCaption = document.querySelector('.scene-' + SCENE_ID + ' .ss-left-caption');
var ssRightCaption = document.querySelector('.scene-' + SCENE_ID + ' .ss-right-caption');

var ssOrientation = ssRoot ? (ssRoot.getAttribute('data-orientation') || 'horizontal') : 'horizontal';
var ssEnter = ssRoot ? (ssRoot.getAttribute('data-enter') || 'simultaneous') : 'simultaneous';
var ssIsHoriz = ssOrientation !== 'vertical';
var ssSeqDelay = ssEnter === 'sequential' ? 0.3 : 0;

// Clip-path wipe directions per orientation
var ssLeftClipFrom, ssLeftClipTo, ssRightClipFrom, ssRightClipTo;
if (ssIsHoriz) {
  ssLeftClipFrom  = 'inset(0 100% 0 0)';
  ssLeftClipTo    = 'inset(0 0% 0 0)';
  ssRightClipFrom = 'inset(0 0 0 100%)';
  ssRightClipTo   = 'inset(0 0 0 0%)';
} else {
  ssLeftClipFrom  = 'inset(0 0 100% 0)';
  ssLeftClipTo    = 'inset(0 0 0% 0)';
  ssRightClipFrom = 'inset(100% 0 0 0)';
  ssRightClipTo   = 'inset(0% 0 0 0)';
}

var ssBase = 0.15;
var ssWipeDur = Math.min(0.6, SCENE_DURATION * 0.15);

// Detect and inject <video> elements only when src is a real video file.
// (hyperframes-producer auto-detects <video> tags and forces sequential
// capture — keeping them out of the DOM avoids 45s loadedmetadata waits.)
function ssActivateVid(container, srcVal, label) {
  if (!container) return;
  if (/\.(mp4|webm|mov|avi|mkv)(\?|#|$)/i.test(srcVal)) {
    var img = container.querySelector('.ss-img');
    if (img) img.style.display = 'none';
    var vid = document.createElement('video');
    vid.className = 'ss-vid ss-media';
    vid.src = srcVal;
    vid.muted = true; vid.loop = true; vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    container.insertBefore(vid, container.firstChild);
  } else if (!srcVal || srcVal.trim() === '' || srcVal.indexOf('{{') === 0) {
    var img2 = container.querySelector('.ss-img');
    if (img2) img2.style.display = 'none';
    var ph = document.createElement('div');
    ph.className = 'ss-placeholder';
    var grad = label === 'left'
      ? 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)'
      : 'linear-gradient(135deg,#0c4a6e 0%,#082f49 100%)';
    var icon = label === 'left' ? '◐' : '◑';
    ph.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:' + grad + ';color:#94a3b8;font-family:Segoe UI,system-ui,sans-serif;text-align:center;padding:24px';
    ph.innerHTML = '<div style="font-size:64px;line-height:1;color:rgba(148,163,184,0.45)">' + icon + '</div>'
      + '<div style="font-size:14px;opacity:0.75;max-width:240px;line-height:1.5">' + (label === 'left' ? 'Left' : 'Right') + ' pane placeholder — pass <code style="background:rgba(148,163,184,0.18);padding:1px 5px;border-radius:3px">' + (label === 'left' ? 'leftSrc' : 'rightSrc') + '</code> an image or video.</div>';
    container.insertBefore(ph, container.firstChild);
  }
}
ssActivateVid(ssLeft, '{{leftSrc}}', 'left');
ssActivateVid(ssRight, '{{rightSrc}}', 'right');

// Set initial clip states
master.set(ssLeft,  { clipPath: ssLeftClipFrom },  SCENE_START);
master.set(ssRight, { clipPath: ssRightClipFrom }, SCENE_START);

// Left/top wipe in
master.to(ssLeft,
  { clipPath: ssLeftClipTo, duration: ssWipeDur, ease: 'power2.inOut' },
  SCENE_START + ssBase);

// Right/bottom wipe in (with optional sequential delay)
master.to(ssRight,
  { clipPath: ssRightClipTo, duration: ssWipeDur, ease: 'power2.inOut' },
  SCENE_START + ssBase + ssSeqDelay);

// Divider fade in at midpoint of wipe
if (ssDivider) {
  master.to(ssDivider,
    { opacity: 1, duration: 0.3, ease: 'power2.out' },
    SCENE_START + ssBase + ssWipeDur * 0.5);
}

// Labels fade in 0.4s after wipe completes
var ssLabelTime = ssBase + ssWipeDur + 0.4;
if (ssLeftLabel && ssLeftLabel.textContent.trim()) {
  master.fromTo(ssLeftLabel,
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
    SCENE_START + ssLabelTime);
}
if (ssRightLabel && ssRightLabel.textContent.trim()) {
  master.fromTo(ssRightLabel,
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
    SCENE_START + ssLabelTime + ssSeqDelay);
}

// Captions slide up 0.6s after wipe completes
var ssCaptionTime = ssBase + ssWipeDur + 0.6;
if (ssLeftCaption && ssLeftCaption.textContent.trim()) {
  master.fromTo(ssLeftCaption,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + ssCaptionTime);
}
if (ssRightCaption && ssRightCaption.textContent.trim()) {
  master.fromTo(ssRightCaption,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
    SCENE_START + ssCaptionTime + ssSeqDelay);
}

// Autoplay any video elements
var ssVideos = ssRoot ? ssRoot.querySelectorAll('video') : [];
for (var svi = 0; svi < ssVideos.length; svi++) {
  (function(v) {
    master.call(function() { v.currentTime = 0; v.play().catch(function() {}); }, [], SCENE_START + ssBase);
  })(ssVideos[svi]);
}

// Fade out at scene end
master.to(ssRoot,
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
