const acScope = '.scene-' + SCENE_ID;
const acShell = acScope + ' .ac-shell';
const acPillHost = document.querySelector(acScope + ' .ac-pill-host');
const acTenantMenu = document.querySelector(acScope + ' .ac-tenant-menu');
const acBlade = document.querySelector(acScope + ' .ac-blade');

function acTypeText(selector, text, start, duration) {
  const node = document.querySelector(acScope + ' ' + selector);
  if (!node) {
    return;
  }
  master.call(function() {
    node.textContent = '';
    const state = { i: 0 };
    gsap.to(state, {
      i: text.length,
      duration: duration,
      ease: 'none',
      onUpdate: function() {
        node.textContent = text.substring(0, Math.floor(state.i));
      }
    });
  }, [], start);
}

master.fromTo(acShell,
  { autoAlpha: 0, y: 18, scale: 0.986 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.56, ease: 'power3.out' },
  SCENE_START + 0.16);

let acCursor = SCENE_START + 0.78;
const acSteps = document.querySelectorAll(acScope + ' .ac-step');

acSteps.forEach(function(step) {
  const kind = step.getAttribute('data-kind');
  const dur = parseFloat(step.getAttribute('data-duration')) || 0.6;

  if (kind === 'tenant_select') {
    const tenant = step.getAttribute('data-tenant') || 'Northwind';
    master.fromTo(acTenantMenu,
      { autoAlpha: 0, y: -10 },
      { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' },
      acCursor);
    master.call(function() {
      document.querySelectorAll(acScope + ' .ac-tenant-item').forEach(function(item) {
        item.classList.toggle('ac-selected', item.textContent === tenant);
      });
      const current = document.querySelector(acScope + ' .ac-current-tenant');
      if (current) {
        current.textContent = tenant;
      }
    }, [], acCursor + 0.16);
    master.to(acTenantMenu,
      { autoAlpha: 0, duration: 0.18, ease: 'power1.in' },
      acCursor + Math.max(dur - 0.18, 0.35));
    acCursor += dur;
  } else if (kind === 'user_create') {
    const displayName = step.getAttribute('data-display-name') || 'Jordan Lee';
    const userName = step.getAttribute('data-user-name') || 'jordan.lee@contoso.com';
    const license = step.getAttribute('data-license') || 'Microsoft 365 E5';
    master.to(acScope + ' [data-toolbar="add-user"]',
      { scale: 1.05, duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: 'center center' },
      acCursor);
    master.fromTo(acBlade,
      { autoAlpha: 0, x: 46 },
      { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' },
      acCursor + 0.08);
    acTypeText('[data-field="display-name"]', displayName, acCursor + 0.26, 0.38);
    acTypeText('[data-field="user-name"]', userName, acCursor + 0.7, 0.48);
    acTypeText('[data-field="licenses"]', license, acCursor + 1.2, 0.32);
    acCursor += dur;
  } else if (kind === 'policy_assign') {
    const policyName = step.getAttribute('data-policy') || 'Conditional Access';
    const row = document.querySelector(acScope + ' .ac-policy-row[data-policy="' + policyName + '"]');
    const button = row ? row.querySelector('[data-assign-button]') : null;
    master.to(row,
      { boxShadow: '0 0 0 2px rgba(76,159,254,.28)', duration: 0.22, ease: 'power1.out' },
      acCursor);
    master.to(button,
      { scale: 1.06, duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: 'center center' },
      acCursor + 0.08);
    master.call(function() {
      if (acPillHost) {
        acPillHost.innerHTML = '<div style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(16,124,16,.12);border:1px solid rgba(16,124,16,.2);color:#107c10;font-weight:700">✓ Policy assigned to admins</div>';
      }
    }, [], acCursor + 0.26);
    master.fromTo(acScope + ' .ac-pill-host > *',
      { autoAlpha: 0, scale: 0.88, y: 6, transformOrigin: 'left center' },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.5)' },
      acCursor + 0.26);
    acCursor += dur;
  } else if (kind === 'compliance_check') {
    const target = parseInt(step.getAttribute('data-score') || '92', 10);
    const score = document.querySelector(acScope + ' [data-score]');
    const checklist = document.querySelectorAll(acScope + ' .ac-check-icon');
    master.call(function() {
      if (!score) {
        return;
      }
      const state = { value: parseInt(score.textContent || '0', 10) || 0 };
      gsap.to(state, {
        value: target,
        duration: Math.max(dur - 0.2, 0.6),
        ease: 'power2.out',
        onUpdate: function() {
          score.textContent = String(Math.round(state.value));
        }
      });
    }, [], acCursor);
    checklist.forEach(function(icon, index) {
      master.fromTo(icon,
        { autoAlpha: 0, scale: 0.6 },
        { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'power2.out' },
        acCursor + 0.2 + (index * 0.16));
    });
    acCursor += dur;
  } else if (kind === 'pause') {
    acCursor += dur;
  } else if (kind === 'pill') {
    master.call(function() {
      if (acPillHost) {
        acPillHost.innerHTML = step.innerHTML;
      }
    }, [], acCursor);
    master.fromTo(acScope + ' .ac-pill-host > *',
      { autoAlpha: 0, scale: 0.86, y: 8, transformOrigin: 'left center' },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.34, ease: 'back.out(1.5)' },
      acCursor);
    acCursor += dur;
  }
});

master.to(acShell,
  { autoAlpha: 0, duration: 0.38, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.42);
