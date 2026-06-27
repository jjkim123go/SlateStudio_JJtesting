// ScreenDemoFrame — entrance scale, video autoplay, optional cursor-trail
// Props consumed: src, frameStyle, scale, cursorPath
// Compiler injects: master, SCENE_ID, SCENE_START, SCENE_DURATION

var sdfRoot = document.querySelector('.scene-' + SCENE_ID + ' .sdf-root');
var sdfFrame = document.querySelector('.scene-' + SCENE_ID + ' .sdf-frame');
var sdfImg = document.querySelector('.scene-' + SCENE_ID + ' .sdf-img');
var sdfCursor = document.querySelector('.scene-' + SCENE_ID + ' .sdf-cursor');

var restScale = parseFloat('{{scale}}') || 0.9;
var startScale = restScale * 0.9;

// Detect video src and inject <video> only when needed (hyperframes-producer
// auto-detects video elements and forces sequential capture, so we keep the
// element out of the DOM when we don't actually need it).
var sdfSrc = '{{src}}';
var sdfIsVideo = /\.(mp4|webm|mov|avi|mkv)(\?|#|$)/i.test(sdfSrc);
var sdfImg = document.querySelector('.scene-' + SCENE_ID + ' .sdf-img');
var sdfVid = null;
var sdfContent = document.querySelector('.scene-' + SCENE_ID + ' .sdf-content');
if (sdfIsVideo) {
  if (sdfContent) {
    sdfVid = document.createElement('video');
    sdfVid.className = 'sdf-vid';
    sdfVid.src = sdfSrc;
    sdfVid.muted = true; sdfVid.loop = true; sdfVid.playsInline = true;
    sdfVid.setAttribute('playsinline', '');
    sdfVid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0';
    sdfContent.appendChild(sdfVid);
    if (sdfImg) sdfImg.style.display = 'none';
  }
} else if (!sdfSrc || sdfSrc.trim() === '' || sdfSrc.indexOf('{{') === 0) {
  // Empty src: render a visible procedural placeholder so the frame doesn't
  // appear as a black void during demos / previews.
  if (sdfImg) sdfImg.style.display = 'none';
  if (sdfContent) {
    var ph = document.createElement('div');
    ph.className = 'sdf-placeholder';
    ph.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:linear-gradient(135deg,#1f2937 0%,#0f172a 60%,#0b1220 100%);color:#94a3b8;font-family:Segoe UI,system-ui,sans-serif;text-align:center;padding:32px';
    ph.innerHTML = '<div style="width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,#0078D4 0%,#14b8a6 100%);display:flex;align-items:center;justify-content:center;font-size:34px;color:#fff;box-shadow:0 8px 24px rgba(0,120,212,0.35)">▦</div>'
      + '<div style="font-size:18px;font-weight:600;color:#e2e8f0;letter-spacing:0.02em">Demo screen placeholder</div>'
      + '<div style="font-size:13px;opacity:0.7;max-width:320px;line-height:1.5">Pass <code style="background:rgba(148,163,184,0.18);padding:2px 6px;border-radius:4px">src</code> a screenshot or recording to populate this frame.</div>';
    sdfContent.appendChild(ph);
  }
}

// Frame scales in from 0.9× → 1.0× of rest scale with settle bounce
master.fromTo(sdfFrame,
  { scale: startScale, opacity: 0 },
  { scale: restScale, opacity: 1, duration: 0.7, ease: 'back.out(1.4)' },
  SCENE_START + 0.1);

// Autoplay video after frame is visible
if (sdfVid && sdfIsVideo) {
  master.call(function() {
    sdfVid.currentTime = 0;
    sdfVid.play().catch(function() {});
  }, [], SCENE_START + 0.3);
}

// Optional cursor-trail animation from data-cursor-path JSON string
// Expected format: "[[x%, y%, timeSec], ...]" — percentages relative to frame
var cursorData = sdfRoot ? sdfRoot.getAttribute('data-cursor-path') : '';
if (cursorData && cursorData.length > 2 && cursorData.charAt(0) === '[') {
  try {
    var points = JSON.parse(cursorData);
    if (Array.isArray(points) && points.length > 0) {
      var frameRect = sdfFrame ? sdfFrame.getBoundingClientRect() : { left: 120, top: 60, width: 1680, height: 960 };
      var fw = (frameRect && frameRect.width) || (sdfFrame && sdfFrame.offsetWidth) || 1680;
      var fh = (frameRect && frameRect.height) || (sdfFrame && sdfFrame.offsetHeight) || 960;

      // Show cursor after frame settles
      master.set(sdfCursor, { opacity: 0 }, SCENE_START);
      master.to(sdfCursor,
        { opacity: 1, duration: 0.2 },
        SCENE_START + 0.9);

      for (var ci = 0; ci < points.length; ci++) {
        var pt = points[ci];
        var cx = frameRect.left + (pt[0] / 100) * fw;
        var cy = frameRect.top + (pt[1] / 100) * fh;
        var ct = pt[2] != null ? pt[2] : ci * 0.5;
        var cDur = ci === 0 ? 0.01 : 0.4;
        master.to(sdfCursor,
          { x: cx, y: cy, duration: cDur, ease: 'power2.inOut' },
          SCENE_START + 0.9 + ct);
      }

      // Hide cursor before scene end
      master.to(sdfCursor,
        { opacity: 0, duration: 0.2 },
        SCENE_START + SCENE_DURATION - 0.5);
    }
  } catch (e) { /* invalid cursor data — skip silently */ }
}

// Fade out at scene end
master.to(sdfFrame,
  { opacity: 0, scale: restScale * 0.98, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.4);
