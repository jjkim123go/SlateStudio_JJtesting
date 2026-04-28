/*
 * SlideRenderer
 * Purpose: Compose narrative slide layouts from inline props and animate them on Slate's master timeline.
 * Props consumed: layout, eyebrow, title, subtitle, bullets, image, imagePosition, leftContent, rightContent, quote, quoteAuthor, quoteRole, accent, theme, pageNumber, pageTotal
 */
if (typeof master?.paused === 'function' && !master.paused()) {
  master.pause();
}

const root = document.querySelector('.scene-' + SCENE_ID + ' .sr-root');
if (!root) {
  return;
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return String(value)
      .split(/\s*\|\|\s*|\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMarkdownLite(value) {
  return escapeHtml(value || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\r?\n/g, '<br />');
}

function createPanel(className) {
  const panel = document.createElement('div');
  panel.className = `sr-panel ${className || ''}`.trim();
  return panel;
}

function createImageFrame(src) {
  const frame = document.createElement('div');
  frame.className = 'sr-image-frame';
  if (!src) {
    frame.dataset.empty = 'true';
    return frame;
  }
  const image = document.createElement('img');
  image.className = 'sr-image';
  image.src = src;
  image.alt = '';
  frame.appendChild(image);
  return frame;
}

function buildBulletsPanel(items) {
  const panel = createPanel('sr-bullets-panel');
  const list = document.createElement('ul');
  list.className = 'sr-bullet-list';
  items.forEach((item) => {
    const bullet = document.createElement('li');
    bullet.className = 'sr-bullet';

    const dot = document.createElement('span');
    dot.className = 'sr-bullet-dot';

    const text = document.createElement('span');
    text.innerHTML = formatMarkdownLite(item);

    bullet.appendChild(dot);
    bullet.appendChild(text);
    list.appendChild(bullet);
  });
  panel.appendChild(list);
  return panel;
}

function buildCopyPanel(content, className) {
  const panel = createPanel(className);
  const copy = document.createElement('div');
  copy.className = 'sr-copy-block';
  copy.innerHTML = formatMarkdownLite(content);
  panel.appendChild(copy);
  return panel;
}

function buildQuoteLayout(quote, author, role) {
  const wrap = document.createElement('div');
  wrap.className = 'sr-quote-wrap';

  const card = document.createElement('div');
  card.className = 'sr-quote-card';

  const mark = document.createElement('div');
  mark.className = 'sr-quote-mark';
  mark.textContent = '“';

  const text = document.createElement('p');
  text.className = 'sr-quote-text';
  text.textContent = quote;

  const attribution = document.createElement('div');
  attribution.className = 'sr-quote-attribution';
  attribution.innerHTML = role ? `<strong>${escapeHtml(author || '')}</strong><br />${escapeHtml(role)}` : `<strong>${escapeHtml(author || '')}</strong>`;

  card.appendChild(mark);
  card.appendChild(text);
  if (author || role) card.appendChild(attribution);
  wrap.appendChild(card);
  return wrap;
}

function initializeSlide() {
  if (root.dataset.initialized === 'true') return;

  const layout = root.dataset.layout || 'title-bullets';
  const imagePosition = root.dataset.imagePosition || 'right';
  const bullets = parseJsonArray(root.dataset.bullets);
  const image = root.dataset.image || '';
  const leftContent = root.dataset.leftContent || '';
  const rightContent = root.dataset.rightContent || '';
  const quote = root.dataset.quote || root.dataset.quoteText || '';
  const quoteAuthor = root.dataset.quoteAuthor || root.dataset.quoteAttribution || '';
  const quoteRole = root.dataset.quoteRole || '';
  const accent = root.dataset.accent || '';
  const body = root.querySelector('.sr-body');
  const pageIndicator = root.querySelector('.sr-page-indicator');

  if (accent) {
    root.style.setProperty('--sr-accent', accent);
  }

  body.innerHTML = '';
  body.dataset.mode = 'single';

  if (layout === 'quote') {
    body.appendChild(buildQuoteLayout(quote, quoteAuthor, quoteRole));
  } else if (layout === 'title-only') {
    const spacer = createPanel('sr-copy-panel');
    spacer.style.display = 'flex';
    spacer.style.alignItems = 'center';
    spacer.style.justifyContent = 'center';
    spacer.innerHTML = '<div class="sr-copy-block" style="text-align:center;max-width:920px">Use this space for narration-led emphasis.</div>';
    body.appendChild(spacer);
  } else if (layout === 'title-image') {
    body.appendChild(createImageFrame(image));
  } else if (layout === 'title-bullets-image') {
    if (imagePosition === 'below') {
      body.dataset.mode = 'stacked';
      body.appendChild(buildBulletsPanel(bullets));
      body.appendChild(createImageFrame(image));
    } else if (imagePosition === 'left') {
      body.dataset.mode = 'split-left';
      body.appendChild(createImageFrame(image));
      body.appendChild(buildBulletsPanel(bullets));
    } else {
      body.dataset.mode = 'split';
      body.appendChild(buildBulletsPanel(bullets));
      body.appendChild(createImageFrame(image));
    }
  } else if (layout === 'two-column') {
    body.dataset.mode = 'split';
    body.appendChild(buildCopyPanel(leftContent, 'sr-left-panel'));
    body.appendChild(buildCopyPanel(rightContent, 'sr-right-panel'));
  } else {
    body.appendChild(buildBulletsPanel(bullets));
  }

  const pageNumber = root.dataset.pageNumber || '';
  const pageTotal = root.dataset.pageTotal || '';
  pageIndicator.textContent = pageNumber ? (pageTotal ? `${pageNumber} / ${pageTotal}` : pageNumber) : '';

  root.dataset.initialized = 'true';
}

initializeSlide();

const sceneSelector = '.scene-' + SCENE_ID;
const bulletCount = document.querySelectorAll(sceneSelector + ' .sr-bullet').length;
const copyBlockCount = document.querySelectorAll(sceneSelector + ' .sr-copy-block, ' + sceneSelector + ' .sr-quote-card').length;
const revealStagger = Math.min(0.15, Math.max(0.08, (SCENE_DURATION - 1.2) / Math.max(bulletCount || copyBlockCount || 1, 8)));
const introDuration = Math.min(0.72, Math.max(0.36, SCENE_DURATION * 0.16));
const mediaStart = SCENE_START + 0.52;

master.fromTo(sceneSelector + ' .sr-eyebrow',
  { autoAlpha: 0, y: 10 },
  { autoAlpha: 1, y: 0, duration: Math.max(0.22, introDuration * 0.6), ease: 'power2.out' },
  SCENE_START + 0.06);

master.fromTo(sceneSelector + ' .sr-title',
  { autoAlpha: 0, y: 30 },
  { autoAlpha: 1, y: 0, duration: introDuration, ease: 'power2.out' },
  SCENE_START + 0.16);

master.fromTo(sceneSelector + ' .sr-subtitle',
  { autoAlpha: 0, y: 18 },
  { autoAlpha: 1, y: 0, duration: Math.max(0.26, introDuration * 0.72), ease: 'power2.out' },
  SCENE_START + 0.3);

master.fromTo(sceneSelector + ' .sr-copy-block, ' + sceneSelector + ' .sr-quote-card',
  { autoAlpha: 0, y: 18 },
  { autoAlpha: 1, y: 0, duration: Math.min(0.58, Math.max(0.3, SCENE_DURATION * 0.14)), ease: 'power2.out', stagger: revealStagger },
  SCENE_START + 0.48);

master.fromTo(sceneSelector + ' .sr-bullet',
  { autoAlpha: 0, y: 16 },
  { autoAlpha: 1, y: 0, duration: Math.min(0.52, Math.max(0.28, SCENE_DURATION * 0.13)), ease: 'power2.out', stagger: 0.15 },
  SCENE_START + 0.46);

master.fromTo(sceneSelector + ' .sr-image-frame',
  { autoAlpha: 0, scale: 0.94, transformOrigin: '50% 50%' },
  { autoAlpha: 1, scale: 1, duration: Math.min(0.7, Math.max(0.34, SCENE_DURATION * 0.17)), ease: 'power2.out' },
  mediaStart);

master.fromTo(sceneSelector + ' .sr-page-indicator',
  { autoAlpha: 0, y: 12 },
  { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' },
  SCENE_START + Math.min(1.45, SCENE_DURATION * 0.62));

master.to(sceneSelector + ' .sr-surface',
  { autoAlpha: 0, y: -12, duration: Math.min(0.42, Math.max(0.26, SCENE_DURATION * 0.12)), ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - Math.min(0.42, Math.max(0.26, SCENE_DURATION * 0.12)));
