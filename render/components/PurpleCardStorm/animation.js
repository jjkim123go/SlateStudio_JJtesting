/* PurpleCardStorm — premium 3D card storm animation.
 *
 * Stage 1 (0 → ~3s): cards storm in from extreme 3D positions
 *   (translate3d/rotate3d) with stagger, settle into Keynote-style arrangement.
 * Stage 2 (3s → end): continuous gentle parallax breathing + rotation drift
 *   (no static hold — premium feel).
 * Eyebrow + title fade in first; footer line fades in late.
 */
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

  // ----- Resting positions for up to 8 cards (Keynote-style staggered grid) -----
  // [x_pct, y_pct, rotateX, rotateY, rotateZ, depth_z]
  const layouts = {
    4: [
      [-260, -150, -4,  6, -2, 0],
      [ 220, -120,  6, -8,  3, -40],
      [-200,  140,  4,  6,  2, 30],
      [ 260,  170, -3, -6, -3, -60],
    ],
    6: [
      [-340, -160, -3,  5, -1, 0],
      [   0, -200,  5,  0,  0, -40],
      [ 340, -150,  4, -6,  2, 20],
      [-300,  120,  2,  4,  1, 30],
      [   0,  170, -2,  0,  0, -10],
      [ 320,  130,  3, -5,  0, -50],
    ],
    8: [
      [-380, -180, -4,  6, -2, 0],
      [ -90, -220,  4,  2,  1, -50],
      [ 200, -200,  3, -4,  2, 10],
      [ 380, -120,  6, -8,  3, -30],
      [-340,  100, -2,  6,  1, 30],
      [ -60,  170,  4,  0, -1, -20],
      [ 220,  190, -3, -3,  0, 40],
      [ 380,  110,  3, -7, -2, -60],
    ],
  };
  const positions = layouts[cards.length] || layouts[4];

  // ----- Build cards -----
  const els = cards.slice(0, positions.length).map((c, i) => {
    const el = document.createElement('div');
    el.className = 'pcs-card';
    el.dataset.accent = c.accent || 'primary';
    el.innerHTML = `
      <div class="pcs-card-bar"></div>
      <div class="pcs-card-idx">${c.idx || (i + 1).toString().padStart(2, '0')}</div>
      <div class="pcs-card-title">${c.title || ''}</div>
      <div class="pcs-card-sub">${c.sub || ''}</div>
      <div class="pcs-card-badge">${c.badge || ''}</div>
    `;
    stage.appendChild(el);
    const [tx, ty, rx, ry, rz, tz] = positions[i];
    el._rest = { tx, ty, rx, ry, rz, tz };
    // Storm origin — extreme 3D position outside frame
    const angle = (i / cards.length) * Math.PI * 2;
    const stormR = 1100 + Math.random() * 400;
    el._origin = {
      tx: Math.cos(angle) * stormR,
      ty: Math.sin(angle) * stormR * 0.6 + (Math.random() - 0.5) * 200,
      rx: (Math.random() - 0.5) * 60,
      ry: (Math.random() - 0.5) * 80,
      rz: (Math.random() - 0.5) * 40,
      tz: -800 - Math.random() * 600,
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

  // ----- Master timeline -----
  const tl = gsap.timeline();

  // Phase 1: header fades in
  tl.to(eyebrow, { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.2);
  tl.to(title,   { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out' }, 0.5);
  tl.to(divider, { scaleX: 1, opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.8);

  // Phase 2: cards storm in (staggered)
  els.forEach((el, i) => {
    const delay = 0.9 + i * 0.18;
    tl.to(el, {
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
    }, delay);
  });

  // Phase 3: continuous parallax breathing — runs forever during scene hold
  const settledTime = 0.9 + (els.length - 1) * 0.18 + 1.4;
  els.forEach((el, i) => {
    const breathDur = 4.0 + Math.random() * 2.0;
    const breathPhase = Math.random() * Math.PI * 2;
    gsap.to(el, {
      keyframes: [
        { y: el._rest.ty - 12, x: el._rest.tx + 6,  rotationY: el._rest.ry - 1.2, duration: breathDur * 0.5, ease: 'sine.inOut' },
        { y: el._rest.ty + 10, x: el._rest.tx - 5,  rotationY: el._rest.ry + 1.4, duration: breathDur * 0.5, ease: 'sine.inOut' },
      ],
      delay: settledTime - 0.3 + breathPhase * 0.1,
      repeat: -1,
      yoyo: false,
    });
  });

  // Phase 4: footer fade-in late
  if (footer) {
    tl.to(footer, { opacity: 1, duration: 1.0, ease: 'power2.out' }, settledTime + 0.4);
  }
}
