// AudienceSafe — fade-in watermark, optional warn pulse, scene-exit fade.
// Props consumed (Mustache): appearStartSec, appearDurationSec, pulseStartSec, severity

var __asAppearStart = parseFloat('{{appearStartSec}}');
if (!isFinite(__asAppearStart)) __asAppearStart = 0.3;

var __asAppearDur = parseFloat('{{appearDurationSec}}');
if (!isFinite(__asAppearDur)) __asAppearDur = 0.6;

var __asPulseStart = parseFloat('{{pulseStartSec}}');
if (!isFinite(__asPulseStart)) __asPulseStart = 1.2;

var __asSeverity = '{{severity}}' || 'info';
var __asScope = '.scene-' + SCENE_ID + ' ';
var __asTargetOpacity = __asSeverity === 'warn' ? 0.95 : 0.85;

// 1. Fade in
master.fromTo(__asScope + '.as-root',
  { opacity: 0 },
  { opacity: __asTargetOpacity, duration: __asAppearDur, ease: 'power2.out' },
  SCENE_START + __asAppearStart);

// 2. Warn-only single pulse (scale 1 → 1.06 → 1 over 0.4s)
if (__asSeverity === 'warn') {
  master.fromTo(__asScope + '.as-pill',
    { scale: 1 },
    { scale: 1.06, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 },
    SCENE_START + __asPulseStart);
}

// 3. Exit fade — CONTRACT §7 compliance (scene-level fade also runs)
master.to(__asScope + '.as-root',
  { opacity: 0, duration: 0.4, ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - 0.5);
