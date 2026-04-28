// BookingsScene — Wave A chrome shell (PR 8c — Productivity Surfaces)
// Models the modern Microsoft Bookings web chrome.
//
// Reference: output/pr8c-references/bookings/raw-01-homepage-clean.png
//   (raw-02 is identical to raw-01; only one ground-truth reference for home.)
//   public-page variant winged from public Bookings knowledge (booking page picker).
//
// =============================================================================
// PROP SCHEMA (BookingsScene)
// =============================================================================
//
// Required:
//   variant         : 'home' | 'public-page'
//
// Optional (top-level):
//   state           : 'default' | 'create-modal'      default 'default'
//   accountInitial  : string                          default 'A'
//   showSuiteBar    : boolean                         default true
//   pageTitle       : string                          default 'Bookings'
//
// home variant:
//   welcomeName       : string                       default 'there'
//   welcomeSubtitle   : string                       default 'Work smarter with Bookings...'
//   getStartedLabel   : string                       default '0/3 Get Started'
//   personalTitle     : string                       default 'Personal booking page'
//   personalSubtitle  : string                       default 'Easily share your availability...'
//   meetingCards      : MeetingCard[]                default 2 sample cards
//   sharedTitle       : string                       default 'Shared booking pages'
//   sharedSubtitle    : string                       default 'Invite your team...'
//   sharedCards       : SharedCard[]                 default []  (renders the empty Create card)
//
//   MeetingCard {
//     title       : string                  e.g. '15 minutes meeting'
//     description : string                  long blurb shown beneath title
//     duration    : string                  e.g. '15 min'
//     visibility  : string                  default 'Public'
//     iconColor   : string                  hex; default '#0078D4'
//   }
//
//   SharedCard {
//     title  : string
//     icon   : string  (single-letter or short label inside the icon)
//   }
//
// public-page variant:
//   orgName       : string                  default 'Contoso'
//   serviceTitle  : string                  default '30 minutes meeting'
//   serviceBlurb  : string                  default short description
//   monthLabel    : string                  default 'November 2026'
//   selectedDate  : string                  default 'Tue, Nov 17'
//   timeSlots     : string[]                default 5 sample slot times
//   selectedSlot  : string                  default '10:00 AM'
//
// create-modal state (only meaningful on home):
//   modalTitle  : string                    default 'Create meeting type'
//
// =============================================================================
// SLOT OUTPUTS
// =============================================================================
//   suiteBarHtml, bodyHtml, modalHtml
//

const VALID_VARIANTS = new Set(['home', 'public-page']);
const VALID_STATES   = new Set(['default', 'create-modal']);

const ICON_PATHS = {
  waffle:    'M2 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM2 9a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM2 14a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z',
  bell:      'M8 1.5A4.5 4.5 0 0 0 3.5 6v2.6L2 11.5h12L12.5 8.6V6A4.5 4.5 0 0 0 8 1.5Zm-1.5 11a1.5 1.5 0 0 0 3 0h-3Z',
  gear:      'M8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm6.4 2.5-1.4-.3a5.06 5.06 0 0 0-.5-1.2l.8-1.2-1.6-1.6-1.2.8a5.06 5.06 0 0 0-1.2-.5L9 1.6H7l-.3 1.4a5.06 5.06 0 0 0-1.2.5l-1.2-.8-1.6 1.6.8 1.2a5.06 5.06 0 0 0-.5 1.2l-1.4.3v2l1.4.3a5.06 5.06 0 0 0 .5 1.2l-.8 1.2 1.6 1.6 1.2-.8c.4.2.8.4 1.2.5L7 14.4h2l.3-1.4a5.06 5.06 0 0 0 1.2-.5l1.2.8 1.6-1.6-.8-1.2c.2-.4.4-.8.5-1.2l1.4-.3v-2Z',
  help:      'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 11a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75ZM9 9.2v.55a.5.5 0 0 1-1 0v-.96c0-.4.18-.78.5-1.04l1-.84a1 1 0 0 0-1.32-1.5L7.85 5.4a.5.5 0 1 1-.7-.71l.32-.32a2 2 0 0 1 2.65 3l-1 .83Z',
  smile:     'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-2 5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm4 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM5.4 9.7a.5.5 0 0 1 .7 0 2.7 2.7 0 0 0 3.8 0 .5.5 0 0 1 .7.7 3.7 3.7 0 0 1-5.2 0 .5.5 0 0 1 0-.7Z',
  share:     'M11 1.5a2.5 2.5 0 1 1-1.6 4.4L6.4 7.4a2.49 2.49 0 0 1 0 1.2l3 1.5a2.5 2.5 0 1 1-.45.9l-3-1.5a2.5 2.5 0 1 1 0-3l3-1.5A2.5 2.5 0 0 1 11 1.5Z',
  more:      'M3 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm4.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM12 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z',
  copyLink:  'M5.5 5.5h2v1h-2a1.5 1.5 0 0 0 0 3h2v1h-2a2.5 2.5 0 0 1 0-5Zm5 0h-2v1h2a1.5 1.5 0 0 1 0 3h-2v1h2a2.5 2.5 0 0 0 0-5ZM6 7.5h4v1H6v-1Z',
  plus:      'M8 2a.5.5 0 0 1 .5.5V7.5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z',
  chevDown:  'M3.22 5.97a.75.75 0 0 1 1.06 0L8 9.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.03a.75.75 0 0 1 0-1.06Z',
  chevLeft:  'M10.03 3.47a.75.75 0 0 1 0 1.06L6.56 8l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z',
  chevRight: 'M5.97 3.47a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 1 1-1.06-1.06L9.44 8 5.97 4.53a.75.75 0 0 1 0-1.06Z',
  search:    'M6.5 1.5a5 5 0 1 0 3.4 8.6l3 3 .7-.7-3-3a5 5 0 0 0-4.1-7.9Zm0 1a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  calendar:  'M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v1h10V4a1 1 0 0 0-1-1H4Zm9 3H3v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6Z',
  close:     'M4.7 4 8 7.3 11.3 4l.7.7L8.7 8l3.3 3.3-.7.7L8 8.7l-3.3 3.3-.7-.7L7.3 8 4 4.7 4.7 4Z',
  clock:     'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.5 6.7V4a.5.5 0 0 0-1 0v4.5l3 1.8.5-.86L8.5 8.2Z'
};

// ----- helpers -----
function escapeHtml(value) {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function svg(path, klass) {
  return `<svg class="${klass}" viewBox="0 0 16 16" aria-hidden="true"><path d="${path}"/></svg>`;
}

function avatarHtml(initial) {
  return `<div class="bs-avatar" style="background:#7B6CD9">${escapeHtml(initial || 'A')}</div>`;
}

// ----- common chrome -----
function renderSuiteBar(props) {
  if (props.showSuiteBar === false) return '';
  const title = escapeHtml(props.pageTitle || 'Bookings');
  return `<div class="bs-suite">
    <button class="bs-suite-waffle" aria-label="App launcher">${svg(ICON_PATHS.waffle, 'bs-icon-16')}</button>
    <span class="bs-suite-title">${title}</span>
    <span class="bs-suite-flex"></span>
    <button class="bs-suite-icon" aria-label="Notifications"><span class="bs-bell-wrap">${svg(ICON_PATHS.bell, 'bs-icon-16')}<span class="bs-bell-dot">5</span></span></button>
    <button class="bs-suite-icon" aria-label="Settings">${svg(ICON_PATHS.gear, 'bs-icon-16')}</button>
    <button class="bs-suite-icon" aria-label="Help">${svg(ICON_PATHS.help, 'bs-icon-16')}</button>
    <button class="bs-suite-icon" aria-label="Feedback">${svg(ICON_PATHS.smile, 'bs-icon-16')}</button>
    ${avatarHtml(props.accountInitial)}
  </div>`;
}

// ----- HOME variant -----
function renderMeetingCard(card) {
  return `<div class="bs-card">
    <div class="bs-card-head">
      <span class="bs-card-icon" style="color:${escapeHtml(card.iconColor || '#0078D4')}">${svg(ICON_PATHS.calendar, 'bs-icon-16')}</span>
      <span class="bs-card-title">${escapeHtml(card.title || 'Meeting')}</span>
      <span class="bs-card-flex"></span>
      <button class="bs-card-mini" aria-label="Share">${svg(ICON_PATHS.share, 'bs-icon-16')}</button>
      <button class="bs-card-mini" aria-label="More">${svg(ICON_PATHS.more, 'bs-icon-16')}</button>
    </div>
    <div class="bs-card-blurb">${escapeHtml(card.description || '')}</div>
    <div class="bs-card-pills">
      <span class="bs-pill bs-pill-vis">${escapeHtml(card.visibility || 'Public')}</span>
      <span class="bs-pill bs-pill-dur">${escapeHtml(card.duration || '15 min')}</span>
    </div>
  </div>`;
}

function renderEmptyCreateCard(label) {
  return `<div class="bs-card bs-card-empty">
    <div class="bs-create-icon">${svg(ICON_PATHS.calendar, 'bs-icon-32')}<span class="bs-create-plus">${svg(ICON_PATHS.plus, 'bs-icon-16')}</span></div>
    <div class="bs-create-label">${escapeHtml(label || 'Create')}</div>
  </div>`;
}

function renderHomeBody(props) {
  const welcomeName = props.welcomeName || 'there';
  const subtitle = props.welcomeSubtitle || 'Work smarter with Bookings and skip the back and forth.';
  const getStarted = props.getStartedLabel || '0/3 Get Started';

  const personalTitle = props.personalTitle || 'Personal booking page';
  const personalSubtitle = props.personalSubtitle || 'Easily share your availability with your own booking page.';
  const meetingCards = (props.meetingCards && props.meetingCards.length)
    ? props.meetingCards
    : [
        { title: '15 minutes meeting', description: 'Happy to connect. Feel free to book time with me so we can delve into any subject of your choice.', visibility: 'Public', duration: '15 min', iconColor: '#0078D4' },
        { title: '30 minutes meeting', description: 'Book time with me to discuss needs, explore solutions and collaborate efficiently.',                visibility: 'Public', duration: '30 min', iconColor: '#C50F1F' }
      ];
  const meetingHtml = meetingCards.map(renderMeetingCard).join('') + renderEmptyCreateCard('Create meeting type');

  const sharedTitle = props.sharedTitle || 'Shared booking pages';
  const sharedSubtitle = props.sharedSubtitle || 'Invite your team and get people to book time with you and your team.';
  const sharedCards = props.sharedCards || [];
  const sharedHtml = sharedCards.map(renderMeetingCard).join('') + renderEmptyCreateCard('Create booking page');

  return `<div class="bs-home">
    <header class="bs-home-header">
      <h1 class="bs-home-welcome">Welcome ${escapeHtml(welcomeName)}</h1>
      <div class="bs-home-subtitle">${escapeHtml(subtitle)}</div>
      <button class="bs-home-getstarted">${escapeHtml(getStarted)}</button>
    </header>

    <section class="bs-section bs-section-personal">
      <div class="bs-section-head">
        <div class="bs-section-titles">
          <h2 class="bs-section-title">${escapeHtml(personalTitle)} <span class="bs-section-copy" aria-label="Copy link">${svg(ICON_PATHS.copyLink, 'bs-icon-16')}</span></h2>
          <div class="bs-section-subtitle">${escapeHtml(personalSubtitle)}</div>
        </div>
        <div class="bs-section-actions">
          <button class="bs-action"><span class="bs-action-icon">${svg(ICON_PATHS.plus, 'bs-icon-16')}</span>Create meeting type</button>
          <button class="bs-action"><span class="bs-action-icon">${svg(ICON_PATHS.share, 'bs-icon-16')}</span>Share <span class="bs-action-caret">${svg(ICON_PATHS.chevDown, 'bs-icon-12')}</span></button>
          <button class="bs-action bs-action-icon-only" aria-label="More">${svg(ICON_PATHS.more, 'bs-icon-16')}</button>
        </div>
      </div>
      <div class="bs-card-grid">${meetingHtml}</div>
    </section>

    <section class="bs-section bs-section-shared">
      <div class="bs-section-head">
        <div class="bs-section-titles">
          <h2 class="bs-section-title">${escapeHtml(sharedTitle)}</h2>
          <div class="bs-section-subtitle">${escapeHtml(sharedSubtitle)}</div>
        </div>
        <div class="bs-section-actions">
          <button class="bs-action"><span class="bs-action-icon">${svg(ICON_PATHS.plus, 'bs-icon-16')}</span>Create booking page</button>
          <button class="bs-action"><span class="bs-action-icon">${svg(ICON_PATHS.search, 'bs-icon-16')}</span>Search</button>
        </div>
      </div>
      <div class="bs-card-grid">${sharedHtml}</div>
    </section>
  </div>`;
}

// ----- PUBLIC-PAGE variant -----
function renderPublicPageBody(props) {
  const orgName = props.orgName || 'Contoso';
  const serviceTitle = props.serviceTitle || '30 minutes meeting';
  const serviceBlurb = props.serviceBlurb || 'Book time with me to discuss needs, explore solutions and collaborate efficiently.';
  const monthLabel = props.monthLabel || 'November 2026';
  const selectedDate = props.selectedDate || 'Tue, Nov 17';
  const timeSlots = (props.timeSlots && props.timeSlots.length)
    ? props.timeSlots
    : ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM'];
  const selectedSlot = props.selectedSlot || '10:00 AM';

  // Build a simple 5-week calendar grid (35 cells); selected cell at index 16 by default
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayHeaderHtml = days.map((d) => `<div class="bs-cal-dh">${d}</div>`).join('');
  let cellsHtml = '';
  for (let i = 0; i < 35; i++) {
    const dayNum = i - 5; // first row mostly prev-month padding
    const inMonth = dayNum >= 1 && dayNum <= 30;
    const isSelected = dayNum === 17;
    const isToday = dayNum === 12;
    const cls = ['bs-cal-cell'];
    if (!inMonth) cls.push('bs-cal-out');
    if (isSelected) cls.push('bs-cal-sel');
    if (isToday && !isSelected) cls.push('bs-cal-today');
    cellsHtml += `<div class="${cls.join(' ')}">${inMonth ? dayNum : ''}</div>`;
  }

  const slotsHtml = timeSlots.map((t) => {
    const sel = t === selectedSlot ? ' bs-slot-sel' : '';
    return `<button class="bs-slot${sel}">${escapeHtml(t)}</button>`;
  }).join('');

  return `<div class="bs-public">
    <div class="bs-public-card">
      <aside class="bs-public-side">
        <div class="bs-public-org">${escapeHtml(orgName)}</div>
        <h1 class="bs-public-title">${escapeHtml(serviceTitle)}</h1>
        <div class="bs-public-meta"><span class="bs-public-icon">${svg(ICON_PATHS.clock, 'bs-icon-16')}</span>30 min</div>
        <p class="bs-public-blurb">${escapeHtml(serviceBlurb)}</p>
      </aside>
      <section class="bs-public-pick">
        <div class="bs-cal">
          <div class="bs-cal-head">
            <button class="bs-cal-nav" aria-label="Previous month">${svg(ICON_PATHS.chevLeft, 'bs-icon-12')}</button>
            <span class="bs-cal-month">${escapeHtml(monthLabel)}</span>
            <button class="bs-cal-nav" aria-label="Next month">${svg(ICON_PATHS.chevRight, 'bs-icon-12')}</button>
          </div>
          <div class="bs-cal-grid bs-cal-headers">${dayHeaderHtml}</div>
          <div class="bs-cal-grid bs-cal-cells">${cellsHtml}</div>
        </div>
        <div class="bs-times">
          <div class="bs-times-head">${escapeHtml(selectedDate)}</div>
          <div class="bs-times-grid">${slotsHtml}</div>
        </div>
      </section>
    </div>
  </div>`;
}

// ----- create-modal state overlay -----
function renderModal(props) {
  if (props.state !== 'create-modal') return '';
  const title = escapeHtml(props.modalTitle || 'Create meeting type');
  return `<div class="bs-scrim"></div>
  <div class="bs-modal" role="dialog" aria-label="${title}">
    <header class="bs-modal-head">
      <h2 class="bs-modal-title">${title}</h2>
      <button class="bs-modal-close" aria-label="Close">${svg(ICON_PATHS.close, 'bs-icon-16')}</button>
    </header>
    <div class="bs-modal-body">
      <label class="bs-field">
        <span class="bs-field-label">Title</span>
        <input class="bs-field-input" value="30 minutes meeting" readonly>
      </label>
      <label class="bs-field">
        <span class="bs-field-label">Description</span>
        <textarea class="bs-field-input bs-field-textarea" rows="3" readonly>Book time with me to discuss needs, explore solutions and collaborate efficiently.</textarea>
      </label>
      <div class="bs-field-row">
        <label class="bs-field">
          <span class="bs-field-label">Duration</span>
          <input class="bs-field-input" value="30 min" readonly>
        </label>
        <label class="bs-field">
          <span class="bs-field-label">Visibility</span>
          <input class="bs-field-input" value="Public" readonly>
        </label>
      </div>
      <label class="bs-field">
        <span class="bs-field-label">Location</span>
        <input class="bs-field-input" value="Microsoft Teams meeting" readonly>
      </label>
    </div>
    <footer class="bs-modal-foot">
      <button class="bs-btn">Cancel</button>
      <button class="bs-btn bs-btn-primary">Save</button>
    </footer>
  </div>`;
}

// ----- entry -----
export function transformBookingsScene(props) {
  if (!props || typeof props !== 'object') {
    throw new Error('BookingsScene: props is required');
  }
  const variant = VALID_VARIANTS.has(props.variant) ? props.variant : 'home';
  const state   = VALID_STATES.has(props.state)     ? props.state   : 'default';

  // mutate normalized values back so animation.js + JSON island see them
  props.variant = variant;
  props.state = state;
  props.hasModal = state === 'create-modal';
  props.dataModal = props.hasModal ? '1' : '0';

  let bodyHtml;
  switch (variant) {
    case 'public-page': bodyHtml = renderPublicPageBody(props); break;
    case 'home':
    default:            bodyHtml = renderHomeBody(props); break;
  }

  // public-page hides the suite bar (it's an external/public surface)
  if (variant === 'public-page') {
    props.showSuiteBar = false;
  }

  // Render slots BEFORE we stringify showSuiteBar for the data-attribute
  props.suiteBarHtml = renderSuiteBar(props);
  props.bodyHtml = bodyHtml;
  props.modalHtml = renderModal(props);

  // Normalize for [data-show-suite] attribute on the root (string "0"/"1")
  const suiteVisible = props.showSuiteBar !== false;
  props.showSuiteBar = suiteVisible ? '1' : '0';

  return props;
}

export const __test__ = {
  VALID_VARIANTS, VALID_STATES, ICON_PATHS,
  escapeHtml, svg, avatarHtml,
  renderSuiteBar, renderHomeBody, renderPublicPageBody, renderModal,
  renderMeetingCard, renderEmptyCreateCard
};
