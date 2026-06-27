/* WindowsScene animation — minimal fade-in (PR 10e Wave A).
 * Standing Rule #12/#13: synchronous DOM, no setTimeout/await before GSAP
 * selectors, no gsap.ticker / requestAnimationFrame.
 */
(function () {
  if (typeof gsap === 'undefined') return;
  if (typeof SCENE_START === 'undefined') return;
  if (typeof SCENE_DURATION === 'undefined') return;

  var root = document.querySelector('.scene-' + SCENE_ID + ' [data-scene-component="WindowsScene"]');
  if (!root) return;

  var window$ = root.querySelector('.fe-window');
  if (!window$) return;

  if (typeof master === 'undefined') return;

  function parseItemsJson(value) {
    if (!value || value.indexOf('{{') !== -1) return [];
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[WindowsScene] Invalid itemsJson', e);
      return [];
    }
  }

  function generatedExplorerContent() {
    var viewMode = root.getAttribute('data-view-mode') || '';
    var items = parseItemsJson(root.getAttribute('data-items-json') || '');
    if (viewMode !== 'largeIcons' || !items.length) return;

    var main = root.querySelector('.fe-main');
    if (!main) return;

    var selectedItem = root.getAttribute('data-selected-item') || '';
    var sectionLabel = root.getAttribute('data-section-label') || '';

    main.innerHTML = '';

    if (sectionLabel) {
      var section = document.createElement('div');
      section.className = 'fe-generated-section';
      section.textContent = sectionLabel;
      main.appendChild(section);
    }

    var grid = document.createElement('div');
    grid.className = 'fe-folder-grid';
    items.forEach(function (item, index) {
      var name = String(item && item.name ? item.name : 'Folder ' + String(index + 1).padStart(2, '0'));
      var type = String(item && item.type ? item.type : 'folder');
      var tile = document.createElement('div');
      tile.className = 'fe-folder-tile' + (name === selectedItem ? ' fe-folder-tile--selected' : '');

      var icon = document.createElement('div');
      icon.className = 'fe-folder-icon';
      icon.innerHTML = type === 'file'
        ? '<svg width="32" height="32" viewBox="0 0 16 16" aria-hidden="true"><use href="#fe-icon-file"/></svg>'
        : '<svg width="104" height="78" viewBox="0 0 128 96" aria-hidden="true"><use href="#fe-icon-folder-large"/></svg>';

      var label = document.createElement('div');
      label.className = 'fe-folder-label';
      label.textContent = name;

      tile.appendChild(icon);
      tile.appendChild(label);
      grid.appendChild(tile);
    });
    main.appendChild(grid);

    var statusLeft = root.querySelector('.fe-status-left');
    if (statusLeft && !statusLeft.textContent.trim()) {
      statusLeft.textContent = items.length + ' items';
    }
  }

  generatedExplorerContent();

  gsap.set(window$, { opacity: 0, y: 16, scale: 0.985, transformOrigin: 'center center' });

  master.to(window$, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.55,
    ease: 'power3.out'
  }, SCENE_START + 0.15);

  master.to(window$, {
    opacity: 0,
    duration: 0.5,
    ease: 'power2.inOut'
  }, SCENE_START + Math.max(0.5, SCENE_DURATION - 0.5));
})();
