/*
  ReleaseNotes — timeline for PM/EM release digest scenes.
  Hotfix tolerance rule: features may be omitted or empty. This component must
  render correctly as long as at least one of features | fixes | breakingChanges
  is non-empty, so the animation never assumes feature cards exist.
  DOM safety rule: all cards, pills, links, ribbon, and the fix-counter span are
  built once during init. onUpdate mutates textContent only.
*/
var __rnScope = '.scene-' + SCENE_ID + ' ';
var __rnRoot = document.querySelector(__rnScope + '.rn-root');
if (!__rnRoot) { return; }

function __rnReadIsland(id, fallback) {
  var node = document.getElementById(id);
  if (!node) return fallback;
  var raw = (node.textContent || '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') return fallback;
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function __rnCreate(tag, className, text) {
  var el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function __rnInit() {
  var features = __rnReadIsland('rn-features-' + SCENE_ID, []);
  var fixes = __rnReadIsland('rn-fixes-' + SCENE_ID, []);
  var breakingChanges = __rnReadIsland('rn-breaking-' + SCENE_ID, []);
  var links = __rnReadIsland('rn-links-' + SCENE_ID, []);

  if (!features.length && !fixes.length && !breakingChanges.length) {
    return null;
  }

  var featureContainer = __rnRoot.querySelector(__rnScope + '.rn-feature-list') || __rnRoot.querySelector('.rn-feature-list');
  var fixContainer = __rnRoot.querySelector(__rnScope + '.rn-fix-list') || __rnRoot.querySelector('.rn-fix-list');
  var breakingContainer = __rnRoot.querySelector(__rnScope + '.rn-breaking-list') || __rnRoot.querySelector('.rn-breaking-list');
  var linkContainer = __rnRoot.querySelector(__rnScope + '.rn-link-list') || __rnRoot.querySelector('.rn-link-list');
  var tickerTrack = __rnRoot.querySelector(__rnScope + '.rn-ticker-track') || __rnRoot.querySelector('.rn-ticker-track');
  var featuresSection = __rnRoot.querySelector(__rnScope + '.rn-section-features') || __rnRoot.querySelector('.rn-section-features');
  var fixesSection = __rnRoot.querySelector(__rnScope + '.rn-section-fixes') || __rnRoot.querySelector('.rn-section-fixes');
  var breakingSection = __rnRoot.querySelector(__rnScope + '.rn-section-breaking') || __rnRoot.querySelector('.rn-section-breaking');
  var linksSection = __rnRoot.querySelector(__rnScope + '.rn-section-links') || __rnRoot.querySelector('.rn-section-links');

  if (!features.length && featuresSection) featuresSection.style.display = 'none';
  if (!fixes.length && fixesSection) fixesSection.style.display = 'none';
  if (!breakingChanges.length && breakingSection) breakingSection.style.display = 'none';
  if (!links.length && linksSection) linksSection.style.display = 'none';

  __rnRoot.classList.add(features.length ? 'rn-has-features' : 'rn-no-features');
  __rnRoot.classList.add(breakingChanges.length ? 'rn-has-breaking' : 'rn-no-breaking');

  if (featureContainer) {
    features.forEach(function(feature) {
      var card = __rnCreate('article', 'rn-feature-card');
      card.setAttribute('data-priority', feature && feature.pill ? 'high' : 'normal');

      var top = __rnCreate('div', 'rn-feature-top');
      var iconWrap = __rnCreate('span', 'rn-icon-wrap');
      if (feature && feature.icon) {
        var img = __rnCreate('img', 'rn-icon-image');
        img.src = feature.icon;
        img.alt = '';
        img.onerror = function() { this.style.display = 'none'; };
        iconWrap.appendChild(img);
      } else {
        iconWrap.appendChild(__rnCreate('span', 'rn-icon-fallback'));
      }
      top.appendChild(iconWrap);

      if (feature && feature.pill) {
        top.appendChild(__rnCreate('span', 'rn-pill', feature.pill));
      }

      card.appendChild(top);
      card.appendChild(__rnCreate('h3', 'rn-feature-title', feature && feature.title ? feature.title : 'Untitled feature'));
      card.appendChild(__rnCreate('p', 'rn-feature-body', feature && feature.body ? feature.body : ''));
      featureContainer.appendChild(card);
    });
  }

  if (fixContainer) {
    fixes.forEach(function(fix) {
      var item = __rnCreate('div', 'rn-fix-item');
      item.appendChild(__rnCreate('p', 'rn-fix-title', fix && fix.title ? fix.title : 'Untitled fix'));
      var severity = String((fix && fix.severity) || 'low');
      var badge = __rnCreate('span', 'rn-severity', severity);
      badge.setAttribute('data-severity', severity);
      item.appendChild(badge);
      fixContainer.appendChild(item);
    });
  }

  if (breakingContainer) {
    breakingChanges.forEach(function(change) {
      var item = __rnCreate('article', 'rn-breaking-item');
      item.appendChild(__rnCreate('span', 'rn-breaking-accent'));
      item.appendChild(__rnCreate('h3', 'rn-breaking-title', change && change.title ? change.title : 'Breaking change'));
      item.appendChild(__rnCreate('p', 'rn-breaking-mitigation', change && change.mitigation ? change.mitigation : ''));
      breakingContainer.appendChild(item);
    });
  }

  if (linkContainer) {
    links.forEach(function(link) {
      var anchor = __rnCreate('a', 'rn-link-pill', link && link.label ? link.label : 'Link');
      anchor.href = link && link.url ? link.url : '#';
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      linkContainer.appendChild(anchor);
    });
  }

  if (tickerTrack) {
    var tickerItems = [];
    tickerItems.push({ type: 'meta', text: __rnRoot.querySelector('.rn-ribbon-version') ? __rnRoot.querySelector('.rn-ribbon-version').textContent : '' });
    var channelNode = __rnRoot.querySelector('.rn-meta-pill[data-channel]');
    if (channelNode && channelNode.textContent.trim()) {
      tickerItems.push({ type: 'meta', text: channelNode.textContent.trim() });
    }
    var dateNode = __rnRoot.querySelector('.rn-ribbon-date');
    tickerItems.push({ type: 'meta', text: dateNode ? dateNode.textContent.trim() : '' });
    fixes.forEach(function(fix) { tickerItems.push({ type: 'fix', text: fix && fix.title ? fix.title : '' }); });
    breakingChanges.forEach(function(change) { tickerItems.push({ type: 'breaking', text: change && change.title ? change.title : '' }); });
    links.forEach(function(link) { tickerItems.push({ type: 'link', text: link && link.label ? link.label : '' }); });

    tickerItems.concat(tickerItems).forEach(function(item) {
      if (!item.text) return;
      var chip = __rnCreate('span', 'rn-ticker-item', item.text);
      chip.setAttribute('data-type', item.type);
      tickerTrack.appendChild(chip);
    });
  }

  return {
    theme: __rnRoot.getAttribute('data-theme-variant') || 'cards',
    featureCards: Array.prototype.slice.call(__rnRoot.querySelectorAll('.rn-feature-card[data-priority="high"]'))
      .concat(Array.prototype.slice.call(__rnRoot.querySelectorAll('.rn-feature-card[data-priority="normal"]'))),
    fixItems: Array.prototype.slice.call(__rnRoot.querySelectorAll('.rn-fix-item')),
    breakingItems: Array.prototype.slice.call(__rnRoot.querySelectorAll('.rn-breaking-item')),
    breakingAccents: Array.prototype.slice.call(__rnRoot.querySelectorAll('.rn-breaking-accent')),
    linkPills: Array.prototype.slice.call(__rnRoot.querySelectorAll('.rn-link-pill')),
    sections: Array.prototype.slice.call(__rnRoot.querySelectorAll('.rn-section')).filter(function(section) {
      return section.style.display !== 'none';
    }),
    tickerTrack: tickerTrack,
    footerCards: __rnRoot.querySelector('.rn-footer-cards'),
    footerTicker: __rnRoot.querySelector('.rn-footer-ticker'),
    fixCounterValue: __rnRoot.querySelector('.rn-fix-counter-value')
  };
}

var __rnState = __rnInit();
if (!__rnState) { return; }

var __rnSectionBase = SCENE_START + 0.72;

master.fromTo(__rnScope + '.rn-ribbon',
  { opacity: 0, y: -64 },
  { opacity: 1, y: 0, duration: 0.62, ease: 'power3.out' },
  SCENE_START + 0.08);

master.fromTo(__rnScope + '.rn-header',
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.54, ease: 'power2.out' },
  SCENE_START + 0.22);

__rnState.sections.forEach(function(section, i) {
  master.fromTo(section,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.48, ease: 'power2.out' },
    __rnSectionBase + i * 0.12);
});

__rnState.featureCards.forEach(function(card, i) {
  master.fromTo(card,
    { opacity: 0, y: 26, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.44, ease: 'power2.out' },
    SCENE_START + 0.96 + i * 0.12);
});

__rnState.fixItems.forEach(function(item, i) {
  master.fromTo(item,
    { opacity: 0, x: -18 },
    { opacity: 1, x: 0, duration: 0.34, ease: 'power2.out' },
    SCENE_START + 1.08 + i * 0.1);
});

if (__rnState.fixCounterValue) {
  master.call(function() {
    var target = __rnState.fixItems.length;
    var counter = { value: 0 };
    __rnState.fixCounterValue.textContent = '0';
    gsap.to(counter, {
      value: target,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: function() {
        __rnState.fixCounterValue.textContent = String(Math.round(counter.value));
      }
    });
  }, [], SCENE_START + 1.02);
}

__rnState.breakingItems.forEach(function(item, i) {
  master.fromTo(item,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' },
    SCENE_START + 1.14 + i * 0.14);
});

__rnState.breakingAccents.forEach(function(accent, i) {
  master.fromTo(accent,
    { scaleY: 0, transformOrigin: 'center top' },
    { scaleY: 1, duration: 0.34, ease: 'power2.out' },
    SCENE_START + 1.18 + i * 0.14);
});

__rnState.linkPills.forEach(function(link, i) {
  master.fromTo(link,
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
    SCENE_START + 1.22 + i * 0.08);
});

if (__rnState.theme === 'ticker' && __rnState.footerTicker) {
  master.fromTo(__rnState.footerTicker,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.36, ease: 'power2.out' },
    SCENE_START + 1.16);

  if (__rnState.tickerTrack) {
    master.fromTo(__rnState.tickerTrack,
      { xPercent: 0 },
      { xPercent: -50, duration: Math.max(6.4, SCENE_DURATION - 1.8), ease: 'none' },
      SCENE_START + 1.4);
  }
} else if (__rnState.footerCards) {
  master.fromTo(__rnState.footerCards,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.36, ease: 'power2.out' },
    SCENE_START + 1.28);
}

master.to(__rnScope + '.rn-root',
  { opacity: 0, duration: 0.42, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.42);
