const fbScope = '.scene-' + SCENE_ID;
const fbShell = fbScope + ' .fb-shell';
const fbPillHost = document.querySelector(fbScope + ' .fb-pill-host');
const fbRoot = document.querySelector(fbScope + ' .fb-root');

function fbShowView(viewName) {
  document.querySelectorAll(fbScope + ' .fb-view').forEach(function(view) {
    view.classList.toggle('fb-visible', view.classList.contains('fb-view-' + viewName));
  });
}

function fbSetActiveExperience(experience) {
  const normalized = (experience || 'data-engineering').toLowerCase();
  document.querySelectorAll(fbScope + ' .fb-nav-item').forEach(function(item) {
    item.classList.toggle('fb-active', item.getAttribute('data-experience-item') === normalized);
  });
}

master.fromTo(fbShell,
  { autoAlpha: 0, y: 20, scale: 0.985 },
  { autoAlpha: 1, y: 0, scale: 1, duration: 0.58, ease: 'power3.out' },
  SCENE_START + 0.16);

const fbSteps = Array.from(document.querySelectorAll(fbScope + ' .fb-step'));
const fbExperience = (fbRoot && fbRoot.getAttribute('data-experience')) || 'data-engineering';
fbSetActiveExperience(fbExperience);
if (fbExperience === 'data-factory') {
  fbShowView('pipeline');
} else if (fbSteps.some(function(step) { return step.getAttribute('data-kind') === 'lakehouse_browse'; })) {
  fbShowView('lakehouse');
} else {
  fbShowView('notebook');
}

let fbCursor = SCENE_START + 0.8;

fbSteps.forEach(function(step) {
  const kind = step.getAttribute('data-kind');
  const dur = parseFloat(step.getAttribute('data-duration')) || 0.6;

  if (kind === 'notebook_cell_run') {
    fbShowView('notebook');
    const cellId = step.getAttribute('data-cell') || '1';
    const cell = document.querySelector(fbScope + ' .fb-cell[data-cell="' + cellId + '"]');
    const output = document.querySelector(fbScope + ' .fb-output[data-output="' + cellId + '"]');
    const spinner = cell ? cell.querySelector('.fb-run-dot') : null;
    master.to(cell, { boxShadow: '0 0 0 2px rgba(76,159,254,.35)', duration: 0.2, ease: 'power1.out' }, fbCursor);
    master.to(spinner, { autoAlpha: 1, rotation: 360, duration: 0.55, ease: 'none' }, fbCursor + 0.05);
    master.call(function() {
      if (output) {
        output.innerHTML = step.innerHTML || step.getAttribute('data-output') || '<div class="fb-output-table"><div>Region</div><div>Revenue</div><div>Margin</div><div>NA</div><div>$12.8M</div><div>34.2%</div><div>EU</div><div>$9.4M</div><div>29.1%</div></div>';
      }
    }, [], fbCursor + 0.28);
    master.fromTo(output,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.26, ease: 'power2.out' },
      fbCursor + 0.3);
    master.to(spinner, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, fbCursor + Math.max(dur - 0.18, 0.42));
    master.to(cell, { boxShadow: '0 0 0 1px rgba(255,255,255,.08)', duration: 0.24, ease: 'power1.inOut' }, fbCursor + Math.max(dur - 0.15, 0.45));
    fbCursor += dur;
  } else if (kind === 'lakehouse_browse') {
    fbShowView('lakehouse');
    const folder = step.getAttribute('data-folder') || 'Tables';
    const itemName = step.getAttribute('data-item') || 'SalesOrders';
    const group = document.querySelector(fbScope + ' .fb-tree-group[data-folder="' + folder + '"]');
    const item = document.querySelector(fbScope + ' .fb-tree-item[data-item="' + itemName + '"]');
    master.fromTo(group,
      { autoAlpha: 0.6, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' },
      fbCursor);
    master.call(function() {
      document.querySelectorAll(fbScope + ' .fb-tree-item').forEach(function(node) {
        node.classList.toggle('fb-selected', node === item);
      });
      const title = document.querySelector(fbScope + ' .fb-preview-title');
      if (title) {
        title.textContent = step.getAttribute('data-preview-title') || itemName;
      }
      const table = document.querySelector(fbScope + ' .fb-preview-table');
      if (table && step.innerHTML) {
        table.innerHTML = step.innerHTML;
      }
    }, [], fbCursor + 0.18);
    master.to(item,
      { x: 8, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 },
      fbCursor + 0.08);
    fbCursor += dur;
  } else if (kind === 'pipeline_run') {
    fbShowView('pipeline');
    const path = (step.getAttribute('data-path') || 'ingest,transform,validate,publish').split(',').map(function(v) { return v.trim(); }).filter(Boolean);
    path.forEach(function(nodeId, index) {
      const node = document.querySelector(fbScope + ' .fb-node[data-node="' + nodeId + '"]');
      const next = path[index + 1];
      const connector = next ? document.querySelector(fbScope + ' .fb-connector[data-connector="' + nodeId + '-' + next + '"]') : null;
      const start = fbCursor + (index * Math.min(0.34, Math.max((dur - 0.2) / Math.max(path.length, 1), 0.2)));
      master.call(function() {
        if (node) {
          node.classList.add('fb-running');
          const small = node.querySelector('small');
          if (small) {
            small.textContent = 'Running';
          }
        }
      }, [], start);
      master.to(node, { scale: 1.04, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 }, start);
      if (connector) {
        master.to(connector, { scaleX: 1, duration: 0.28, ease: 'power2.out' }, start + 0.08);
      }
      master.call(function() {
        if (node) {
          node.classList.remove('fb-running');
          node.classList.add('fb-succeeded');
          const small = node.querySelector('small');
          if (small) {
            small.textContent = 'Succeeded';
          }
        }
      }, [], start + 0.26);
    });
    fbCursor += dur;
  } else if (kind === 'pause') {
    fbCursor += dur;
  } else if (kind === 'pill') {
    master.call(function() {
      if (fbPillHost) {
        fbPillHost.innerHTML = step.innerHTML;
      }
    }, [], fbCursor);
    master.fromTo(fbScope + ' .fb-pill-host > *',
      { autoAlpha: 0, scale: 0.86, y: 8, transformOrigin: 'left center' },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.36, ease: 'back.out(1.5)' },
      fbCursor);
    fbCursor += dur;
  }
});

master.to(fbShell,
  { autoAlpha: 0, duration: 0.38, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.42);
