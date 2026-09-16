(() => {
  const root = document.querySelector('#root');
  const chapters = [
    {
      copy: 'Microsoft creates an enormous amount of knowledge through technical documentation, product guidance, and learning content. Turning that knowledge into effective video experiences typically requires specialized skills, production tools, and significant time.',
      visual: `
        <div class="hf-document hf-card">
          <div class="hf-doc-bar"><span class="hf-doc-icon"></span><strong>Microsoft knowledge</strong></div>
          <div class="hf-doc-lines"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <span class="hf-route hf-route-a"></span>
        <div class="hf-card hf-knowledge"><span class="hf-icon">K</span><strong>Knowledge field</strong></div>
        <div class="hf-source-list"><span>Technical documentation</span><span>Product guidance</span><span>Learning content</span></div>`
    },
    {
      copy: 'Knowledge-to-Video Factory explores how agentic AI can help bridge that gap.',
      visual: `
        <div class="hf-card hf-bank"><span class="hf-icon">K</span><strong>Existing knowledge</strong></div>
        <span class="hf-gap-line"></span>
        <div class="hf-barriers"><span>Skills</span><span>Tools</span><span>Time</span></div>
        <div class="hf-card hf-agent"><span class="hf-icon">AI</span><strong>Agentic AI</strong></div>
        <span class="hf-route hf-route-b"></span>
        <div class="hf-card hf-video"><span class="hf-play"></span><strong>Video experience</strong></div>
        <div class="hf-pill hf-bridge-label">Bridges the production gap</div>`
    },
    {
      copy: 'Rather than replacing content creators, this project helps make high-quality video creation more accessible and scalable. By transforming documentation into scripts, storyboards, and video-ready assets, the workflow enables program managers, content owners, and subject matter experts to begin creating learning content, while helping video producers accelerate production, improve consistency, and scale output.',
      visual: `
        <div class="hf-role hf-card r1">Program managers</div>
        <div class="hf-role hf-card r2">Content owners</div>
        <div class="hf-role hf-card r3">Subject matter experts</div>
        <div class="hf-role hf-card r4">Video producers</div>
        <svg class="hf-svg" viewBox="0 0 1275 800" aria-hidden="true">
          <path class="hf-draw" d="M260 194 C390 194 390 330 505 330"/><path class="hf-draw" d="M260 606 C390 606 390 470 505 470"/>
          <path class="hf-draw" d="M1015 194 C885 194 885 330 770 330"/><path class="hf-draw" d="M1015 606 C885 606 885 470 770 470"/>
        </svg>
        <div class="hf-factory hf-card"><span class="hf-icon">AI</span><strong>Knowledge-to-Video Factory</strong><small>Scripts · Storyboards · Video-ready assets</small></div>
        <div class="hf-pill hf-human">Augments human creators</div>`
    },
    {
      copy: 'During Hackathon, our team experimented with AI agents, prompting strategies, script generation workflows, and video creation pipelines to explore how technical knowledge can be transformed into engaging video experiences.',
      visual: `
        <div class="hf-experiment e1 hf-card"><b>01</b><strong>AI agents</strong><small>Specialized roles</small></div>
        <div class="hf-experiment e2 hf-card"><b>02</b><strong>Prompting strategies</strong><small>Instruction patterns</small></div>
        <div class="hf-experiment e3 hf-card"><b>03</b><strong>Script workflows</strong><small>Learning structure</small></div>
        <div class="hf-experiment e4 hf-card"><b>04</b><strong>Video pipelines</strong><small>Production systems</small></div>
        <svg class="hf-svg" viewBox="0 0 1275 800" aria-hidden="true"><path class="hf-draw" d="M190 400 H1085"/></svg>
        <div class="hf-pill hf-tested">Evaluated during Hackathon</div>`
    },
    {
      copy: 'In this demo, you’ll see a workflow that starts with existing documentation. The system analyzes the content, identifies key concepts, generates a structured learning script, recommends visuals, and creates assets that accelerate the path from documentation to video.',
      visual: `
        <div class="hf-workflow">
          <div class="hf-step hf-card"><span>INPUT</span><strong>Technical article</strong></div><i></i>
          <div class="hf-step hf-card"><span>ANALYZE</span><strong>Key concepts</strong></div><i></i>
          <div class="hf-step hf-card"><span>STRUCTURE</span><strong>Learning script</strong></div><i></i>
          <div class="hf-step hf-card"><span>DIRECT</span><strong>Visual guidance</strong></div><i></i>
          <div class="hf-step hf-card"><span>PRODUCE</span><strong>Video assets</strong></div>
        </div>
        <div class="hf-signal"></div>
        <div class="hf-pill hf-receipt">Documentation → video-ready experience</div>`
    },
    {
      copy: 'The goal is simple: reduce time spent on repetitive production tasks so teams can focus on what matters most: storytelling, creativity, accuracy, and learner impact.',
      visual: `
        <div class="hf-card hf-repetitive"><strong>Repetitive production</strong><div><i></i><i></i><i></i><i></i><i></i></div></div>
        <span class="hf-balance-route"></span>
        <div class="hf-value-grid">
          <div class="hf-card">Storytelling</div><div class="hf-card">Creativity</div><div class="hf-card">Accuracy</div><div class="hf-card">Learner impact</div>
        </div>
        <div class="hf-pill hf-focus">More meaningful creative work</div>`
    },
    {
      copy: 'Knowledge already exists throughout Microsoft. Knowledge-to-Video Factory explores how agentic AI can help transform that knowledge into engaging learning experiences, faster, more consistently, and at greater scale.',
      visual: `
        <div class="hf-scale-node n1 hf-card">Documentation</div><div class="hf-scale-node n2 hf-card">Product guidance</div>
        <div class="hf-scale-node n3 hf-card">Learning content</div><div class="hf-scale-node n4 hf-card">Support knowledge</div>
        <svg class="hf-svg" viewBox="0 0 1275 800" aria-hidden="true">
          <path class="hf-draw" d="M250 178 C420 178 410 320 500 320"/><path class="hf-draw" d="M250 622 C420 622 410 480 500 480"/>
          <path class="hf-draw" d="M1025 178 C855 178 865 320 775 320"/><path class="hf-draw" d="M1025 622 C855 622 865 480 775 480"/>
        </svg>
        <div class="hf-factory hf-final-factory hf-card"><span class="hf-icon">AI</span><strong>Knowledge-to-Video Factory</strong><small>Faster · Consistent · Scalable</small></div>
        <div class="hf-pill hf-scale-label">Learning at scale</div>`
    }
  ];

  document.head.insertAdjacentHTML('beforeend', `<style>
    :root{--hf-ink:#17191f;--hf-muted:#5f6570;--hf-line:#d8dbe2;--hf-blue:#2563c9;--hf-purple:#7956d8;--hf-green:#23865a;--hf-amber:#bd7a16;--hf-red:#c94d57;--hf-paper:#fff}
    #root{position:relative;width:1920px;height:1080px;overflow:hidden;color:var(--hf-ink);background:radial-gradient(circle at 76% 12%,rgba(98,205,231,.22),transparent 31%),radial-gradient(circle at 93% 65%,rgba(241,217,119,.15),transparent 34%),linear-gradient(120deg,#fff 0%,#fbfcf9 54%,#f8fbf7 100%);font-family:"Segoe UI",sans-serif;letter-spacing:0}
    .hf-grain{position:absolute;inset:0;opacity:.22;background-image:radial-gradient(rgba(32,36,44,.13) .55px,transparent .55px);background-size:5px 5px;pointer-events:none}
    .hf-shell{position:absolute;inset:0}.hf-brand{position:absolute;left:62px;top:48px;display:flex;align-items:center;gap:12px;font-size:22px;font-weight:600}.hf-brand-mark{width:26px;height:26px;border-radius:7px;background:conic-gradient(from 30deg,#48c2ef,#4c6bdc,#8754d9,#ee6fa5,#f0b448,#48c2ef)}
    .hf-editorial{position:absolute;left:62px;top:190px;width:430px}.hf-editorial h1{max-width:410px;margin:0;font-size:43px;line-height:1.08;font-weight:700}.hf-copy-stack{position:relative;width:410px;height:430px;margin-top:42px}.hf-copy{position:absolute;inset:0;margin:0;color:#3f444d;font-size:22px;line-height:1.43;font-weight:400;opacity:0}
    .hf-stage{position:absolute;left:575px;top:132px;width:1275px;height:800px;overflow:hidden}.hf-beat{position:absolute;inset:0;opacity:0;transform-origin:0 0;will-change:transform,opacity}.hf-card{position:absolute;display:flex;align-items:center;justify-content:center;gap:18px;padding:24px;border:1px solid rgba(29,33,41,.08);border-radius:7px;background:rgba(255,255,255,.96);box-shadow:0 20px 48px rgba(35,42,56,.14),0 4px 12px rgba(35,42,56,.08);color:#22262e;font-size:23px;font-weight:600;text-align:center}
    .hf-icon{width:58px;height:58px;flex:0 0 auto;display:grid;place-items:center;border:2px solid currentColor;border-radius:7px;font-size:18px;font-weight:700}.hf-pill{position:absolute;padding:10px 18px;border-radius:999px;background:#fff;box-shadow:0 8px 24px rgba(45,51,63,.09);font-size:18px;font-weight:600}.hf-route{position:absolute;height:3px;border-radius:3px;background:var(--hf-blue);transform-origin:left center}.hf-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}.hf-draw{fill:none;stroke:var(--hf-blue);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .hf-document{left:48px;top:76px;width:720px;height:620px;padding:0;overflow:hidden;display:block}.hf-doc-bar{height:70px;display:flex;align-items:center;gap:14px;padding:0 24px;background:#e9f0ff;border-bottom:1px solid #c9d7f0}.hf-doc-icon{width:34px;height:42px;border:3px solid var(--hf-blue);border-radius:3px;position:relative}.hf-doc-icon:after{content:"";position:absolute;left:7px;right:7px;top:12px;height:3px;background:var(--hf-blue);box-shadow:0 8px 0 var(--hf-blue),0 16px 0 var(--hf-blue)}.hf-doc-lines{padding:58px 70px}.hf-doc-lines i{display:block;width:78%;height:10px;margin-bottom:24px;border-radius:3px;background:#d8dee7}.hf-doc-lines i:first-child{width:48%;height:16px;background:#8ea5c8}.hf-knowledge{right:62px;top:274px;width:310px;height:180px;flex-direction:column;color:var(--hf-blue)}.hf-route-a{left:768px;top:365px;width:137px}.hf-source-list{position:absolute;right:74px;top:500px;display:grid;gap:10px}.hf-source-list span{padding:9px 14px;border-left:3px solid var(--hf-green);background:rgba(255,255,255,.75);font-size:17px;color:var(--hf-muted)}
    .hf-bank{left:46px;top:295px;width:250px;height:170px;flex-direction:column;color:var(--hf-blue)}.hf-video{right:42px;top:295px;width:250px;height:170px;flex-direction:column;color:var(--hf-green)}.hf-play{width:0;height:0;border-top:18px solid transparent;border-bottom:18px solid transparent;border-left:29px solid currentColor}.hf-gap-line{position:absolute;left:296px;right:292px;top:380px;height:3px;background:#b3bac6}.hf-barriers{position:absolute;left:345px;right:345px;top:267px;display:flex;justify-content:space-around}.hf-barriers span{padding:12px 18px;border:2px solid var(--hf-red);border-radius:7px;background:#fff;color:var(--hf-red);font-size:19px;font-weight:700}.hf-agent{left:512px;top:305px;width:250px;height:150px;color:var(--hf-purple)}.hf-route-b{left:762px;top:380px;width:179px}.hf-bridge-label{left:50%;top:525px;color:var(--hf-blue);transform:translateX(-50%)}
    .hf-role{width:260px;height:112px;font-size:20px}.r1{left:26px;top:138px}.r2{left:26px;bottom:138px}.r3{right:26px;top:138px}.r4{right:26px;bottom:138px}.hf-factory{left:505px;top:276px;width:265px;height:248px;flex-direction:column;color:var(--hf-blue)}.hf-factory strong{font-size:25px}.hf-factory small,.hf-experiment small{font-size:15px;line-height:1.3;color:var(--hf-muted)}.hf-human{left:50%;bottom:54px;color:var(--hf-green);transform:translateX(-50%)}
    .hf-experiment{top:240px;width:250px;height:310px;flex-direction:column;align-items:flex-start;justify-content:space-between;text-align:left}.hf-experiment b{font-size:52px;color:var(--hf-blue)}.hf-experiment strong{font-size:24px}.e1{left:24px}.e2{left:349px}.e3{left:674px}.e4{left:999px}.hf-tested{left:50%;bottom:86px;color:var(--hf-blue);transform:translateX(-50%)}
    .hf-workflow{position:absolute;left:20px;right:20px;top:286px;display:grid;grid-template-columns:205px 40px 205px 40px 205px 40px 205px 40px 205px;align-items:center}.hf-step{position:relative;width:205px;height:180px;flex-direction:column}.hf-step span{font-size:14px;color:var(--hf-blue)}.hf-step strong{font-size:19px}.hf-workflow i{height:3px;background:var(--hf-blue);transform-origin:left center}.hf-signal{position:absolute;left:98px;top:370px;width:14px;height:14px;border-radius:50%;background:var(--hf-blue);box-shadow:0 0 0 8px rgba(37,99,201,.13)}.hf-receipt{left:50%;top:555px;color:var(--hf-green);transform:translateX(-50%);text-transform:uppercase}
    .hf-repetitive{left:58px;top:225px;width:420px;height:350px;flex-direction:column}.hf-repetitive div{width:300px}.hf-repetitive i{display:block;height:18px;margin-top:15px;background:#c9ced7;transform-origin:left center}.hf-balance-route{position:absolute;left:478px;top:399px;width:280px;height:3px;background:var(--hf-blue);transform-origin:left center}.hf-value-grid{position:absolute;right:38px;top:195px;width:480px;display:grid;grid-template-columns:1fr 1fr;gap:18px}.hf-value-grid .hf-card{position:relative;width:231px;height:150px;border-left:6px solid var(--hf-blue)}.hf-focus{left:50%;bottom:70px;color:var(--hf-blue);transform:translateX(-50%)}
    .hf-scale-node{width:230px;height:112px;font-size:19px}.hf-scale-node.n1{left:22px;top:122px}.hf-scale-node.n2{left:22px;bottom:122px}.hf-scale-node.n3{right:22px;top:122px}.hf-scale-node.n4{right:22px;bottom:122px}.hf-final-factory{left:500px;top:270px;width:275px;height:260px}.hf-scale-label{left:50%;bottom:52px;color:var(--hf-green);transform:translateX(-50%)}
    .hf-endcard{position:absolute;inset:0;display:grid;place-items:center;opacity:0;background:#f5f4e9}.hf-end-lockup{display:flex;flex-direction:column;align-items:center;gap:24px}.hf-end-mark{width:118px;height:118px;border-radius:28px;background:conic-gradient(from 30deg,#48c2ef,#4c6bdc,#8754d9,#ee6fa5,#f0b448,#48c2ef)}.hf-end-lockup strong{font-size:52px}.hf-end-lockup span{font-size:22px;color:var(--hf-muted)}
  </style>`);

  root.innerHTML = `
    <div class="hf-shell"><div class="hf-grain"></div><div class="hf-brand"><span class="hf-brand-mark"></span><span>Microsoft Hackathon</span></div>
      <aside class="hf-editorial"><h1>Knowledge-to-Video Factory</h1><div class="hf-copy-stack">${chapters.map((chapter, index) => `<p class="hf-copy" data-copy="${index}">${chapter.copy}</p>`).join('')}</div></aside>
      <main class="hf-stage">${chapters.map((chapter, index) => `<section class="hf-beat hf-b${index}" data-beat="${index}" data-layout-allow-overflow>${chapter.visual}</section>`).join('')}</main>
    </div>
    <div class="hf-endcard"><div class="hf-end-lockup"><span class="hf-end-mark"></span><strong>Knowledge-to-Video Factory</strong><span>Human creativity × Agentic AI</span></div></div>
    <audio id="narration" data-composition-id="narration" data-start="0" data-duration="107.4" data-media-start="0" data-track-index="10" src="assets/narration.wav"></audio>`;

  const segments = [
    { start: 0, length: 15 }, { start: 15, length: 8 }, { start: 23, length: 23 },
    { start: 46, length: 14 }, { start: 60, length: 20 }, { start: 80, length: 14 }, { start: 94, length: 13.4 }
  ];
  const beats = [...document.querySelectorAll('.hf-beat')];
  const copies = [...document.querySelectorAll('.hf-copy')];
  const shell = document.querySelector('.hf-shell');
  const endcard = document.querySelector('.hf-endcard');
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - Math.pow(1 - clamp(value), 3);
  const smooth = value => { const progress = clamp(value); return progress * progress * (3 - 2 * progress); };
  const windowed = (local, length) => Math.min(ease(local / .55), ease((length - local) / .55));
  const reveal = (element, local, start, span = .5, distance = 16) => {
    if (!element) return;
    const progress = ease((local - start) / span);
    element.style.opacity = progress;
    element.style.transform = `translateY(${(1 - progress) * distance}px)`;
  };
  const draw = (element, local, start, span = .55) => {
    if (!element) return;
    const progress = ease((local - start) / span);
    element.style.opacity = progress;
    element.style.transform = `scaleX(${progress})`;
    element.style.transformOrigin = 'left center';
  };
  const drawPath = (path, local, start, span = .7) => {
    const length = path.getTotalLength();
    const progress = ease((local - start) / span);
    path.style.opacity = progress;
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length * (1 - progress)}`;
  };
  const cameraMoves = [null, { scale: 1.46, start: 1.0, end: 3.4 }, { scale: 1.48, start: 4.0, end: 7.0 }, null, { scale: 1.42, start: 2.0, end: 5.0 }, null, { scale: 1.45, start: 2.5, end: 5.5 }];
  const animateCamera = (beat, local, index) => {
    const move = cameraMoves[index];
    if (!move) { beat.style.transform = 'none'; return; }
    const progress = smooth((local - move.start) / (move.end - move.start));
    const scale = move.scale + (1 - move.scale) * progress;
    const translateX = -637.5 * (scale - 1) * (1 - progress);
    const translateY = -400 * (scale - 1) * (1 - progress);
    beat.style.transform = `translate3d(${translateX}px,${translateY}px,0) scale(${scale})`;
  };
  const animateBeat = (beat, local, index) => {
    if (index === 0) {
      reveal(beat.querySelector('.hf-document'), local, .35, .6, 18);
      draw(beat.querySelector('.hf-route-a'), local, 3.2);
      reveal(beat.querySelector('.hf-knowledge'), local, 3.65);
      [...beat.querySelectorAll('.hf-source-list span')].forEach((element, item) => reveal(element, local, 6.0 + item * 1.45, .45, 10));
    } else if (index === 1) {
      reveal(beat.querySelector('.hf-bank'), local, .25);
      draw(beat.querySelector('.hf-gap-line'), local, .75);
      [...beat.querySelectorAll('.hf-barriers span')].forEach((element, item) => reveal(element, local, 1.25 + item * .45, .38, 12));
      reveal(beat.querySelector('.hf-agent'), local, 2.65);
      draw(beat.querySelector('.hf-route-b'), local, 3.15);
      reveal(beat.querySelector('.hf-video'), local, 3.55);
      reveal(beat.querySelector('.hf-bridge-label'), local, 5.0, .45, 10);
    } else if (index === 2) {
      reveal(beat.querySelector('.hf-factory'), local, .45, .6, 18);
      [...beat.querySelectorAll('.hf-role')].forEach((element, item) => reveal(element, local, 3.1 + item * 2.25, .48, 14));
      [...beat.querySelectorAll('.hf-draw')].forEach((path, item) => drawPath(path, local, 4.0 + item * 2.25));
      reveal(beat.querySelector('.hf-human'), local, 15.7, .5, 10);
    } else if (index === 3) {
      [...beat.querySelectorAll('.hf-experiment')].forEach((element, item) => reveal(element, local, .5 + item * 2.1, .55, 18));
      [...beat.querySelectorAll('.hf-draw')].forEach(path => drawPath(path, local, 8.9, .8));
      reveal(beat.querySelector('.hf-tested'), local, 10.1, .5, 10);
    } else if (index === 4) {
      [...beat.querySelectorAll('.hf-step')].forEach((element, item) => reveal(element, local, .5 + item * 3.0, .5, 16));
      [...beat.querySelectorAll('.hf-workflow i')].forEach((element, item) => draw(element, local, 2.1 + item * 3.0, .5));
      const signal = beat.querySelector('.hf-signal');
      const travel = smooth((local - 1.0) / 15.2);
      signal.style.opacity = ease((local - .8) / .3);
      signal.style.transform = `translateX(${travel * 1015}px)`;
      reveal(beat.querySelector('.hf-receipt'), local, 16.1, .5, 10);
    } else if (index === 5) {
      reveal(beat.querySelector('.hf-repetitive'), local, .45);
      [...beat.querySelectorAll('.hf-repetitive i')].forEach((element, item) => {
        const arrive = ease((local - (1.2 + item * .25)) / .4);
        const compress = ease((local - (4.2 + item * .18)) / .8);
        element.style.opacity = arrive * (1 - compress * .62);
        element.style.transform = `scaleX(${arrive * (1 - compress * .78)})`;
      });
      draw(beat.querySelector('.hf-balance-route'), local, 4.6, .7);
      [...beat.querySelectorAll('.hf-value-grid .hf-card')].forEach((element, item) => reveal(element, local, 5.0 + item * 1.1, .48, 12));
      reveal(beat.querySelector('.hf-focus'), local, 10.1, .5, 10);
    } else {
      reveal(beat.querySelector('.hf-final-factory'), local, .45, .6, 18);
      [...beat.querySelectorAll('.hf-draw')].forEach((path, item) => drawPath(path, local, 2.0 + item * 1.0));
      [...beat.querySelectorAll('.hf-scale-node')].forEach((element, item) => reveal(element, local, 2.6 + item * 1.0, .45, 12));
      reveal(beat.querySelector('.hf-scale-label'), local, 7.4, .5, 10);
    }
  };
  const render = time => {
    const endProgress = ease((time - 107.4) / .55);
    shell.style.opacity = 1 - endProgress;
    endcard.style.opacity = endProgress;
    endcard.querySelector('.hf-end-lockup').style.transform = `translateY(${(1 - endProgress) * 16}px)`;
    segments.forEach((segment, index) => {
      const local = time - segment.start;
      const visible = time >= segment.start && time <= segment.start + segment.length ? windowed(local, segment.length) : 0;
      beats[index].style.opacity = visible;
      copies[index].style.opacity = visible;
      copies[index].style.transform = `translateY(${(1 - ease(local / .55)) * 12}px)`;
      animateBeat(beats[index], local, index);
      animateCamera(beats[index], local, index);
    });
  };
  const editorialTimeline = gsap.timeline({ paused: true });
  const animatedChildren = [
    '.hf-document', '.hf-route-a', '.hf-knowledge', '.hf-source-list span',
    '.hf-bank', '.hf-gap-line', '.hf-barriers span', '.hf-agent', '.hf-route-b', '.hf-video', '.hf-bridge-label',
    '.hf-b2 .hf-factory', '.hf-b2 .hf-role', '.hf-b2 .hf-human',
    '.hf-experiment', '.hf-tested', '.hf-step', '.hf-workflow i', '.hf-signal', '.hf-receipt',
    '.hf-repetitive', '.hf-balance-route', '.hf-value-grid .hf-card', '.hf-focus',
    '.hf-final-factory', '.hf-scale-node', '.hf-scale-label'
  ].join(',');
  editorialTimeline.set(beats, { opacity: 0 }, 0);
  editorialTimeline.set(copies, { opacity: 0, y: 12 }, 0);
  editorialTimeline.set(animatedChildren, { opacity: 0 }, 0);
  editorialTimeline.set('.hf-endcard', { opacity: 0 }, 0);
  editorialTimeline.set('.hf-shell', { opacity: 1 }, 0);

  segments.forEach((segment, index) => {
    editorialTimeline.to(beats[index], { opacity: 1, duration: .55, ease: 'power3.out' }, segment.start);
    editorialTimeline.to(copies[index], { opacity: 1, y: 0, duration: .55, ease: 'power3.out' }, segment.start);
    editorialTimeline.to([beats[index], copies[index]], { opacity: 0, duration: .55, ease: 'power3.in' }, segment.start + segment.length - .55);
  });

  const revealOnTimeline = (selector, at, duration = .5, distance = 16) => {
    editorialTimeline.fromTo(selector, { opacity: 0, y: distance }, { opacity: 1, y: 0, duration, ease: 'power3.out' }, at);
  };
  const drawOnTimeline = (selector, at, duration = .55) => {
    editorialTimeline.fromTo(selector, { opacity: 0, scaleX: 0, transformOrigin: 'left center' }, { opacity: 1, scaleX: 1, duration, ease: 'power2.out' }, at);
  };
  const drawPathsOnTimeline = (selector, at, stagger = 0) => {
    [...document.querySelectorAll(selector)].forEach((path, index) => {
      const length = path.getTotalLength();
      editorialTimeline.fromTo(path, { opacity: 0, strokeDasharray: length, strokeDashoffset: length }, { opacity: 1, strokeDashoffset: 0, duration: .7, ease: 'power2.inOut' }, at + index * stagger);
    });
  };

  revealOnTimeline('.hf-document', .35, .6, 18);
  drawOnTimeline('.hf-route-a', 3.2);
  revealOnTimeline('.hf-knowledge', 3.65);
  [...document.querySelectorAll('.hf-source-list span')].forEach((element, index) => revealOnTimeline(element, 6 + index * 1.45, .45, 10));

  revealOnTimeline('.hf-bank', 15.25);
  drawOnTimeline('.hf-gap-line', 15.75);
  [...document.querySelectorAll('.hf-barriers span')].forEach((element, index) => revealOnTimeline(element, 16.25 + index * .45, .38, 12));
  revealOnTimeline('.hf-agent', 17.65);
  drawOnTimeline('.hf-route-b', 18.15);
  revealOnTimeline('.hf-video', 18.55);
  revealOnTimeline('.hf-bridge-label', 20, .45, 10);

  revealOnTimeline('.hf-b2 .hf-factory', 23.45, .6, 18);
  [...document.querySelectorAll('.hf-b2 .hf-role')].forEach((element, index) => revealOnTimeline(element, 26.1 + index * 2.25, .48, 14));
  drawPathsOnTimeline('.hf-b2 .hf-draw', 27, 2.25);
  revealOnTimeline('.hf-human', 38.7, .5, 10);

  [...document.querySelectorAll('.hf-experiment')].forEach((element, index) => revealOnTimeline(element, 46.5 + index * 2.1, .55, 18));
  drawPathsOnTimeline('.hf-b3 .hf-draw', 54.9);
  revealOnTimeline('.hf-tested', 56.1, .5, 10);

  [...document.querySelectorAll('.hf-step')].forEach((element, index) => revealOnTimeline(element, 60.5 + index * 3, .5, 16));
  [...document.querySelectorAll('.hf-workflow i')].forEach((element, index) => drawOnTimeline(element, 62.1 + index * 3, .5));
  editorialTimeline.fromTo('.hf-signal', { opacity: 0, x: 0 }, { opacity: 1, x: 1015, duration: 15.2, ease: 'none' }, 61);
  revealOnTimeline('.hf-receipt', 76.1, .5, 10);

  revealOnTimeline('.hf-repetitive', 80.45);
  editorialTimeline.fromTo('.hf-repetitive i', { opacity: 0, scaleX: 0, transformOrigin: 'left center' }, { opacity: 1, scaleX: 1, duration: .5, stagger: .25, ease: 'power2.out' }, 81.2);
  editorialTimeline.to('.hf-repetitive i', { opacity: .38, scaleX: .22, duration: .8, stagger: .18, ease: 'power2.inOut' }, 84.2);
  drawOnTimeline('.hf-balance-route', 84.6, .7);
  [...document.querySelectorAll('.hf-value-grid .hf-card')].forEach((element, index) => revealOnTimeline(element, 85 + index * 1.1, .48, 12));
  revealOnTimeline('.hf-focus', 90.1, .5, 10);

  revealOnTimeline('.hf-final-factory', 94.45, .6, 18);
  drawPathsOnTimeline('.hf-b6 .hf-draw', 96, 1);
  [...document.querySelectorAll('.hf-scale-node')].forEach((element, index) => revealOnTimeline(element, 96.6 + index, .45, 12));
  revealOnTimeline('.hf-scale-label', 101.4, .5, 10);

  [1, 2, 4, 6].forEach(index => {
    const move = cameraMoves[index];
    editorialTimeline.fromTo(beats[index], { scale: move.scale, x: -90, y: -56 }, { scale: 1, x: 0, y: 0, duration: move.end - move.start, ease: 'power2.inOut' }, segments[index].start + move.start);
  });

  editorialTimeline.to('.hf-shell', { opacity: 0, duration: .55, ease: 'power3.in' }, 107.4);
  editorialTimeline.to('.hf-endcard', { opacity: 1, duration: .55, ease: 'power3.out' }, 107.4);
  editorialTimeline.fromTo('.hf-end-lockup', { y: 16 }, { y: 0, duration: .55, ease: 'power3.out' }, 107.4);
  editorialTimeline.to({ progress: 0 }, { progress: 1, duration: 2.05, ease: 'none' }, 107.95);
  window.__timelines.main = editorialTimeline;
})();
