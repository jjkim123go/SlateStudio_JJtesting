// Intent: paper - guided momentum as a billing record is populated and reconciled.
const bpsScope = '.scene-' + SCENE_ID;
const bpsStart = SCENE_START;
const bpsEnter = { duration: 0.6, ease: 'power1.out' };

master.fromTo(bpsScope + ' .bps-reconcile-sweep',
  { xPercent: -115 },
  { xPercent: 115, duration: 8.6, ease: 'none' },
  bpsStart + 0.2);

master.fromTo(bpsScope + ' .bps-shell',
  { autoAlpha: 0, y: 30, scale: 0.985 },
  { autoAlpha: 1, y: 0, scale: 1, ...bpsEnter },
  bpsStart + 0.2);

master.fromTo(bpsScope + ' .bps-minimal-nav',
  { autoAlpha: 0, x: -20 },
  { autoAlpha: 1, x: 0, ...bpsEnter },
  bpsStart + 0.75);

master.fromTo(bpsScope + ' .bps-page-head',
  { autoAlpha: 0, y: 20 },
  { autoAlpha: 1, y: 0, ...bpsEnter },
  bpsStart + 1.15);

master.fromTo(bpsScope + ' .bps-drawer',
  { autoAlpha: 0, y: 30, scale: 0.98 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'power1.out' },
  bpsStart + 1.85);

master.fromTo(bpsScope + ' .bps-policy-field .bps-value',
  { autoAlpha: 0, x: -16 },
  { autoAlpha: 1, x: 0, ...bpsEnter },
  bpsStart + 2.8);

master.fromTo(bpsScope + ' .bps-scope-line',
  { scaleY: 0 },
  { scaleY: 0.48, duration: 0.6, ease: 'power1.out' },
  bpsStart + 3.2);
master.fromTo(bpsScope + ' .bps-pointer',
  { autoAlpha: 0, x: 12, y: 12 },
  { autoAlpha: 1, x: 0, y: 0, duration: 0.4, ease: 'power1.out' },
  bpsStart + 3.2);
master.fromTo(bpsScope + ' .bps-pointer span',
  { autoAlpha: 0.7, scale: 0.4 },
  { autoAlpha: 0, scale: 1.35, duration: 0.45, ease: 'power1.out' },
  bpsStart + 3.45);
master.to(bpsScope + ' .bps-subscription-field .bps-placeholder',
  { autoAlpha: 0, duration: 0.4, ease: 'power1.in' },
  bpsStart + 3.45);
master.fromTo(bpsScope + ' .bps-subscription-field .bps-value',
  { autoAlpha: 0, x: -18 },
  { autoAlpha: 1, x: 0, ...bpsEnter },
  bpsStart + 3.75);

master.to(bpsScope + ' .bps-pointer',
  { y: 101, duration: 0.65, ease: 'power1.inOut' },
  bpsStart + 4.15);
master.fromTo(bpsScope + ' .bps-pointer span',
  { autoAlpha: 0.7, scale: 0.4 },
  { autoAlpha: 0, scale: 1.35, duration: 0.45, ease: 'power1.out' },
  bpsStart + 4.65);
master.to(bpsScope + ' .bps-resource-field .bps-placeholder',
  { autoAlpha: 0, duration: 0.4, ease: 'power1.in' },
  bpsStart + 4.65);
master.fromTo(bpsScope + ' .bps-resource-field .bps-value',
  { autoAlpha: 0, x: -18 },
  { autoAlpha: 1, x: 0, ...bpsEnter },
  bpsStart + 4.95);

master.to(bpsScope + ' .bps-scope-line',
  { scaleY: 1, duration: 0.65, ease: 'power1.out' },
  bpsStart + 5.45);
master.to(bpsScope + ' .bps-pointer',
  { autoAlpha: 0, duration: 0.35, ease: 'power1.in' },
  bpsStart + 5.45);
master.fromTo(bpsScope + ' .bps-status',
  { autoAlpha: 0, y: 18, scale: 0.98 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'power1.out' },
  bpsStart + 6.05);
master.fromTo(bpsScope + ' .bps-status svg',
  { autoAlpha: 0, scale: 0.72 },
  { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out' },
  bpsStart + 6.35);

master.fromTo(bpsScope + ' .bps-actions',
  { autoAlpha: 0, y: 12 },
  { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power1.out' },
  bpsStart + 6.75);