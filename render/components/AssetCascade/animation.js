// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  var scope = '.scene-' + SCENE_ID + ' ';
  var rootSel = scope + '.ac-root';

  function seeded(i) {
    return ((i * 9301 + 49297) % 233280) / 233280;
  }

  function parseImages(raw) {
    if (!raw || raw.indexOf('{{') !== -1) return null;
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  function defaultImages() {
    return [
      { src: '', alt: 'Hero asset 01' },
      { src: '', alt: 'Hero asset 02' },
      { src: '', alt: 'Hero asset 03' },
      { src: '', alt: 'Hero asset 04' },
      { src: '', alt: 'Hero asset 05' }
    ];
  }

  master.call(function () {
    var root = document.querySelector(rootSel);
    if (!root) return;

    var stage = root.querySelector('.ac-stage');
    if (!stage) return;
    stage.innerHTML = '';

    var images = parseImages(root.getAttribute('data-ac-images')) || defaultImages();
    if (images.length === 0) images = defaultImages();
    images = images.slice(0, 8);
    var count = images.length;
    var desiredCascade = Math.max(0.18, parseFloat(root.getAttribute('data-ac-cascade-duration')) || 0.4);
    var desiredHold = Math.max(0.2, parseFloat(root.getAttribute('data-ac-hold-duration')) || 1.5);
    var exitOnComplete = ['false', '0', 'no'].indexOf((root.getAttribute('data-ac-exit') || 'true').toLowerCase()) === -1;

    var layout = (root.getAttribute('data-ac-layout') || 'fan').toLowerCase();
    if (['fan', 'grid', 'stack'].indexOf(layout) === -1) layout = 'fan';

    var stageW = Math.max(stage.clientWidth || 1500, 640);
    var stageH = Math.max(stage.clientHeight || 760, 360);
    var cardW = Math.min(320, Math.max(180, stageW * (layout === 'grid' ? 0.22 : 0.2)));
    var cardH = cardW * 0.75;
    var mid = (count - 1) / 2;
    var cols = Math.min(3, count);
    var rows = Math.ceil(count / cols);
    var gridGapX = Math.min(42, stageW * 0.025);
    var gridGapY = Math.min(38, stageH * 0.04);

    function positionFor(index) {
      if (layout === 'grid') {
        var totalW = cols * cardW + (cols - 1) * gridGapX;
        var totalH = rows * cardH + (rows - 1) * gridGapY;
        var startX = (stageW - totalW) * 0.5;
        var startY = (stageH - totalH) * 0.5;
        var col = index % cols;
        var row = Math.floor(index / cols);
        return {
          left: startX + col * (cardW + gridGapX),
          top: startY + row * (cardH + gridGapY),
          rotation: (seeded(index * 11 + 5) - 0.5) * 6
        };
      }

      if (layout === 'stack') {
        return {
          left: stageW * 0.5 - cardW * 0.5 + (seeded(index * 7 + 3) - 0.5) * 48,
          top: stageH * 0.5 - cardH * 0.5 + (seeded(index * 13 + 9) - 0.5) * 36,
          rotation: -6 + index * 1.8
        };
      }

      return {
        left: stageW * 0.5 - cardW * 0.5 + (index - mid) * cardW * 0.44,
        top: stageH * 0.5 - cardH * 0.5 + Math.abs(index - mid) * 12,
        rotation: (index - mid) * 5.4
      };
    }

    for (var i = 0; i < count; i += 1) {
      var meta = images[i] || {};
      var pos = positionFor(i);
      var card = document.createElement('div');
      card.className = 'ac-card';
      card.style.left = pos.left.toFixed(2) + 'px';
      card.style.top = pos.top.toFixed(2) + 'px';
      card.style.width = cardW.toFixed(2) + 'px';
      card.style.height = cardH.toFixed(2) + 'px';
      card.style.zIndex = String(20 + i);
      card.setAttribute('data-rotation', pos.rotation.toFixed(3));
      card.setAttribute('data-start-x', (((seeded(i * 17 + 11) - 0.5) * stageW * 0.92)).toFixed(3));
      card.setAttribute('data-start-y', (-stageH * (0.68 + seeded(i * 5 + 7) * 0.26) + (layout === 'stack' ? i * 16 : 0)).toFixed(3));
      card.setAttribute('data-start-rotation', ((seeded(i * 19 + 13) - 0.5) * 18).toFixed(3));
      card.setAttribute('data-exit-x', (((seeded(i * 23 + 17) - 0.5) * stageW * 1.08)).toFixed(3));
      card.setAttribute('data-exit-y', ((stageH * (0.5 + seeded(i * 29 + 21) * 0.6))).toFixed(3));
      card.setAttribute('data-exit-rotation', ((seeded(i * 31 + 27) - 0.5) * 26).toFixed(3));
      card.style.transform = 'translate(' + card.getAttribute('data-start-x') + 'px,' + card.getAttribute('data-start-y') + 'px) rotate(' + card.getAttribute('data-start-rotation') + 'deg) scale(0.86)';

      if (meta.src && String(meta.src).trim()) {
        var img = document.createElement('img');
        img.src = meta.src;
        img.alt = meta.alt || '';
        card.appendChild(img);
      } else {
        var placeholder = document.createElement('div');
        placeholder.className = 'ac-placeholder';
        placeholder.textContent = meta.alt || ('Hero asset ' + String(i + 1).padStart(2, '0'));
        card.appendChild(placeholder);
      }

      stage.appendChild(card);
    }

    var available = Math.max(0.8, SCENE_DURATION - 0.14);
    var exitDuration = exitOnComplete ? 0.34 : 0;
    var desiredTotal = count * desiredCascade + desiredHold + exitDuration;
    var scale = desiredTotal > available ? (available / desiredTotal) : 1;
    var cascadeDuration = desiredCascade * scale;
    var holdDuration = desiredHold * scale;
    var actualExitDuration = exitOnComplete ? Math.max(0.18, exitDuration * scale) : 0;
    var entranceStart = SCENE_START + 0.1;
    var step = cascadeDuration * 0.62;
    var exitStart = entranceStart + step * Math.max(0, count - 1) + cascadeDuration + holdDuration;
    if (exitStart + actualExitDuration > SCENE_START + SCENE_DURATION - 0.04) {
      exitStart = SCENE_START + SCENE_DURATION - actualExitDuration - 0.04;
    }

    var cards = stage.querySelectorAll('.ac-card');
    master.fromTo(cards,
      {
        x: function (_i, el) { return parseFloat(el.getAttribute('data-start-x')) || 0; },
        y: function (_i, el) { return parseFloat(el.getAttribute('data-start-y')) || 0; },
        rotation: function (_i, el) { return parseFloat(el.getAttribute('data-start-rotation')) || 0; },
        scale: 0.86,
        autoAlpha: 0,
        filter: 'brightness(1.26) saturate(1.22)'
      },
      {
        x: 0,
        y: 0,
        rotation: function (_i, el) { return parseFloat(el.getAttribute('data-rotation')) || 0; },
        scale: 1,
        autoAlpha: 1,
        filter: 'brightness(1) saturate(1)',
        duration: cascadeDuration,
        ease: 'back.out(1.4)',
        stagger: step
      },
      entranceStart);

    if (exitOnComplete) {
      master.to(cards,
        {
          x: function (_i, el) { return parseFloat(el.getAttribute('data-exit-x')) || 0; },
          y: function (_i, el) { return parseFloat(el.getAttribute('data-exit-y')) || 0; },
          rotation: function (_i, el) {
            return (parseFloat(el.getAttribute('data-rotation')) || 0) + (parseFloat(el.getAttribute('data-exit-rotation')) || 0);
          },
          scale: 0.76,
          autoAlpha: 0,
          filter: 'brightness(1.1) saturate(0.92)',
          duration: actualExitDuration,
          ease: 'power2.in',
          stagger: { each: Math.min(0.05, actualExitDuration / 6), from: 'end' }
        },
        exitStart);
    }
  }, [], SCENE_START + 0.02);
})();
