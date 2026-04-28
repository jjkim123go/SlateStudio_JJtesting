/**
 * FormsScene PROP_TRANSFORMER — Microsoft Forms chrome (home / gallery / builder / preview).
 *
 * Variants:
 *   variant: "home"     → "Welcome to Microsoft Forms!" lavender gradient + 4 scenario cards
 *            "gallery"  → Template gallery header + filter pills + search + grid of template cards
 *            "builder"  → Form-edit canvas: title bar with action buttons + hero + section + question
 *            "preview"  → Centered preview card on neutral bg with Computer/Mobile toggle
 *
 * State (independent):
 *   state:   "default"           → no overlay
 *            "more-solutions"    → side panel with "Assets in the solution" + "More solutions like this" (builder)
 *            "ai-reviewing"      → top "Reviewing your form details..." gradient banner (builder)
 *
 * Common chrome:
 *   - Suite bar (white, 48px) with waffle + "Forms" left, help+feedback+avatar right
 *     (hidden on `preview` per raw-04)
 *   - Yellow-tinted notification banner (40px) directly under suite bar (optional)
 *
 * Author-facing props:
 *   variant         : enum
 *   state           : enum
 *   accountInitial  : string                  // "I"
 *   showSuiteBar    : boolean (default true; force false to mimic preview)
 *   showBanner      : boolean (default true on home/gallery/builder, false on preview)
 *   bannerText      : string
 *
 *   // home
 *   welcomeTitle    : string                  // "Welcome to Microsoft Forms!"
 *   welcomeSubtitle : string
 *   scenarioPrompt  : string                  // "Choose a scenario..."
 *   scenarios       : Scenario[]              // up to 4
 *
 *   // gallery
 *   galleryTitle    : string                  // "Work seamlessly with advanced solutions"
 *   featurePills    : string[]                // ["Powerful Questions", ...]
 *   templateCards   : TemplateCard[]          // 5x3 grid
 *
 *   // builder
 *   formName        : string                  // "Employee satisfaction survey"
 *   savedLabel      : string                  // "Saved"
 *   actionButtons   : string[]                // primary toolbar (right side)
 *   heroImageBg     : string                  // CSS color/gradient OR url
 *   heroTitle       : string                  // "Employee satisfaction survey"
 *   heroSubtitle    : string                  // "You are invited!"
 *   sectionLabel    : string                  // "Section 1"
 *   formSection     : { title, question, options[] }
 *   sidePanel       : { assetsInSolution?, moreSolutions?: SolutionItem[] }
 *
 *   // preview
 *   activeDevice    : "Computer"|"Mobile"
 *   previewTitle    : string
 *   previewSubtitle : string
 *   previewCtaLabel : string                  // "Start now"
 *
 * Scenario     = { title, accentColor, illustration?: "workflow"|"registration"|"research"|"quiz" }
 * TemplateCard = { title, image?: string }    // image = CSS color or url
 * SolutionItem = { title, image? }
 *
 * Slots emitted (referenced as `{{{slotName}}}` in index.html):
 *   suiteBarHtml, bannerHtml, bodyHtml, sidePanelHtml
 */

const VALID_VARIANTS = new Set(['home', 'gallery', 'builder', 'preview']);
const VALID_STATES = new Set(['default', 'more-solutions', 'ai-reviewing']);
const VALID_DEVICES = new Set(['Computer', 'Mobile']);

const FORMS_BRAND = '#7719AA'; // Forms purple (header pill / accents)

const ICON_PATHS = {
  waffle:    'M3 3h3v3H3V3Zm0 4.5h3v3H3v-3ZM3 12h3v3H3v-3Zm4.5-9h3v3h-3V3Zm0 4.5h3v3h-3v-3Zm0 4.5h3v3h-3v-3ZM12 3h3v3h-3V3Zm0 4.5h3v3h-3v-3ZM12 12h3v3h-3v-3Z',
  formsLogo: 'M2 3a1 1 0 0 1 1-1h7l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Zm2 4h6V5H4v2Zm0 3h6V8H4v2Zm0 3h6v-2H4v2Z',
  help:      'M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm0-8a3 3 0 0 0-3 3 1 1 0 0 0 2 0 1 1 0 1 1 1 1 1 0 0 0 0 2Z',
  feedback:  'M3 3h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7l-3 3v-3H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
  back:      'M9.78 3.97 5.75 8l4.03 4.03a.75.75 0 1 1-1.06 1.06l-4.56-4.56a.75.75 0 0 1 0-1.06l4.56-4.56a.75.75 0 1 1 1.06 1.06Z',
  search:    'M11 6.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-1.4 4.16a6 6 0 1 1 1.06-1.06l3.87 3.87a.75.75 0 1 1-1.06 1.06l-3.87-3.87Z',
  caret:     'M3.22 5.97a.75.75 0 0 1 1.06 0L8 9.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.03a.75.75 0 0 1 0-1.06Z',
  computer:  'M2 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9v1h2a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h2v-1H3a1 1 0 0 1-1-1V4Zm1 0v6h10V4H3Z',
  mobile:    'M5 2.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 11 2.5v11A1.5 1.5 0 0 1 9.5 15h-3A1.5 1.5 0 0 1 5 13.5v-11ZM6.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-3Z',
  pause:     'M5 4h2v8H5V4Zm4 0h2v8H9V4Z',
  shield:    'M8 1.5 3 3v4.5C3 11 5.2 13.7 8 14.5 10.8 13.7 13 11 13 7.5V3L8 1.5Z',
  more:      'M3 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z',
  close:     'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z',
  copilot:   'M8 2 9.5 6.5 14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5L8 2Z',
  info:      'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 7a.75.75 0 0 1 1.5 0v4a.75.75 0 0 1-1.5 0V7Zm.75-2.5a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z',
};

function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeColor(v, fallback = '#0078D4') {
  if (typeof v !== 'string') return fallback;
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\([^)<>"']+\)$/.test(v)) return v;
  if (/^var\(--[a-zA-Z0-9_-]+\)$/.test(v)) return v;
  if (/^[a-zA-Z]+$/.test(v)) return v;
  return fallback;
}

function safeUrl(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/['"();<>\\]/g, '').trim();
}

function safeGradient(v, fallback = '') {
  if (typeof v !== 'string') return fallback;
  return /^(linear|radial|conic)-gradient\([^<>"';]+\)$/.test(v) ? v : fallback;
}

function safeBackground(v, fallback) {
  if (typeof v !== 'string') return fallback;
  const trimmed = v.trim();
  const gradient = safeGradient(trimmed);
  if (gradient) return gradient;
  const color = safeColor(trimmed, '');
  if (color) return color;
  const urlValue = trimmed.startsWith('url(') && trimmed.endsWith(')')
    ? trimmed.slice(4, -1).trim().replace(/^['"]|['"]$/g, '')
    : trimmed;
  const sanitizedUrl = safeUrl(urlValue);
  return sanitizedUrl ? `url('${sanitizedUrl}') center/cover` : fallback;
}

function svg(pathKey, cls = 'fs-icon', vb = '0 0 16 16') {
  const d = ICON_PATHS[pathKey];
  if (!d) return '';
  return `<svg class="${cls}" viewBox="${vb}" aria-hidden="true"><path d="${d}"/></svg>`;
}

function avatarHtml(initial, color = '#5B5FC7') {
  return `<div class="fs-avatar" style="background:${color};">${escapeHtml(initial || 'A')}</div>`;
}

// ---------- Suite bar + banner ----------
function renderSuiteBar(props) {
  if (props.showSuiteBar === false) return '';
  return `
    <div class="fs-suite">
      <button class="fs-suite-waffle" aria-label="App launcher">${svg('waffle', 'fs-icon-16')}</button>
      <div class="fs-suite-brand">
        <div class="fs-suite-logo">${svg('formsLogo', 'fs-icon-16')}</div>
        <span class="fs-suite-title">Forms</span>
      </div>
      <div class="fs-suite-flex"></div>
      <button class="fs-suite-icon" aria-label="Help">${svg('help', 'fs-icon-16')}</button>
      <button class="fs-suite-icon" aria-label="Feedback">${svg('feedback', 'fs-icon-16')}</button>
      ${avatarHtml(props.accountInitial)}
    </div>
  `;
}

function renderBanner(props) {
  if (props.showBanner === false) return '';
  if (props.variant === 'preview') return '';
  const text = props.bannerText
    || 'Forms will soon have a new URL: forms.cloud.microsoft. Same app, better security.';
  return `
    <div class="fs-banner">
      ${svg('info', 'fs-icon-16 fs-banner-info')}
      <span class="fs-banner-text">${escapeHtml(text)}</span>
      <a class="fs-banner-link" href="#">Learn more</a>
      <div class="fs-banner-flex"></div>
      <button class="fs-banner-close" aria-label="Dismiss">${svg('close', 'fs-icon-12')}</button>
    </div>
  `;
}

// ---------- Variant: home ----------
const SCENARIO_GRADIENTS = {
  workflow:     'linear-gradient(160deg,#5B5FC7 0%,#7E5FE4 100%)',
  registration: 'linear-gradient(160deg,#E89465 0%,#D87037 100%)',
  research:     'linear-gradient(160deg,#3B5BA5 0%,#3F7BCB 100%)',
  quiz:         'linear-gradient(160deg,#E25E9A 0%,#D44C95 100%)',
};

function renderScenarioCard(scenario) {
  const gradient = SCENARIO_GRADIENTS[scenario.illustration]
    || safeColor(scenario.accentColor, '')
    || SCENARIO_GRADIENTS.workflow;
  const subtitle = scenario.subtitle || '';
  const blurb = subtitle
    ? `<div class="fs-scenario-blurb">${escapeHtml(subtitle)}</div>`
    : '';
  // Generic illustration mock (white card stacks at bottom)
  const mock = `
    <div class="fs-scenario-mock">
      <div class="fs-scenario-mock-card"></div>
      <div class="fs-scenario-mock-card fs-scenario-mock-card-back"></div>
    </div>
  `;
  return `
    <div class="fs-scenario" style="background:${gradient};">
      <div class="fs-scenario-title">${escapeHtml(scenario.title)}</div>
      ${blurb}
      ${mock}
    </div>
  `;
}

function renderHomeBody(props) {
  const scenarios = (props.scenarios && props.scenarios.length)
    ? props.scenarios
    : [
        { title: 'Workflow Solution', illustration: 'workflow',
          subtitle: 'Streamline your work flow: collect info, send reminders, view summaries. All set!' },
        { title: 'Registration', illustration: 'registration' },
        { title: 'Research', illustration: 'research' },
        { title: 'Quiz', illustration: 'quiz' },
      ];
  const cards = scenarios.slice(0, 4).map(renderScenarioCard).join('');
  return `
    <div class="fs-home">
      <div class="fs-home-logo">${svg('formsLogo', 'fs-icon-32')}</div>
      <div class="fs-home-center">
        <h1 class="fs-home-title">${escapeHtml(props.welcomeTitle || 'Welcome to Microsoft Forms!')}</h1>
        <div class="fs-home-subtitle">${escapeHtml(props.welcomeSubtitle || 'Collect better data and make better decisions.')}</div>
        <div class="fs-home-prompt">${escapeHtml(props.scenarioPrompt || 'Choose a scenario and start with well-crafted templates.')}</div>
        <div class="fs-home-grid">${cards}</div>
      </div>
    </div>
  `;
}

// ---------- Variant: gallery ----------
function renderTemplateCard(card) {
  const bgStyle = safeBackground(
    card.image,
    'linear-gradient(135deg,#A8B8E8 0%,#C8B8E8 100%)',
  );
  return `
    <div class="fs-tmpl">
      <div class="fs-tmpl-img" style="background:${bgStyle};"></div>
      <div class="fs-tmpl-title">${escapeHtml(card.title)}</div>
    </div>
  `;
}

function renderGalleryBody(props) {
  const pills = (props.featurePills && props.featurePills.length)
    ? props.featurePills
    : ['Powerful Questions', 'Flexible Settings', 'Targeted Reminders', 'Instant Results'];
  const pillsHtml = pills.map((p) => `<span class="fs-pill">&#x2728; ${escapeHtml(p)}</span>`).join('');
  const cards = (props.templateCards || []).slice(0, 15).map(renderTemplateCard).join('');
  return `
    <div class="fs-gallery">
      <div class="fs-gallery-header">
        <button class="fs-gallery-back" aria-label="Back">${svg('back', 'fs-icon-16')}</button>
        <span class="fs-gallery-back-label">Template gallery</span>
        <div class="fs-gallery-flex"></div>
        <div class="fs-gallery-headline">
          <span class="fs-gallery-title">${escapeHtml(props.galleryTitle || 'Work seamlessly with advanced solutions')}</span>
          <span class="fs-gallery-preview">Preview</span>
        </div>
        <div class="fs-gallery-flex"></div>
      </div>
      <div class="fs-gallery-controls">
        <div class="fs-gallery-pills">${pillsHtml}</div>
        <div class="fs-gallery-search">
          <button class="fs-gallery-filter">All ${svg('caret', 'fs-icon-12 fs-search-caret', '0 0 16 16')}</button>
          <span class="fs-gallery-search-input">Search solutions</span>
          <button class="fs-gallery-search-btn">${svg('search', 'fs-icon-16')}</button>
        </div>
      </div>
      <div class="fs-gallery-grid">${cards}</div>
    </div>
  `;
}

// ---------- Variant: builder ----------
function renderBuilderBody(props) {
  const formName = props.formName || 'Untitled form';
  const saved = props.savedLabel || 'Saved';
  const buttons = (props.actionButtons && props.actionButtons.length)
    ? props.actionButtons
    : ['Style', 'Settings', 'Preview', 'Collect responses', 'View responses', 'Present'];
  const btnHtml = buttons.map((b, i) => {
    const primary = b === 'Collect responses' ? 'fs-btn-primary' : '';
    return `<button class="fs-btn ${primary}">${escapeHtml(b)}</button>`;
  }).join('');

  const heroBg = safeBackground(
    props.heroImageBg,
    'linear-gradient(135deg,#E8C8A8 0%,#D8B898 100%)',
  );
  const heroTitle = props.heroTitle || formName;
  const heroSubtitle = props.heroSubtitle || 'You are invited!';

  const aiBanner = props.state === 'ai-reviewing' ? `
    <div class="fs-ai-banner">
      ${svg('copilot', 'fs-icon-16 fs-ai-icon')}
      <span class="fs-ai-text">Reviewing your form details...</span>
    </div>
  ` : '';

  const section = props.formSection || {
    title: 'Profile',
    question: 'What is your role?',
    options: ['Individual contributor', 'Team lead', 'Manager', 'Senior executive'],
  };
  const optsHtml = (section.options || []).map((opt) => `
    <div class="fs-opt">
      <span class="fs-opt-radio"></span>
      <span class="fs-opt-text">${escapeHtml(opt)}</span>
    </div>
  `).join('');

  return `
    <div class="fs-builder">
      <div class="fs-builder-titlebar">
        <div class="fs-builder-flex"></div>
        <span class="fs-builder-name">${escapeHtml(formName)}</span>
        <span class="fs-builder-saved-dot">·</span>
        <span class="fs-builder-saved">${escapeHtml(saved)}</span>
        <div class="fs-builder-flex"></div>
      </div>
      <div class="fs-builder-toolbar">
        <div class="fs-builder-flex"></div>
        ${btnHtml}
      </div>
      <div class="fs-builder-canvas">
        ${aiBanner}
        <div class="fs-hero" style="background:${heroBg};">
          <div class="fs-hero-card">
            <div class="fs-hero-title">${escapeHtml(heroTitle)}</div>
            <div class="fs-hero-spacer"></div>
            <div class="fs-hero-sub">${escapeHtml(heroSubtitle)}</div>
          </div>
        </div>
        <div class="fs-section">
          <div class="fs-section-header">
            <span class="fs-section-label">${escapeHtml(props.sectionLabel || 'Section 1')}</span>
            <div class="fs-builder-flex"></div>
            ${svg('more', 'fs-icon-16 fs-section-more')}
          </div>
          <div class="fs-section-body">
            <div class="fs-section-title">${escapeHtml(section.title || '')}</div>
            <div class="fs-q">
              <div class="fs-q-prompt">1. ${escapeHtml(section.question || '')} <span class="fs-q-req">*</span></div>
              <div class="fs-q-opts">${optsHtml}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSidePanel(props) {
  if (props.state !== 'more-solutions') return '';
  const panel = props.sidePanel || {};
  const more = (panel.moreSolutions && panel.moreSolutions.length)
    ? panel.moreSolutions
    : [
        { title: 'Evaluate job satisfaction and engagement' },
        { title: 'Pre-Sales Inquiry Satisfaction Survey' },
        { title: 'Gathering Feedback on Work-Life Flexibility' },
        { title: 'Assess IT Service Satisfaction' },
        { title: 'Evaluate Customer Satisfaction' },
        { title: 'Review Training Quality and Effectiveness' },
        { title: 'Get feedback on manager support' },
        { title: 'Analyze Vehicle Owner Satisfaction' },
      ];
  const items = more.map((item) => {
    const bg = safeBackground(
      item.image,
      'linear-gradient(135deg,#A8B8E8 0%,#C8B8E8 100%)',
    );
    return `
      <div class="fs-side-item">
        <div class="fs-side-thumb" style="background:${bg};"></div>
        <div class="fs-side-title">${escapeHtml(item.title)}</div>
      </div>
    `;
  }).join('');
  return `
    <aside class="fs-side">
      <button class="fs-side-close" aria-label="Close">${svg('close', 'fs-icon-12')}</button>
      <div class="fs-side-section-head">
        <span>Assets in the solution</span>
        <svg class="fs-icon-12 fs-side-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6 L8 10 L12 6 L11 5 L8 8 L5 5 Z" fill="currentColor"/></svg>
      </div>
      <div class="fs-side-section-head">
        <span>More solutions like this</span>
        <svg class="fs-icon-12 fs-side-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6 L8 10 L12 6 L11 5 L8 8 L5 5 Z" fill="currentColor"/></svg>
      </div>
      <div class="fs-side-grid">${items}</div>
    </aside>
  `;
}

// ---------- Variant: preview ----------
function renderPreviewBody(props) {
  const active = VALID_DEVICES.has(props.activeDevice) ? props.activeDevice : 'Computer';
  const heroBg = safeBackground(
    props.heroImageBg,
    'linear-gradient(135deg,#E8C8A8 0%,#D8B898 100%)',
  );
  const heroTitle = props.previewTitle || props.formName || 'Untitled form';
  const heroSub = props.previewSubtitle || 'You are invited!';
  const cta = props.previewCtaLabel || 'Start now';
  return `
    <div class="fs-preview">
      <div class="fs-preview-topbar">
        <div class="fs-preview-flex"></div>
        <button class="fs-preview-back">${svg('back', 'fs-icon-12')} Back</button>
        <div class="fs-preview-flex"></div>
        <button class="fs-device ${active === 'Computer' ? 'fs-device-on' : ''}">${svg('computer','fs-icon-12')} Computer</button>
        <button class="fs-device ${active === 'Mobile' ? 'fs-device-on' : ''}">${svg('mobile','fs-icon-12')} Mobile</button>
      </div>
      <div class="fs-preview-stage">
        <button class="fs-preview-pause">${svg('pause', 'fs-icon-12')}</button>
        <div class="fs-preview-frame" style="background:${heroBg};">
          <div class="fs-preview-actions">
            <button class="fs-preview-shield">${svg('shield', 'fs-icon-12')}</button>
            <button class="fs-preview-more">${svg('more', 'fs-icon-12')}</button>
          </div>
          <div class="fs-preview-card">
            <div class="fs-preview-title">${escapeHtml(heroTitle)}</div>
            <div class="fs-preview-spacer"></div>
            <div class="fs-preview-sub">${escapeHtml(heroSub)}</div>
            <button class="fs-preview-cta">${escapeHtml(cta)}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------- Entry ----------
export function transformFormsScene(props) {
  if (!props || typeof props !== 'object') {
    throw new Error('FormsScene: props is required');
  }
  const variant = VALID_VARIANTS.has(props.variant) ? props.variant : 'home';
  const state = VALID_STATES.has(props.state) ? props.state : 'default';

  // mutate normalized values back so animation.js + JSON island see them
  props.variant = variant;
  props.state = state;
  props.hasSidePanel = state === 'more-solutions';
  props.dataSide = props.hasSidePanel ? '1' : '0';

  let bodyHtml;
  switch (variant) {
    case 'gallery': bodyHtml = renderGalleryBody(props); break;
    case 'builder': bodyHtml = renderBuilderBody(props); break;
    case 'preview': bodyHtml = renderPreviewBody(props); break;
    case 'home':
    default:        bodyHtml = renderHomeBody(props); break;
  }

  // preview has its own minimal chrome; override defaults
  if (variant === 'preview') {
    props.showSuiteBar = false;
    props.showBanner = false;
  }

  // Render slots BEFORE we stringify showBanner for the data-attribute
  props.suiteBarHtml = renderSuiteBar(props);
  props.bannerHtml = renderBanner(props);
  props.bodyHtml = bodyHtml;
  props.sidePanelHtml = renderSidePanel(props);

  // Normalize for [data-show-banner] attribute on the root (string "0"/"1")
  const bannerVisible = props.showBanner !== false && variant !== 'preview';
  props.showBanner = bannerVisible ? '1' : '0';

  return props;
}

export const __test__ = {
  VALID_VARIANTS, VALID_STATES, VALID_DEVICES,
  renderSuiteBar, renderBanner,
  renderHomeBody, renderGalleryBody, renderBuilderBody, renderPreviewBody,
  renderSidePanel,
};
