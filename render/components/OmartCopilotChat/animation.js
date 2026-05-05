// Intent: chat — synthetic Copilot Chat to-and-fro for Omart publish.
(function () {
  var S = '.scene-' + SCENE_ID;
  var root = document.querySelector(S + ' .occ-root');
  if (!root) return;
  var thread = root.querySelector('.occ-thread');
  var phases = root.querySelectorAll('.occ-phase-pill');
  var REPORT_TITLE = (root.querySelector('.occ-side-row.focus') || {}).textContent || 'Daily Control Health Brief';
  // Pull text props out of the rendered DOM (reportTitle/audience/version come in as substituted values
  // — we reference them in turn HTML directly below).

  function avatar(kind) {
    var a = document.createElement('div');
    a.className = 'occ-avatar ' + kind;
    a.textContent = kind === 'user' ? 'I' : '✦';
    return a;
  }
  function bubble(html) {
    var b = document.createElement('div');
    b.className = 'occ-bubble';
    b.innerHTML = html;
    return b;
  }
  function makeMsg(kind, html) {
    var m = document.createElement('div');
    m.className = 'occ-msg ' + kind;
    m.appendChild(avatar(kind));
    m.appendChild(bubble(html));
    return m;
  }

  // Scripted realistic chat turns based on the actual omart-publish.skill.md flow.
  // Timings designed to fit ~17s scene with breathing room.
  var REPORT = '{{reportTitle}}';
  var AUDIENCE = '{{audience}}';
  var VERSION = '{{version}}';
  var turns = [
    { kind:'user', t:0.55, html:'omart publish my PR dashboard' },
    { kind:'copilot', t:1.40, phase:1, html:
      'On it. Walking the publish flow with you.' +
      '<span class="phase"><b>[1/5] Detect — scanning HTML…</b><br>' +
      'Found <b>6 KPI cards</b>, 2 summaries, 1 chart.</span>' },
    { kind:'copilot', t:3.40, phase:2, html:
      '<span class="phase"><b>[2/5] Annotate — proposing markers</b><br>' +
      '+ <code>data-omart="kpi"</code> on 6 cards<br>' +
      '+ <code>data-omart="summary"</code> on 2 sections</span>' +
      '<span class="ask">Approve markers? <code>[Y/n]</code></span>' },
    { kind:'user', t:5.20, html:'y' },
    { kind:'copilot', t:5.95, phase:3, html:
      '<span class="phase"><b>[3/5] Manifest — generating omart.json</b><br>' +
      'title: <code>"' + REPORT + '"</code><br>' +
      'audience: <code>["' + AUDIENCE + '"]</code><br>' +
      'category: <code>engineering</code></span>' +
      '<span class="ask">Confirm audience and listed flag? <code>[Y/edit]</code></span>' },
    { kind:'user', t:7.85, html:'looks good — y' },
    { kind:'copilot', t:8.65, phase:4, html:
      '<span class="phase"><b>[4/5] Validate — running checks</b><br>' +
      '<span class="ok">✓</span> metadata complete<br>' +
      '<span class="ok">✓</span> lineage complete<br>' +
      '<span class="ok">✓</span> marker IDs unique<br>' +
      '<span class="ok">✓</span> 0 errors, 0 warnings</span>' +
      '<span class="ask">Ready to publish to <code>' + AUDIENCE + '</code>. Continue? <code>[Y/n]</code></span>' },
    { kind:'user', t:11.20, html:'y' },
    { kind:'copilot', t:11.95, phase:5, html:
      '<span class="phase"><b>[5/5] Publish — uploading…</b></span>' +
      '<div class="ok-pub">✓ Published <b>' + REPORT + '</b> as <b>' + VERSION + '</b><span class="pub-link">/marketplace/' + REPORT.toLowerCase().replace(/\s+/g,'-') + '</span></div>' }
  ];

  master.set(thread, { autoAlpha: 1 }, SCENE_START);

  turns.forEach(function (turn) {
    var msg = makeMsg(turn.kind, turn.html);
    thread.appendChild(msg);
    master.set(msg, { autoAlpha: 0, y: 14, scale: .98 }, SCENE_START);
    master.to(msg, { autoAlpha: 1, y: 0, scale: 1, duration: .42, ease: 'power2.out' }, SCENE_START + turn.t);
    if (turn.phase) {
      var p = phases[turn.phase - 1];
      master.call(function () { if (p && p.setAttribute) p.setAttribute('data-active', '1'); }, null, SCENE_START + turn.t);
    }
  });

  // Subtle window entrance + breathing
  master.fromTo(S + ' .occ-window', { y: 8, scale: .992, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .55, ease: 'power2.out' }, SCENE_START);
  master.to(S + ' .occ-window', { y: -3, duration: SCENE_DURATION * .55, ease: 'sine.inOut' }, SCENE_START + SCENE_DURATION * .35);

  // Phase pills fade in
  master.fromTo(phases, { autoAlpha: 0, y: 10 }, { autoAlpha: .85, y: 0, duration: .3, ease: 'power2.out', stagger: .04 }, SCENE_START + .25);

  // Typing indicator subtle bounce
  master.to(S + ' .occ-typing span', { y: -3, duration: .35, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: .12 }, SCENE_START);
})();
