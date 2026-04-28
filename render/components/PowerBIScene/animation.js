const pbScope = '.scene-' + SCENE_ID;
const pbShell = pbScope + ' .pb-shell';
const pbCards = document.querySelectorAll(pbScope + ' .pb-visual-card');
const pbTooltip = document.querySelector(pbScope + ' .pb-tooltip');
const pbDrillChip = document.querySelector(pbScope + ' .pb-drill-chip');
const pbPillHost = document.querySelector(pbScope + ' .pb-pill-host');

function pbSetText(selector, value) {
  const node = document.querySelector(pbScope + ' ' + selector);
  if (node && value) {
    node.textContent = value;
  }
}

function pbUpdateBarChart(valuesAttr) {
  if (!valuesAttr) {
    return;
  }
  const values = valuesAttr.split(',').map(function(v) { return parseFloat(v.trim()); }).filter(function(v) { return !isNaN(v); });
  if (!values.length) {
    return;
  }
  const max = Math.max.apply(Math, values);
  document.querySelectorAll(pbScope + ' [data-bar]').forEach(function(bar, index) {
    const value = values[index] == null ? values[values.length - 1] : values[index];
    const height = Math.max(42, (value / max) * 170);
    bar.setAttribute('height', String(height));
    bar.setAttribute('y', String(220 - height));
  });
}

function pbUpdateLineChart(pathValue) {
  const line = document.querySelector(pbScope + ' [data-line-path]');
  if (line && pathValue) {
    line.setAttribute('d', pathValue);
  }
}

master.fromTo(pbShell,
  { autoAlpha: 0, y: 18, scale: 0.985 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' },
  SCENE_START + 0.18);

let pbCursor = SCENE_START + 0.82;
const pbSteps = document.querySelectorAll(pbScope + ' .pb-step');

pbSteps.forEach(function(step) {
  const kind = step.getAttribute('data-kind');
  const dur = parseFloat(step.getAttribute('data-duration')) || 0.6;

  if (kind === 'report_load') {
    master.fromTo(pbCards,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power2.out', stagger: 0.075 },
      pbCursor);
    master.fromTo(pbScope + ' .pb-filter-pane',
      { autoAlpha: 0, x: 12 },
      { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' },
      pbCursor + 0.12);
    pbCursor += Math.max(dur, 0.9);
  } else if (kind === 'slicer_change') {
    const target = step.getAttribute('data-target') || 'region';
    const value = step.getAttribute('data-value') || 'All';
    const buttons = document.querySelectorAll(pbScope + ' .pb-slicer-buttons[data-group="' + target + '"] .pb-slicer-button');
    master.call(function() {
      buttons.forEach(function(btn) {
        btn.classList.toggle('pb-selected', btn.getAttribute('data-value') === value);
      });
      pbSetText('[data-kpi-value="1"]', step.getAttribute('data-kpi1') || '$38.6M');
      pbSetText('[data-kpi-value="2"]', step.getAttribute('data-kpi2') || '29.8%');
      pbSetText('[data-kpi-delta="1"] span:last-child', step.getAttribute('data-delta1') || '+8.1% vs LY');
      pbSetText('[data-kpi-delta="2"] span:last-child', step.getAttribute('data-delta2') || '+1.1 pts');
      pbSetText('.pb-report-path', (step.getAttribute('data-title') || 'Workspace: filtered view') + ' · Last refreshed just now');
      pbUpdateBarChart(step.getAttribute('data-bar-values'));
      pbUpdateLineChart(step.getAttribute('data-line-path'));
    }, [], pbCursor + 0.18);
    master.to(pbScope + ' .pb-slicer-buttons[data-group="' + target + '"] .pb-slicer-button.pb-selected',
      { scale: 1.06, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: 'center center' },
      pbCursor);
    master.fromTo(pbScope + ' .pb-flash',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.12, ease: 'power1.out', stagger: 0.04, yoyo: true, repeat: 1 },
      pbCursor + 0.15);
    pbCursor += dur;
  } else if (kind === 'drill_down') {
    const title = step.getAttribute('data-title') || 'Sales › NA › Washington';
    const chart = document.querySelector(pbScope + ' .pb-bar-card');
    const others = document.querySelectorAll(pbScope + ' .pb-visual-card:not(.pb-bar-card)');
    master.call(function() {
      if (pbDrillChip) {
        pbDrillChip.textContent = title;
      }
    }, [], pbCursor);
    master.fromTo(pbDrillChip,
      { autoAlpha: 0, y: -8 },
      { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power2.out' },
      pbCursor);
    master.to(chart,
      { scale: 1.035, x: -18, y: -6, duration: 0.35, ease: 'power2.out', transformOrigin: 'center center' },
      pbCursor + 0.08);
    master.to(others,
      { autoAlpha: 0.56, duration: 0.25, ease: 'power2.out', stagger: 0.02 },
      pbCursor + 0.08);
    master.to(chart,
      { scale: 1, x: 0, y: 0, duration: 0.28, ease: 'power2.inOut' },
      pbCursor + Math.max(dur - 0.35, 0.45));
    master.to(others,
      { autoAlpha: 1, duration: 0.22, ease: 'power2.out', stagger: 0.02 },
      pbCursor + Math.max(dur - 0.35, 0.45));
    master.to(pbDrillChip,
      { autoAlpha: 0, duration: 0.2, ease: 'power1.in' },
      pbCursor + Math.max(dur - 0.18, 0.5));
    pbCursor += dur;
  } else if (kind === 'tooltip_show') {
    const x = parseFloat(step.getAttribute('data-x') || '61');
    const y = parseFloat(step.getAttribute('data-y') || '40');
    master.call(function() {
      if (pbTooltip) {
        pbTooltip.innerHTML = step.innerHTML || pbTooltip.innerHTML;
        pbTooltip.style.left = x + '%';
        pbTooltip.style.top = y + '%';
      }
    }, [], pbCursor);
    master.fromTo(pbTooltip,
      { autoAlpha: 0, y: 8, scale: 0.96, transformOrigin: 'top left' },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out' },
      pbCursor);
    master.to(pbTooltip,
      { autoAlpha: 0, duration: 0.2, ease: 'power1.in' },
      pbCursor + Math.max(dur - 0.18, 0.35));
    pbCursor += dur;
  } else if (kind === 'pause') {
    pbCursor += dur;
  } else if (kind === 'pill') {
    master.call(function() {
      if (pbPillHost) {
        pbPillHost.innerHTML = step.innerHTML;
      }
    }, [], pbCursor);
    master.fromTo(pbScope + ' .pb-pill-host > *',
      { autoAlpha: 0, scale: 0.86, y: 6, transformOrigin: 'left center' },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.34, ease: 'back.out(1.5)' },
      pbCursor);
    pbCursor += dur;
  }
});

master.to(pbShell,
  { autoAlpha: 0, duration: 0.38, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.42);
