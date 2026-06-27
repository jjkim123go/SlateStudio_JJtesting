(function () {
  var sceneSel = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(sceneSel + '.pb-root');
  if (!root) return;

  function isPlaceholder(v) {
    return typeof v !== 'string' || !v || v.indexOf('{{') === 0;
  }

  function safeText(v, fb) {
    if (typeof v !== 'string') return fb || '';
    var trimmed = v.trim();
    return trimmed ? trimmed : (fb || '');
  }

  function safeJson(text, fb) {
    if (typeof text !== 'string') return fb;
    var trimmed = text.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed.indexOf('{{') === 0) return fb;
    try { return JSON.parse(trimmed); } catch (_err) { return fb; }
  }

  function normalizePlacement(v) {
    return v === 'bottom-right' || v === 'top-right' || v === 'bottom-left' ? v : 'bottom-left';
  }

  function computeInitials(name) {
    var words = safeText(name, 'Speaker')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!words.length) return 'SP';
    var chars = words.map(function (part) { return part.charAt(0).toUpperCase(); }).join('');
    return chars || 'SP';
  }

  function normalizeSocialItem(item) {
    if (!item || typeof item !== 'object') return null;
    var label = safeText(item.label, '');
    var handle = safeText(item.handle, '');
    if (!handle) return null;
    return {
      label: label || 'Social',
      handle: handle
    };
  }

  var socialEl = document.getElementById('pb-social-' + SCENE_ID);
  var rawPlacement = SCENE_PROPS && typeof SCENE_PROPS === 'object'
    ? SCENE_PROPS.placement
    : '';
  var placement = normalizePlacement(rawPlacement || 'bottom-left');

  var rawSocial = socialEl ? safeJson(socialEl.textContent, []) : [];
  if ((!Array.isArray(rawSocial) || !rawSocial.length) && SCENE_PROPS && typeof SCENE_PROPS === 'object') {
    rawSocial = SCENE_PROPS.social;
  }
  var social = Array.isArray(rawSocial)
    ? rawSocial.map(normalizeSocialItem).filter(Boolean)
    : [];

  root.setAttribute('data-placement', placement);
  if (placement === 'bottom-right') {
    root.style.right = 'clamp(40px, 3.8vw, 72px)';
    root.style.bottom = 'clamp(28px, 3.6vh, 54px)';
  } else if (placement === 'top-right') {
    root.style.right = 'clamp(40px, 3.8vw, 72px)';
    root.style.top = 'clamp(28px, 3.6vh, 54px)';
  } else {
    root.style.left = 'clamp(40px, 3.8vw, 72px)';
    root.style.bottom = 'clamp(28px, 3.6vh, 54px)';
  }

  var name = safeText(root.getAttribute('data-name'), 'Speaker');
  var title = safeText(root.getAttribute('data-title'), '');
  var photoSrc = safeText(root.getAttribute('data-photo-src'), '');
  var company = safeText(root.getAttribute('data-company'), '');
  var pronouns = safeText(root.getAttribute('data-pronouns'), '');

  var nameEl = root.querySelector('.pb-name');
  var titleEl = root.querySelector('.pb-title');
  var pronounsEl = root.querySelector('.pb-pronouns');
  var companyEl = root.querySelector('.pb-company');
  var metaEl = root.querySelector('.pb-meta');
  var socialRow = root.querySelector('.pb-social-row');
  var socialLabelEl = root.querySelector('.pb-social-label');
  var socialHandleEl = root.querySelector('.pb-social-handle');
  var initialsEl = root.querySelector('.pb-avatar-initials');
  var avatarImage = root.querySelector('.pb-avatar-image');

  if (nameEl) nameEl.textContent = name;
  if (titleEl) titleEl.textContent = title;
  if (initialsEl) initialsEl.textContent = computeInitials(name);

  if (!title && titleEl) {
    titleEl.textContent = '';
    titleEl.style.display = 'none';
  }

  if (pronounsEl) {
    if (pronouns) pronounsEl.textContent = '(' + pronouns + ')';
    else pronounsEl.style.display = 'none';
  }

  if (companyEl) {
    if (company) companyEl.textContent = company;
    else companyEl.style.display = 'none';
  }
  if (metaEl && !company) metaEl.style.display = 'none';

  if (avatarImage) {
    if (photoSrc && !isPlaceholder(photoSrc)) {
      avatarImage.setAttribute('href', photoSrc);
      avatarImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', photoSrc);
      avatarImage.style.opacity = '1';
      if (initialsEl) initialsEl.style.display = 'none';
    } else {
      avatarImage.removeAttribute('href');
      avatarImage.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      avatarImage.style.opacity = '0';
      if (initialsEl) initialsEl.style.display = '';
    }
  }

  function setSocial(index) {
    if (!socialRow || !social.length) return;
    var item = social[index % social.length];
    if (!item) return;
    if (socialLabelEl) socialLabelEl.textContent = item.label;
    if (socialHandleEl) socialHandleEl.textContent = item.handle;
  }

  if (!social.length) {
    if (socialRow) socialRow.style.display = 'none';
    root.classList.add('pb-no-social');
  } else {
    setSocial(0);
  }

  var introFromX = placement === 'bottom-left' ? '-120%' : '120%';
  master.fromTo(sceneSel + '.pb-root',
    { x: introFromX },
    { x: '0%', duration: 0.5, ease: 'power3.out' },
    SCENE_START + 0.0);

  master.fromTo(sceneSel + '.pb-avatar',
    { autoAlpha: 0, scale: 0.88 },
    { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' },
    SCENE_START + 0.5);

  master.fromTo(sceneSel + '.pb-name-wrap',
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0% 0 0)', duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.8);

  master.fromTo(sceneSel + '.pb-title-wrap',
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0% 0 0)', duration: 0.4, ease: 'power2.out' },
    SCENE_START + 0.9);

  master.fromTo(sceneSel + '.pb-name, ' + sceneSel + '.pb-title-line',
    { autoAlpha: 0, x: 18 },
    { autoAlpha: 1, x: 0, duration: 0.35, ease: 'power2.out', stagger: 0.06 },
    SCENE_START + 0.82);

  if (metaEl && metaEl.style.display !== 'none') {
    master.fromTo(sceneSel + '.pb-meta',
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' },
      SCENE_START + 1.2);
  }

  if (socialRow && socialRow.style.display !== 'none') {
    master.fromTo(sceneSel + '.pb-social-row',
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' },
      SCENE_START + 1.28);

    if (social.length >= 2) {
      var switchAt = 1.6;
      var idx = 1;
      while (switchAt < SCENE_DURATION - 0.05) {
        master.call(setSocial, [idx], SCENE_START + switchAt);
        switchAt += 2.5;
        idx += 1;
      }
    }
  }
})();
