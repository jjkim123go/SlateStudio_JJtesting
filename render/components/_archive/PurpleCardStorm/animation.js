// Intent: glass — calm executive credibility with stationary cards and subtle light sweeps.
const root = document.querySelector('.scene-{{sceneId}} .pcs-root');
if (!root) {
  console.warn('[PurpleCardStorm] root not found');
} else {
  const stage = root.querySelector('.pcs-stage');
  const eyebrow = root.querySelector('.pcs-eyebrow');
  const title = root.querySelector('.pcs-title');
  const divider = root.querySelector('.pcs-divider');
  const footer = root.querySelector('.pcs-footer');

  // ----- Parse card data -----
  let cards = [];
  try {
    cards = JSON.parse(root.dataset.pcsCards || '[]');
  } catch (e) {
    console.warn('[PurpleCardStorm] bad cardsJson', e);
    cards = [];
  }
  if (!cards.length) {
    cards = [
      { idx: '01', title: 'Card A', sub: 'Sub a', badge: '5h', accent: 'primary' },
      { idx: '02', title: 'Card B', sub: 'Sub b', badge: '4h', accent: 'secondary' },
      { idx: '03', title: 'Card C', sub: 'Sub c', badge: '3h', accent: 'warm' },
      { idx: '04', title: 'Card D', sub: 'Sub d', badge: '2h', accent: 'primary' },
    ];
  }

  const timeline = (typeof master !== 'undefined') ? master : gsap.timeline();
  const baseTime = (typeof SCENE_START !== 'undefined') ? SCENE_START : 0;
  const sceneDur = (typeof SCENE_DURATION !== 'undefined') ? SCENE_DURATION : 12;

  // ----- Resting positions for up to 8 cards (spacious Keynote-style grid) -----
  // [x_pct, y_pct, rotateX, rotateY, rotateZ, depth_z]
  const layouts = {
    4: [
      [-260, -145, -2,  3, -1, 0],
      [ 260, -145,  2, -3,  1, -20],
      [-260,  145,  1,  2,  1, 20],
      [ 260,  145, -1, -2, -1, -20],
    ],
    6: [
      [-430, -145, -2,  3, -1, 0],
      [   0, -160,  2,  0,  0, -20],
      [ 430, -145,  2, -3,  1, 0],
      [-430,  135,  1,  2,  1, 10],
      [   0,  160, -1,  0,  0, -20],
      [ 430,  135,  1, -2, -1, 10],
    ],
    8: [
      [-470, -180, -2,  3, -1, 0],
      [-155, -205,  2,  1,  1, -25],
      [ 155, -205,  2, -1,  1, 10],
      [ 470, -180,  2, -3,  1, -10],
      [-470,  120, -1,  3,  1, 20],
      [-155,  170,  1,  0, -1, -10],
      [ 155,  170, -1,  0,  0, 20],
      [ 470,  120,  1, -3, -1, -20],
    ],
  };
  const positions = layouts[cards.length] || layouts[4];

  // ----- Build cards -----
  const els = cards.slice(0, positions.length).map((c, i) => {
    const el = document.createElement('div');
    el.className = 'pcs-card';
    el.dataset.accent = c.accent || 'primary';
    el.innerHTML = `
      <div class="pcs-card-sheen"></div>
      <div class="pcs-card-bar"></div>
      <div class="pcs-card-idx">${c.idx || (i + 1).toString().padStart(2, '0')}</div>
      <div class="pcs-card-title">${c.title || ''}</div>
      <div class="pcs-card-sub">${c.sub || ''}</div>
      <div class="pcs-card-badge">${c.badge || ''}</div>
    `;
    stage.appendChild(el);
    const [tx, ty, rx, ry, rz, tz] = positions[i];
    el._rest = { tx, ty, rx, ry, rz, tz };
    // Deterministic entrance origin — no random jitter between renders.
    const angle = (i / Math.max(cards.length, 1)) * Math.PI * 2;
    const stormR = 1040;
    el._origin = {
      tx: Math.cos(angle) * stormR,
      ty: Math.sin(angle) * stormR * 0.58,
      rx: i % 2 === 0 ? -18 : 18,
      ry: i % 3 === 0 ? 22 : -22,
      rz: i % 2 === 0 ? -9 : 9,
      tz: -980 - i * 36,
    };
    // Set initial transform
    gsap.set(el, {
      x: el._origin.tx,
      y: el._origin.ty,
      z: el._origin.tz,
      rotationX: el._origin.rx,
      rotationY: el._origin.ry,
      rotationZ: el._origin.rz,
      opacity: 0,
      filter: 'blur(8px)',
    });
    return el;
  });

  // ----- Header set (start hidden) -----
  gsap.set([eyebrow, title], { y: 24, opacity: 0 });
  gsap.set(divider, { scaleX: 0, opacity: 0, transformOrigin: '50% 50%' });

  // Phase 1: header fades in
  timeline.to(eyebrow, { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }, baseTime + 0.2);
  timeline.to(title,   { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' }, baseTime + 0.5);
  timeline.to(divider, { scaleX: 1, opacity: 1, duration: 0.7, ease: 'power2.out' }, baseTime + 0.8);

  // Phase 2: cards storm in (staggered)
  els.forEach((el, i) => {
    const delay = 0.9 + i * 0.18;
    timeline.to(el, {
      x: el._rest.tx,
      y: el._rest.ty,
      z: el._rest.tz,
      rotationX: el._rest.rx,
      rotationY: el._rest.ry,
      rotationZ: el._rest.rz,
      opacity: 1,
      filter: 'blur(0px)',
      duration: 1.4,
      ease: 'power3.out',
    }, baseTime + delay);
  });

  // Phase 3: subtle card sheens. Cards remain stationary after the settle.
  const settledTime = 0.9 + (els.length - 1) * 0.18 + 1.4;
  els.forEach((el, i) => {
    const sheen = el.querySelector('.pcs-card-sheen');
    for (let pass = 0; pass < 4; pass += 1) {
      const sweepStart = settledTime + 0.55 + pass * 3.6 + i * 0.16;
      if (sweepStart > sceneDur - 1.2) continue;
      timeline.fromTo(sheen,
        { xPercent: -130, opacity: 0 },
        { xPercent: 260, opacity: 0.55, duration: 1.0, ease: 'sine.inOut' },
        baseTime + sweepStart);
      timeline.to(sheen, { opacity: 0, duration: 0.28, ease: 'sine.out' }, baseTime + sweepStart + 0.72);
    }
  });
  timeline.fromTo(root.querySelector('.pcs-aurora'),
    { x: -10, y: 6 },
    { x: 10, y: -4, duration: Math.max(4, sceneDur - 0.8), ease: 'sine.inOut' },
    baseTime + 0.3);

  // Phase 4: footer fade-in late
  if (footer) {
    timeline.to(footer, { opacity: 1, duration: 1.0, ease: 'power2.out' }, baseTime + settledTime + 0.4);
  }
}
