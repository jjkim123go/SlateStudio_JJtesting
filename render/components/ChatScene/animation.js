// ChatScene — builds an LLM chat thread from SCENE_PROPS.turns and animates it.
// User bubbles fade up whole; assistant bubbles show a typing indicator, then
// either stream word-by-word (turn.text) or fade in a structured block
// (turn.html, e.g. few-shot example lines). Auto-distributed across the scene.
// All tweens registered on the shared `master` timeline (Standing Rule #16).
(function () {
  if (typeof master === 'undefined') return;
  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' .cs-root');
  if (!root) return;
  var thread = root.querySelector('.cs-thread');
  var turns = (typeof SCENE_PROPS !== 'undefined' && SCENE_PROPS && SCENE_PROPS.turns) || [];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function av(role) {
    var a = document.createElement('div');
    a.className = 'cs-av ' + role;
    a.textContent = role === 'user' ? 'You' : '✦';
    if (role === 'user') a.style.fontSize = '15px';
    return a;
  }

  // --- Header reveal ---
  master.fromTo(S + ' .cs-kicker', { autoAlpha: 0, y: -16 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, SCENE_START + 0.15);
  master.fromTo(S + ' .cs-title', { autoAlpha: 0, y: -22 },
    { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, SCENE_START + 0.35);

  // --- Window entrance + gentle breathing (anti-freeze) ---
  master.fromTo(S + ' .cs-window', { autoAlpha: 0, y: 26, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, SCENE_START + 0.25);
  master.to(S + ' .cs-window', { y: -6, duration: Math.max(5, SCENE_DURATION * 0.5),
    ease: 'sine.inOut', repeat: -1, yoyo: true }, SCENE_START + 1.0);

  // --- Continuous orb drift (whole-frame motion) ---
  master.fromTo(S + ' .cs-orb-a', { xPercent: -7, yPercent: -5 },
    { xPercent: 9, yPercent: 7, duration: Math.max(6, SCENE_DURATION * 0.55),
      ease: 'sine.inOut', repeat: -1, yoyo: true }, SCENE_START);
  master.fromTo(S + ' .cs-orb-b', { xPercent: 6, yPercent: 5 },
    { xPercent: -9, yPercent: -7, duration: Math.max(7, SCENE_DURATION * 0.62),
      ease: 'sine.inOut', repeat: -1, yoyo: true }, SCENE_START + 0.4);

  // --- Timing distribution across the scene ---
  var startT = SCENE_START + Math.min(1.1, SCENE_DURATION * 0.12);
  var endT = SCENE_START + SCENE_DURATION - 0.7;
  var span = Math.max(1, endT - startT);
  var slot = span / Math.max(turns.length, 1);

  turns.forEach(function (turn, i) {
    var role = turn.role === 'user' ? 'user' : 'assistant';
    var base = (typeof turn.t === 'number') ? (SCENE_START + turn.t) : (startT + i * slot);

    var msg = document.createElement('div');
    msg.className = 'cs-msg ' + role;
    msg.appendChild(av(role));

    var bubble = document.createElement('div');
    bubble.className = 'cs-bubble';
    msg.appendChild(bubble);
    thread.appendChild(msg);

    // label (optional, e.g. "Few-shot prompt")
    if (turn.label) {
      var lab = document.createElement('span');
      lab.className = 'cs-label';
      lab.textContent = turn.label;
      bubble.appendChild(lab);
    }

    // message slides in
    master.set(msg, { autoAlpha: 0, y: 16, scale: 0.985 }, SCENE_START);
    master.to(msg, { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power2.out' }, base);

    if (role === 'user') {
      // User content appears whole.
      var uc = document.createElement('span');
      if (turn.html) uc.innerHTML = turn.html; else uc.textContent = turn.text || '';
      bubble.appendChild(uc);
      return;
    }

    // Assistant: typing dots → content.
    var dots = document.createElement('span');
    dots.className = 'cs-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    bubble.appendChild(dots);

    var content = document.createElement('span');
    content.style.display = 'inline';
    bubble.appendChild(content);

    var thinkT = Math.min(0.9, slot * 0.32);

    // dots bounce while "thinking"
    master.to(dots.children, { y: -6, duration: 0.34, ease: 'sine.inOut',
      repeat: -1, yoyo: true, stagger: 0.12 }, base + 0.2);
    // dots out
    master.to(dots, { autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, base + thinkT);
    master.set(dots, { display: 'none' }, base + thinkT + 0.25);

    var revealT = base + thinkT + 0.28;

    if (turn.html) {
      content.innerHTML = turn.html;
      master.fromTo(content, { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, revealT);
    } else {
      // Stream words in one by one.
      var words = String(turn.text || '').split(/\s+/).filter(Boolean);
      var html = words.map(function (w) { return '<span class="cs-w">' + esc(w) + '</span>'; }).join(' ');
      content.innerHTML = html + '<span class="cs-caret"></span>';
      var spans = content.querySelectorAll('.cs-w');
      var caret = content.querySelector('.cs-caret');
      master.set(content, { autoAlpha: 1 }, revealT);
      var streamWindow = Math.max(0.6, slot * 0.5);
      var each = spans.length ? Math.min(0.09, streamWindow / spans.length) : 0.05;
      master.fromTo(spans, { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.18, ease: 'none', stagger: each }, revealT);
      // blinking caret keeps motion alive
      master.to(caret, { autoAlpha: 0, duration: 0.45, ease: 'steps(1)',
        repeat: -1, yoyo: true }, revealT + 0.1);
    }
  });

  // --- Scene fade-out polish ---
  master.to(S + ' .cs-root', { autoAlpha: 0, duration: 0.5, ease: 'power2.in' },
    SCENE_START + SCENE_DURATION - 0.5);
})();
