// TypewriterDissolve — character grid delete/retype transition.
// Globals (do NOT redeclare): master, gsap, SCENE_ID, SCENE_START, SCENE_DURATION

(function () {
  if (typeof master === 'undefined') return;

  var S = '.scene-' + SCENE_ID + ' ';
  var root = document.querySelector(S + '.td-root');
  if (!root) return;

  // ── Props ────────────────────────────────────────────────────────────────
  var cols = parseInt(root.getAttribute('data-cols'), 10);
  if (!cols || cols < 10) cols = 40;
  cols = Math.min(cols, 80); // perf cap

  var rows = parseInt(root.getAttribute('data-rows'), 10);
  if (!rows || rows < 5) rows = 22;
  rows = Math.min(rows, 40); // perf cap

  var deleteOffsetMs = parseInt(root.getAttribute('data-delete-offset'), 10);
  if (!deleteOffsetMs && deleteOffsetMs !== 0) deleteOffsetMs = 200;
  var deleteOffset = deleteOffsetMs / 1000;

  var colorProp = root.style.getPropertyValue('--td-color').trim();
  if (!colorProp || colorProp.indexOf('{{') !== -1) {
    root.style.setProperty('--td-color', 'var(--brand-primary, #0078D4)');
  }

  var cursorProp = root.style.getPropertyValue('--td-cursor-color').trim();
  if (!cursorProp || cursorProp.indexOf('{{') !== -1) {
    root.style.setProperty('--td-cursor-color', '#fff');
  }

  // ── Character set for deterministic "random" characters ──────────────────
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>{}[]|/\\~';

  // ── Build character grid ─────────────────────────────────────────────────
  var grid = root.querySelector('.td-grid');
  if (!grid) return;

  // Compute cell size to fill viewport
  var cellW = Math.floor(1920 / cols);
  var cellH = Math.floor(1080 / rows);
  var fontSize = Math.floor(Math.min(cellW, cellH) * 0.65);

  grid.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cellW + 'px)';
  grid.style.gridTemplateRows = 'repeat(' + rows + ', ' + cellH + 'px)';

  var totalCells = cols * rows;
  var cells = [];
  for (var i = 0; i < totalCells; i++) {
    var cell = document.createElement('div');
    cell.className = 'td-cell';
    cell.style.fontSize = fontSize + 'px';
    cell.style.width = cellW + 'px';
    cell.style.height = cellH + 'px';
    // Deterministic character assignment based on index
    cell.textContent = CHARS[i % CHARS.length];
    grid.appendChild(cell);
    cells.push(cell);
  }

  // ── Cursor setup ─────────────────────────────────────────────────────────
  var cursor = root.querySelector('.td-cursor');
  if (cursor) {
    cursor.style.width = '3px';
    cursor.style.height = cellH + 'px';
  }

  // ── Timing ───────────────────────────────────────────────────────────────
  var dur = SCENE_DURATION;
  var phaseIn = dur * 0.3;       // outgoing characters appear
  var phaseDelete = dur * 0.28;   // delete wave
  var phaseRetype = dur * 0.28;   // retype wave (overlaps delete by deleteOffset)

  // ── Phase 1: Outgoing characters appear (staggered reveal) ───────────────
  // Characters are initially invisible (opacity:0 in CSS). Reveal them with a
  // fast stagger to simulate a pre-existing screen of text.
  var revealStagger = Math.min(phaseIn / totalCells, 0.008);

  master.to(cells, {
    autoAlpha: 0.85,
    duration: 0.05,
    stagger: {
      each: revealStagger,
      from: 'start',
      grid: [rows, cols]
    },
    ease: 'none'
  }, SCENE_START);

  // ── Cursor appears ───────────────────────────────────────────────────────
  if (cursor) {
    var firstCellRect = { x: 0, y: 0 };
    // Position cursor at start of grid — we'll track it relative to grid
    master.to(cursor, {
      autoAlpha: 1,
      duration: 0.1,
      ease: 'none'
    }, SCENE_START + phaseIn * 0.5);
  }

  // ── Phase 2: Delete wave — characters dissolve left-to-right, top-to-bottom
  var deleteStart = SCENE_START + phaseIn;
  var deleteStagger = Math.min(phaseDelete / totalCells, 0.006);

  master.to(cells, {
    autoAlpha: 0,
    duration: 0.08,
    stagger: {
      each: deleteStagger,
      from: 'start',
      grid: [rows, cols]
    },
    ease: 'power1.in'
  }, deleteStart);

  // ── Cursor follows the delete wavefront ──────────────────────────────────
  if (cursor) {
    // Move cursor across the grid by animating x/y in steps
    var cursorSteps = Math.min(cols, 20);
    var cursorStepDur = phaseDelete / cursorSteps;
    for (var ci = 0; ci < cursorSteps; ci++) {
      var cx = (ci / cursorSteps) * (cols * cellW);
      var row = Math.floor((ci / cursorSteps) * rows);
      var cy = row * cellH;
      master.to(cursor, {
        x: cx - (cols * cellW / 2) + (cellW / 2),
        y: cy - (rows * cellH / 2),
        duration: cursorStepDur,
        ease: 'none'
      }, deleteStart + ci * cursorStepDur);
    }

    // Cursor blink effect via autoAlpha pulses
    var blinkCount = Math.floor(phaseDelete / 0.15);
    for (var bi = 0; bi < blinkCount; bi++) {
      var blinkTime = deleteStart + bi * 0.15;
      if (blinkTime > deleteStart + phaseDelete) break;
      master.to(cursor, {
        autoAlpha: bi % 2 === 0 ? 1 : 0.2,
        duration: 0.05,
        ease: 'none'
      }, blinkTime);
    }
  }

  // ── Phase 3: Retype wave — new characters appear with offset ─────────────
  var retypeStart = deleteStart + deleteOffset;
  var retypeStagger = Math.min(phaseRetype / totalCells, 0.006);

  // Swap characters to a second deterministic set before retype
  var CHARS2 = '><[]{}|/\\~@#$%&*+=ZYXWVUTSRQPONMLKJIHGFEDCBA9876543210';
  master.call(function () {
    for (var ri = 0; ri < cells.length; ri++) {
      cells[ri].textContent = CHARS2[ri % CHARS2.length];
    }
  }, null, retypeStart);

  master.to(cells, {
    autoAlpha: 0.9,
    duration: 0.08,
    stagger: {
      each: retypeStagger,
      from: 'start',
      grid: [rows, cols]
    },
    ease: 'power1.out'
  }, retypeStart);

  // ── Cursor follows retype wave then fades ────────────────────────────────
  if (cursor) {
    var retypeCursorSteps = Math.min(cols, 20);
    var retypeCursorStepDur = phaseRetype / retypeCursorSteps;
    for (var rci = 0; rci < retypeCursorSteps; rci++) {
      var rcx = (rci / retypeCursorSteps) * (cols * cellW);
      var rrow = Math.floor((rci / retypeCursorSteps) * rows);
      var rcy = rrow * cellH;
      master.to(cursor, {
        x: rcx - (cols * cellW / 2) + (cellW / 2),
        y: rcy - (rows * cellH / 2),
        duration: retypeCursorStepDur,
        ease: 'none'
      }, retypeStart + rci * retypeCursorStepDur);
    }

    // Cursor fades at end of retype
    master.to(cursor, {
      autoAlpha: 0,
      duration: 0.15,
      ease: 'power1.in'
    }, retypeStart + phaseRetype - 0.2);
  }

  // ── Exit fade — completes ≥ 0.3s before scene end ─────────────────────
  master.to(S + '.td-root', {
    autoAlpha: 0,
    duration: 0.2,
    ease: 'power2.in'
  }, SCENE_START + dur - 0.5);
})();
