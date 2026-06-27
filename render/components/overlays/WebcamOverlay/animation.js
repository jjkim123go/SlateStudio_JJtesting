// WebcamOverlay — picture-in-picture bubble. Detects video vs image src,
// sizes accordingly, scales in with bounce, breathes idly, fades out.
// Props consumed: src, borderColor (Mustache substitutions).

(function () {
  var src = '{{src}}';
  var frame = document.querySelector('.scene-' + SCENE_ID + ' .wcam-frame');
  if (!frame) return;

  var isVideo = /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(src);
  frame.dataset.media = isVideo ? 'video' : 'image';

  if (isVideo) {
    var vid = document.createElement('video');
    vid.className = 'wcam-vid';
    vid.muted = true; vid.loop = true; vid.playsInline = true; vid.setAttribute('playsinline', '');
    if (src) vid.src = src;
    var ring = frame.querySelector('.wcam-ring');
    frame.insertBefore(vid, ring);
    if (src) {
      var p = vid.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* headless ok */ });
    }
  } else {
    var img = frame.querySelector('.wcam-img');
    if (img && src) {
      img.src = src;
    } else if (img && (!src || src.trim() === '' || src.indexOf('{{') === 0)) {
      // Empty src: hide raw <img> and inject a procedural avatar placeholder
      img.style.display = 'none';
      var ph = document.createElement('div');
      ph.className = 'wcam-placeholder';
      ph.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#475569 0%,#1e293b 60%,#0f172a 100%);color:#cbd5e1;font-family:Segoe UI,system-ui,sans-serif;font-size:88px;font-weight:300';
      var initials = ('{{presenterName}}' || '?').split(/\s+/).map(function(s){return s.charAt(0);}).join('').slice(0,2).toUpperCase() || '👤';
      ph.textContent = initials;
      var ring = frame.querySelector('.wcam-ring');
      frame.insertBefore(ph, ring);
    }
  }

  // Fallback border color if prop was empty (Mustache yields '')
  var borderProp = '{{borderColor}}';
  if (!borderProp || borderProp.trim() === '') {
    frame.style.setProperty('--wcam-border', 'var(--brand-primary, #0078D4)');
  }
})();

var __wcamScope = '.scene-' + SCENE_ID + ' ';

// 1. Bubble scales in from corner with a slight bounce
master.fromTo(__wcamScope + '.wcam-frame',
  { opacity: 0, scale: 0.4 },
  { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' },
  SCENE_START + 0.2);

// 2. Presenter chip fades up just after the bubble
master.fromTo(__wcamScope + '.wcam-chip',
  { opacity: 0, y: 10 },
  { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
  SCENE_START + 0.6);

// 3. Gentle "breathing" idle — runs throughout the hold portion of the scene
master.to(__wcamScope + '.wcam-frame',
  { scale: 1.02, duration: 1.6, ease: 'sine.inOut', repeat: -1, yoyo: true },
  SCENE_START + 0.85);

// 4. Coordinated fade-out near scene end
master.to(__wcamScope + '.wcam-frame, ' + __wcamScope + '.wcam-chip',
  { opacity: 0, duration: 0.45, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.45);
