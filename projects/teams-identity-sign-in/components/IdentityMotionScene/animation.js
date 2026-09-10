// Intent: glass - precise, phrase-led visual construction for identity concepts.
const S = '.scene-' + SCENE_ID;
const t = SCENE_START;
const enter = { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' };

if (SCENE_PROPS.variant === 'intro') {
  master.fromTo(S + ' .ims-intro-copy', { autoAlpha: 0, x: -30 }, enter, t + 0.25);
  master.fromTo(S + ' .ims-panel', { autoAlpha: 0, x: 30, scale: 0.98 }, enter, t + 0.65);
  master.fromTo(S + ' .ims-person-orbit', { autoAlpha: 0, scale: 0.7 }, enter, t + 1.25);
  master.fromTo(S + ' .ims-who', { autoAlpha: 0, y: 20 }, enter, t + 1.8);
  master.fromTo(S + ' .ims-how', { autoAlpha: 0, y: 20 }, enter, t + 2.5);
  master.to(S + ' .ims-proof-line path', { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, t + 3.15);
  master.fromTo(S + ' .ims-verify', { autoAlpha: 0, scale: 0.75 }, enter, t + 3.85);
}

if (SCENE_PROPS.variant === 'paths') {
  master.fromTo(S + ' .ims-paths h1', { autoAlpha: 0, y: 20 }, enter, t + 0.25);
  master.fromTo(S + ' .ims-source', { autoAlpha: 0, scale: 0.8 }, enter, t + 0.9);
  master.to(S + ' .ims-branch-left', { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' }, t + 1.7);
  master.fromTo(S + ' .ims-cloud-card', { autoAlpha: 0, x: -24, scale: 0.92 }, enter, t + 2.45);
  master.to(S + ' .ims-branch-right', { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' }, t + 3.15);
  master.fromTo(S + ' .ims-hybrid-card', { autoAlpha: 0, x: 24, scale: 0.92 }, enter, t + 3.9);
}

if (SCENE_PROPS.variant === 'cloud') {
  master.fromTo(S + ' .ims-cloud h1', { autoAlpha: 0, y: 20 }, enter, t + 0.25);
  master.to(S + ' .ims-cloud-boundary path', { strokeDashoffset: 0, duration: 1.5, ease: 'power1.inOut' }, t + 0.9);
  master.fromTo(S + ' .ims-entra-label', { autoAlpha: 0, y: 12 }, enter, t + 1.9);
  master.fromTo(S + ' .ims-cloud-user', { autoAlpha: 0, x: -24, scale: 0.92 }, enter, t + 2.6);
  master.to(S + ' .ims-cloud-route path', { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, t + 3.45);
  master.fromTo(S + ' .ims-cloud-check', { autoAlpha: 0, x: 24, scale: 0.92 }, enter, t + 4.35);
  master.fromTo(S + ' .ims-cloud-check img', { scale: 0.72 }, { scale: 1, duration: 0.45, ease: 'back.out(1.4)' }, t + 4.85);
}

if (SCENE_PROPS.variant === 'hybrid') {
  master.fromTo(S + ' .ims-hybrid h1', { autoAlpha: 0, y: 20 }, enter, t + 0.25);
  master.fromTo(S + ' .ims-h-ad', { autoAlpha: 0, x: -25, scale: 0.94 }, enter, t + 0.9);
  master.to(S + ' .ims-h-line-one', { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, t + 1.65);
  master.fromTo(S + ' .ims-h-connect', { autoAlpha: 0, scale: 0.85 }, enter, t + 2.55);
  master.to(S + ' .ims-h-line-two', { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, t + 3.25);
  master.fromTo(S + ' .ims-h-entra', { autoAlpha: 0, x: 25, scale: 0.94 }, enter, t + 4.15);
}

if (SCENE_PROPS.variant === 'mfa') {
  master.fromTo(S + ' .ims-mfa h1', { autoAlpha: 0, y: 20 }, enter, t + 0.2);
  master.fromTo(S + ' .ims-password', { autoAlpha: 0, x: -24, scale: 0.94 }, enter, t + 0.75);
  master.to(S + ' .ims-broken-a', { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, t + 1.45);
  master.to(S + ' .ims-broken-b', { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, t + 1.7);
  master.to(S + ' .ims-upgrade-arrow', { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, t + 2.05);
  master.fromTo(S + ' .ims-mfa-card', { autoAlpha: 0, x: 24, scale: 0.9 }, enter, t + 2.45);
  master.fromTo(S + ' .ims-methods div', { autoAlpha: 0, y: 24, scale: 0.88 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.35)', stagger: 0.55 }, t + 3.2);
}