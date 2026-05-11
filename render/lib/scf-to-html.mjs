/**
 * SCF → HyperFrames HTML Compiler
 *
 * Converts a Slate Composition Format (SCF) JSON document into a single
 * HyperFrames-compatible HTML file. The HTML is then handed to
 * @hyperframes/producer for headless Chrome capture + FFmpeg encode.
 *
 * Design contract:
 *   - Input:  SCF v1.0 JSON (validated by Python before reaching here)
 *   - Output: single index.html using HyperFrames data-* attributes,
 *             a single root composition with stacked sub-composition divs
 *             for each scene, and <audio> elements for narration + music.
 *   - Animation: GSAP (loaded from CDN), one paused timeline per scene,
 *     plus a master timeline registered on window.__timelines.
 *
 * Slate components (BrandIntro, BrandOutro, TitleCard, LowerThird,
 * AnimatedCaption) are rendered by templating their per-component HTML
 * fragments from ../components/<Name>/*.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { basename, dirname, isAbsolute, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { transformBookingsScene } from './bookings-scene-transformer.mjs';
import { transformFormsScene } from './forms-scene-transformer.mjs';
import { transformGitHubScene } from './github-scene-transformer.mjs';
import { transformListsScene } from './lists-scene-transformer.mjs';
import { transformOneDriveScene } from './onedrive-scene-transformer.mjs';
import { transformOutlookScene } from './outlook-scene-transformer.mjs';
import { transformPlannerScene } from './planner-scene-transformer.mjs';
import { transformTeamsScene } from './teams-scene-transformer.mjs';
import { transformVSCodeScene } from './vscode-scene-transformer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = resolve(__dirname, '..', 'components');

const DEFAULT_THEME = {
  name: 'premium-velvet',
  background: '#120A1F',
  surface: '#1D142C',
  elevatedSurface: '#2A1B3D',
  text: '#F8F4EC',
  mutedText: '#C9BFD7',
  primary: '#8B5CF6',
  accent: '#E7D7A2',
  border: '#4B3A63',
  success: '#3DDC97',
  warning: '#F7C948',
  danger: '#FF6B6B',
  captionHighlight: '#F3DFA2',
  captionHighlightBackground: 'rgba(243,223,162,0.24)',
};

// ---------- Component registry ----------------------------------------------

const KNOWN_COMPONENTS = new Set([
  'BrandIntro',
  'BrandOutro',
  'TitleCard',
  'LowerThird',
  'AnimatedCaption',
  // Phase A — foundational
  'MetricsCard',
  'Quote',
  'CalloutPin',
  'CompareSlider',
  // Phase C — engineer
  'ArchitectureDiagram',
  // Phase F — education
  'StepByStep',
  'CTABlock',
  // Phase I — synthetic screen recording
  'TerminalScene',
  // Phase I — Microsoft synthetic surfaces (proposal §11A)
  'VSCodeScene',
  'AzurePortalScene',
  'GitHubScene',
  'EdgeBrowserScene',
  'TeamsScene',
  'OutlookScene',
  'ExcelScene',
  'PowerPointScene',
  'PowerBIScene',
  'FabricScene',
  'WindowsScene',
  'AdminCenterScene',
  // Phase II — overlays / framing / dataviz / slides
  'CalloutBox',
  'WebcamOverlay',
  'TransitionWipe',
  'DataChart',
  'SlideRenderer',
  'ScreenDemoFrame',
  'SplitScreen',
  // Phase II — governance / compliance (PR 2)
  'ComplianceBadgeWall',
  'DataFlow',
  'AuditTrail',
  'PolicyEnforcement',
  // Phase II — cross-cutting infra & governance overlays (PR 5)
  'SectionDivider',
  'ScrollingBackground',
  'AudienceSafe',
  'Disclaimer',
  // Phase II — sales / FastTrack / GBB seller-narrative (PR 3)
  'CustomerStory',
  'PricingTable',
  'CompetitiveMatrix',
  'ROICalculator',
  // Phase II — PM / EM release pack (PR 4)
  'Roadmap',
  'BurnDown',
  'OKRStatus',
  'ReleaseNotes',
  // Phase II — Education + Event pack (PR 6)
  'Quiz',
  'TerminologyCard',
  'ProgressBar',
  'TerminalCast',
  'PresenterBug',
  'EventBranding',
  'AskTheAudience',
  // Phase II — PR 8a Microsoft surface scenes (Loop / Whiteboard / Stream)
  'LoopScene',
  'WhiteboardScene',
  'StreamScene',
  // Phase II — PR 8c productivity surfaces (Lists / Planner / OneDrive / Forms / Bookings)
  'ListsScene',
  'PlannerScene',
  'OneDriveScene',
  'FormsScene',
  'BookingsScene',
  // Phase II — wow transitions & intra-scene effects (transition palette)
  'CollageShatter',
  'DepthZoomPunch',
  'SwirlVortex',
  'PageTurn',
  'PrismRefract',
  'IrisZoom',
  'OrbitReveal',
  'FilmstripFlip',
  'TypewriterDissolve',
  'ParticleAssemble',
  'GlitchPulse',
  'ShakeImpact',
  'AssetCascade',
  // H8 — composite / overlay helpers
  'ComponentOverlay',
  'MetricStack',
  'BookPageMetrics',
  // Dynamically authored components
  'GaugeRing',
  'PremiumMotionShowcase',
  'BuildingBlocksScene',
  'MoneyTransferScene',
  'ThreeScene',
  'DeviceStage3D',
  'HTMLTextureWall',
  'OmartSignalWall',
  'OmartMarketplaceDemo',
  'OmartCopilotChat',
  'OmartSecurityScope',
  // Slate-original components
  'ParticleTextForm',
  'PurpleCardStorm',
  'PALReviewSurface',
]);

// Components that depend on the lazy three.js driver. Adding a name here
// gates loader injection (import map + driver script) on whether the SCF
// uses any of these in a layer or as a scene-level component.
const THREE_COMPONENTS = new Set([
  'BuildingBlocksScene',
  'ThreeScene',
  'DeviceStage3D',
  'HTMLTextureWall',
]);

const BUILTIN_TRANSITIONS = new Set(['cut', 'fadeIn', 'fadeOut', 'crossfade', 'slide', 'wipe', 'zoom']);
const TRANSITION_COMPONENTS = new Set([
  'CollageShatter',
  'DepthZoomPunch',
  'SwirlVortex',
  'PageTurn',
  'PrismRefract',
  'IrisZoom',
  'OrbitReveal',
  'FilmstripFlip',
  'TypewriterDissolve',
  'ParticleAssemble',
]);

function loadComponent(name) {
  if (!KNOWN_COMPONENTS.has(name)) {
    throw new Error(`Unknown SCF component: ${name}`);
  }
  const dir = resolve(COMPONENTS_DIR, name);
  const html = readFileSync(resolve(dir, 'index.html'), 'utf-8');
  const css = existsSync(resolve(dir, 'style.css'))
    ? readFileSync(resolve(dir, 'style.css'), 'utf-8')
    : '';
  const js = existsSync(resolve(dir, 'animation.js'))
    ? readFileSync(resolve(dir, 'animation.js'), 'utf-8')
    : '';
  return { html, css, js };
}

function slugifyName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseBrandTypography(yamlText) {
  const typography = { headings: {}, body: {} };
  let inTypography = false;
  let current = null;
  for (const rawLine of yamlText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    if (/^typography:\s*$/.test(line)) {
      inTypography = true;
      current = null;
      continue;
    }
    if (inTypography && /^\S/.test(line)) break;
    if (!inTypography) continue;
    const group = line.match(/^\s{2}(headings|body):\s*$/);
    if (group) {
      current = group[1];
      continue;
    }
    const font = line.match(/^\s{4}font:\s*["']?([^"']+)["']?\s*$/);
    if (font && current) typography[current].font = font[1].trim();
    const weight = line.match(/^\s{4}weight:\s*(\d+)\s*$/);
    if (weight && current) typography[current].weight = Number(weight[1]);
    const source = line.match(/^\s{4}(?:src|source|file|path|fontSrc|fontFile):\s*["']?([^"']+)["']?\s*$/);
    if (source && current) typography[current].source = source[1].trim();
  }
  return typography;
}

function parseBrandColors(yamlText) {
  const colors = {};
  let inVisual = false;
  let inPalette = false;
  const keyMap = {
    primary: 'primary',
    accent: 'accent',
    background: 'background',
    text: 'text',
    surface: 'surface',
    surface_color: 'surface',
    elevated_surface: 'elevatedSurface',
    elevatedSurface: 'elevatedSurface',
    elevated_surface_color: 'elevatedSurface',
    muted_text: 'mutedText',
    mutedText: 'mutedText',
    muted_text_color: 'mutedText',
    border: 'border',
    border_color: 'border',
  };
  const firstHex = (value) => {
    const match = String(value || '').match(/#[0-9a-fA-F]{6}/);
    return match ? match[0].toUpperCase() : null;
  };
  for (const rawLine of yamlText.split(/\r?\n/)) {
    const line = rawLine.replace(/#(?![0-9a-fA-F]{6}).*$/, '').trimEnd();
    if (!line.trim()) continue;
    if (/^visual_language:\s*$/.test(line)) {
      inVisual = true;
      inPalette = false;
      continue;
    }
    if (inVisual && /^\S/.test(line)) break;
    if (!inVisual) continue;
    if (/^\s{2}color_palette:\s*$/.test(line)) {
      inPalette = true;
      continue;
    }
    if (inPalette && /^\s{2}\S/.test(line) && !/^\s{2}color_palette:/.test(line)) break;
    if (!inPalette) continue;
    const field = line.match(/^\s{4}([A-Za-z_]+):\s*(.*)$/);
    if (!field) continue;
    const mappedKey = keyMap[field[1]];
    if (!mappedKey) continue;
    const color = firstHex(field[2]);
    if (!color) continue;
    colors[mappedKey] = color;
  }
  return colors;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeHexColor(value, fallback) {
  return (typeof value === 'string' && HEX_COLOR_RE.test(value.trim())) ? value.trim().toUpperCase() : fallback;
}

function hexToRgb(value) {
  const hex = normalizeHexColor(value, '#000000').slice(1);
  return [0, 2, 4].map((idx) => parseInt(hex.slice(idx, idx + 2), 16));
}

function channelLuminance(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function relativeLuminance(value) {
  const [red, green, blue] = hexToRgb(value);
  return 0.2126 * channelLuminance(red) + 0.7152 * channelLuminance(green) + 0.0722 * channelLuminance(blue);
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixHexColor(value, target, amount) {
  const source = hexToRgb(value);
  const destination = hexToRgb(target);
  const ratio = Math.max(0, Math.min(1, amount));
  const mixed = source.map((channel, idx) => Math.round(channel + (destination[idx] - channel) * ratio));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function ensureReadableColor(value, background, minimum = 4.5) {
  if (!HEX_COLOR_RE.test(String(value || '').trim()) || !HEX_COLOR_RE.test(String(background || '').trim())) return value;
  const foreground = normalizeHexColor(value, '#FFFFFF');
  const bg = normalizeHexColor(background, '#000000');
  if (contrastRatio(foreground, bg) >= minimum) return foreground;
  const whiteRatio = contrastRatio('#FFFFFF', bg);
  const blackRatio = contrastRatio('#0B0B0F', bg);
  const target = whiteRatio >= blackRatio ? '#FFFFFF' : '#0B0B0F';
  for (let step = 1; step <= 10; step++) {
    const candidate = mixHexColor(foreground, target, step / 10);
    if (contrastRatio(candidate, bg) >= minimum) return candidate;
  }
  return target;
}

function ensureSurfaceColor(value, background, minimum = 1.18) {
  if (!HEX_COLOR_RE.test(String(value || '').trim()) || !HEX_COLOR_RE.test(String(background || '').trim())) return value;
  const surface = normalizeHexColor(value, DEFAULT_THEME.surface);
  const bg = normalizeHexColor(background, DEFAULT_THEME.background);
  if (contrastRatio(surface, bg) >= minimum) return surface;
  const target = relativeLuminance(bg) < 0.35 ? '#FFFFFF' : '#000000';
  for (let step = 1; step <= 8; step++) {
    const candidate = mixHexColor(surface, target, step * 0.08);
    if (contrastRatio(candidate, bg) >= minimum) return candidate;
  }
  return mixHexColor(surface, target, 0.48);
}

function validateThemeColors(theme) {
  const background = normalizeHexColor(theme.background, DEFAULT_THEME.background);
  return {
    ...theme,
    background,
    surface: ensureSurfaceColor(theme.surface, background, 1.18),
    elevatedSurface: ensureSurfaceColor(theme.elevatedSurface, background, 1.28),
    text: ensureReadableColor(theme.text, background, 7.0),
    mutedText: ensureReadableColor(theme.mutedText, theme.surface || background, 4.5),
    primary: ensureReadableColor(theme.primary, background, 3.0),
    accent: ensureReadableColor(theme.accent, background, 3.0),
    captionHighlight: ensureReadableColor(theme.captionHighlight, background, 3.0),
  };
}

function loadBrandPackage(brandName) {
  if (!brandName) return null;
  const brandRoot = resolve(__dirname, '..', '..', 'config', 'org', 'brand-packages');
  const raw = String(brandName).split('@')[0];
  const slug = slugifyName(raw);
  const candidates = [
    resolve(brandRoot, `${raw}.yaml`),
    resolve(brandRoot, `${slug}.yaml`),
    resolve(brandRoot, raw, 'brand.yaml'),
    resolve(brandRoot, slug, 'brand.yaml'),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) return null;
  const yamlText = readFileSync(path, 'utf-8');
  return {
    name: raw,
    path,
    root: dirname(path),
    typography: parseBrandTypography(yamlText),
    colors: parseBrandColors(yamlText),
  };
}

function normalizeThemeFromSCF(scf, brandPackage) {
  const source = (scf && scf.metadata && scf.metadata.theme) || {};
  const brandColors = brandPackage?.colors || {};
  const theme = {
    ...DEFAULT_THEME,
    name: source.name || (brandPackage ? `brand-${brandPackage.name}` : DEFAULT_THEME.name),
    background: source.background || brandColors.background || DEFAULT_THEME.background,
    surface: source.surface || brandColors.surface || source.elevatedSurface || DEFAULT_THEME.surface,
    elevatedSurface: source.elevatedSurface || brandColors.elevatedSurface || DEFAULT_THEME.elevatedSurface,
    text: source.text || brandColors.text || DEFAULT_THEME.text,
    mutedText: source.mutedText || brandColors.mutedText || DEFAULT_THEME.mutedText,
    primary: source.primary || brandColors.primary || DEFAULT_THEME.primary,
    accent: source.accent || brandColors.accent || source.primary || brandColors.primary || DEFAULT_THEME.accent,
    border: source.border || brandColors.border || DEFAULT_THEME.border,
    success: source.success || DEFAULT_THEME.success,
    warning: source.warning || DEFAULT_THEME.warning,
    danger: source.danger || DEFAULT_THEME.danger,
    captionHighlight: source.captionHighlight || source.primary || brandColors.primary || DEFAULT_THEME.captionHighlight,
    captionHighlightBackground: source.captionHighlightBackground || DEFAULT_THEME.captionHighlightBackground,
  };
  return validateThemeColors(theme);
}

function themeCssVars(theme) {
  const entries = {
    '--brand-primary': theme.primary,
    '--brand-accent': theme.accent,
    '--brand-bg': theme.background,
    '--brand-text': theme.text,
    '--slate-bg': theme.background,
    '--slate-surface': theme.surface,
    '--slate-elevated-surface': theme.elevatedSurface,
    '--slate-text': theme.text,
    '--slate-muted-text': theme.mutedText,
    '--slate-border': theme.border,
    '--slate-success': theme.success,
    '--slate-warning': theme.warning,
    '--slate-danger': theme.danger,
    '--slate-caption-highlight': theme.captionHighlight,
  };
  return Object.entries(entries).map(([key, value]) => `${key}:${value};`).join('');
}

function formatFontFamily(font, fallback = 'Inter') {
  const primary = font || fallback;
  const quoted = /\s/.test(primary) ? `'${primary.replace(/["']/g, '')}'` : primary;
  return `${quoted},${fallback},-apple-system,BlinkMacSystemFont,sans-serif`;
}

function applyBrandDefaults(props, sceneCtx) {
  const typography = sceneCtx.brandPackage?.typography;
  if (props.headingFont == null) props.headingFont = typography?.headings?.font || 'Inter';
  if (props.bodyFont == null) props.bodyFont = typography?.body?.font || 'Inter';
  if (typography?.headings?.weight && props.headingWeight == null) props.headingWeight = typography.headings.weight;
  if (typography?.body?.weight && props.bodyWeight == null) props.bodyWeight = typography.body.weight;
  return props;
}

function fontFormatForPath(fontPath) {
  const lower = String(fontPath || '').toLowerCase();
  if (lower.endsWith('.woff2')) return 'woff2';
  if (lower.endsWith('.woff')) return 'woff';
  if (lower.endsWith('.otf')) return 'opentype';
  if (lower.endsWith('.ttf')) return 'truetype';
  return 'truetype';
}

function normalizeFontToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findBrandFontFile(brandPackage, fontInfo) {
  if (!brandPackage || !fontInfo?.font) return null;
  const explicit = fontInfo.source || fontInfo.src || fontInfo.file || fontInfo.path;
  const roots = [brandPackage.root, resolve(brandPackage.root, 'fonts'), resolve(brandPackage.root, 'assets', 'fonts')];
  if (explicit) {
    const direct = isAbsolute(explicit) ? explicit : resolve(brandPackage.root, explicit);
    if (existsSync(direct)) return direct;
  }
  const wanted = normalizeFontToken(fontInfo.font);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    let entries = [];
    try {
      entries = readdirSync(root, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const file = resolve(root, entry.name);
      if (!/\.(woff2?|otf|ttf)$/i.test(file)) continue;
      if (normalizeFontToken(entry.name).includes(wanted)) return file;
    }
  }
  return null;
}

function cssString(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function brandFontFaceCss(brandPackage, ctx) {
  if (!brandPackage) return '';
  const rules = [];
  const seen = new Set();
  for (const fontInfo of [brandPackage.typography?.headings, brandPackage.typography?.body]) {
    if (!fontInfo?.font || seen.has(fontInfo.font)) continue;
    seen.add(fontInfo.font);
    const fontPath = findBrandFontFile(brandPackage, fontInfo);
    if (!fontPath) continue;
    const staged = stageBrowserAsset(fontPath, { scfDir: brandPackage.root, projectDir: ctx.projectDir });
    rules.push(`@font-face{font-family:'${cssString(fontInfo.font)}';src:url('${cssString(staged)}') format('${fontFormatForPath(fontPath)}');font-weight:${fontInfo.weight || 400};font-style:normal;font-display:block;}`);
  }
  return rules.join('\n');
}

// ---------- Templating helpers ----------------------------------------------

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function templateString(template, vars) {
  // First pass: triple-mustache {{{var}}} = raw HTML (no escape)
  let out = template.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
    const path = key.split('.');
    let value = vars;
    for (const part of path) {
      value = value?.[part];
      if (value === undefined || value === null) return '';
    }
    return String(value);
  });
  // Second pass: double-mustache {{var}} = HTML-escaped
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const path = key.split('.');
    let value = vars;
    for (const part of path) {
      value = value?.[part];
      if (value === undefined || value === null) return '';
    }
    return escapeHtml(value);
  });
  return out;
}

function resolveAssetPath(srcPath, scfDir) {
  if (!srcPath) return '';
  if (/^https?:|^data:|^file:/.test(srcPath)) return srcPath;
  // Keep relative paths as-is when possible — the @hyperframes/producer serves
  // files via HTTP from projectDir (same as scfDir when the SCF lives next to
  // the output HTML). file:// URLs are blocked by headless Chrome's security
  // policy, so relative paths are preferred for local assets.
  if (!isAbsolute(srcPath)) return srcPath;
  const abs = resolve(scfDir, srcPath);
  return pathToFileURL(abs).href;
}

// PR 3 — recursive nested asset resolver.
// Walks plain objects and arrays, resolving any string-valued field whose key
// matches /Src$|Path$|^src$/ to a file:// URL via resolveAssetPath. Used to
// support nested asset references like products[].logoSrc, attribution.photoSrc,
// metrics[].iconSrc, etc. Recursion is depth-capped (default 6) to bound work
// on pathological inputs. Strings are NEVER walked — pre-stringified JSON
// props (e.g. tiersJson) pass through unchanged and are handled by per-component
// prop transformers if any path resolution is needed inside them.
const ASSET_KEY_RE = /Src$|Path$|^src$/;
function resolveNestedAssetPaths(value, scfDir, depth = 0, maxDepth = 6) {
  if (depth > maxDepth) return value;
  if (Array.isArray(value)) {
    return value.map((v) => resolveNestedAssetPaths(v, scfDir, depth + 1, maxDepth));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && ASSET_KEY_RE.test(k)) {
        out[k] = resolveAssetPath(v, scfDir);
      } else if (v && (Array.isArray(v) || typeof v === 'object')) {
        out[k] = resolveNestedAssetPaths(v, scfDir, depth + 1, maxDepth);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return value;
}

function normalizeCaptionConfig(config = {}, theme = DEFAULT_THEME) {
  const style = ['word-highlight', 'sentence', 'karaoke', 'static', 'none'].includes(config?.style)
    ? config.style
    : 'word-highlight';
  const panel = config?.panel === true;
  const lineBackgroundColor = config?.lineBackgroundColor || 'rgba(3, 10, 22, 0.78)';
  const parsedTimingOffsetSec = Number(config?.timingOffsetSec ?? 0.07);
  const normalized = {
    style,
    font: config?.font || 'Inter',
    fontSize: Number(config?.fontSize || 24),
    color: config?.color || theme.text || '#FFFFFF',
    highlightColor: config?.highlightColor || theme.captionHighlight || '#F3DFA2',
    backgroundColor: config?.backgroundColor || (panel ? 'rgba(0,0,0,0.62)' : 'transparent'),
    lineBackgroundColor,
    highlightBackgroundColor: config?.highlightBackgroundColor || theme.captionHighlightBackground || 'rgba(243,223,162,0.24)',
    panel,
    position: ['top', 'center', 'bottom'].includes(config?.position) ? config.position : 'bottom',
    maxWordsPerLine: Math.max(3, Math.min(15, Number(config?.maxWordsPerLine || 5))),
    timingOffsetSec: Number.isFinite(parsedTimingOffsetSec) ? Math.max(-0.5, Math.min(0.5, parsedTimingOffsetSec)) : 0.07,
  };
  normalized.color = ensureReadableColor(normalized.color, theme.background, 4.5);
  normalized.highlightColor = ensureReadableColor(normalized.highlightColor, theme.background, 3.0);
  return normalized;
}

function normalizeNarrationWordTimeline(rawWords) {
  if (!Array.isArray(rawWords)) return [];
  const words = rawWords
    .map((entry) => {
      const word = String(entry?.word ?? '').trim();
      const start = Number(entry?.start);
      const end = Number(entry?.end);
      if (!word || !Number.isFinite(start)) return null;
      return {
        word,
        start: Math.max(0, start),
        end: Number.isFinite(end) ? Math.max(start, end) : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
  for (let i = 0; i < words.length; i++) {
    if (words[i].end != null) continue;
    const next = words[i + 1];
    words[i].end = next ? Math.max(words[i].start + 0.06, next.start) : words[i].start + 0.24;
  }
  return words;
}

function tryReadNarrationWords(sidecarPath) {
  try {
    if (!sidecarPath || !existsSync(sidecarPath)) return [];
    const payload = JSON.parse(readFileSync(sidecarPath, 'utf-8'));
    if (Array.isArray(payload)) return normalizeNarrationWordTimeline(payload);
    return normalizeNarrationWordTimeline(payload?.words);
  } catch {
    return [];
  }
}

function resolveNarrationWordSidecar(scene, sceneCtx) {
  const narration = scene?.narration;
  if (!narration) return [];
  const narrationObj = (typeof narration === 'object' && narration !== null) ? narration : null;
  const narrationSrc = typeof narration === 'string' ? narration : narrationObj?.src;
  const explicitWords = narrationObj?.wordsSrc || narrationObj?.wordsPath;
  const candidates = [];
  const pushCandidate = (candidate) => {
    if (!candidate || typeof candidate !== 'string') return;
    const abs = isAbsolute(candidate) ? candidate : resolve(sceneCtx.scfDir, candidate);
    candidates.push(abs);
  };
  pushCandidate(explicitWords);
  if (narrationSrc) {
    const absNarration = isAbsolute(narrationSrc) ? narrationSrc : resolve(sceneCtx.scfDir, narrationSrc);
    pushCandidate(`${absNarration}.words.json`);
    pushCandidate(absNarration.replace(/\.[^./\\]+$/, '.words.json'));
  }
  for (const candidate of candidates) {
    const words = tryReadNarrationWords(candidate);
    if (words.length > 0) return words;
  }
  return [];
}

function renderSceneCaptions(scene, sceneCtx, captionsConfig) {
  if (!captionsConfig || captionsConfig.style === 'none' || !scene?.narration) {
    return { html: '', js: '' };
  }
  const words = resolveNarrationWordSidecar(scene, sceneCtx);
  if (!words.length) return { html: '', js: '' };

  const rootId = `${sceneCtx.id}-captions`;
  const rows = [];
  for (let i = 0; i < words.length; i += captionsConfig.maxWordsPerLine) {
    rows.push(words.slice(i, i + captionsConfig.maxWordsPerLine));
  }
  let globalIndex = 0;
  const indexedRows = rows.map((row, rowIndex) => row.map((entry) => ({ ...entry, __idx: globalIndex++, __row: rowIndex })));
  const rowStyle = [
    'display:inline-flex',
    'grid-area:1 / 1',
    'justify-content:center',
    'align-items:center',
    'gap:7px',
    'white-space:nowrap',
    'max-width:92vw',
    'padding:10px 18px',
    'border-radius:18px',
    `background:${captionsConfig.lineBackgroundColor}`,
    'box-shadow:0 10px 34px rgba(0,0,0,0.38)',
    'backdrop-filter:blur(7px)',
    '-webkit-backdrop-filter:blur(7px)',
    'opacity:0',
  ].join(';');
  const indexedWordsHtml = indexedRows.map((row, rowIndex) => (
    `<div class="slate-caption-row slate-caption-row-${rowIndex}" style="${rowStyle}">${row.map((w) => (
      `<span class="slate-caption-word slate-caption-word-${w.__idx}" data-start="${w.start}" data-end="${w.end}">${escapeHtml(w.word)}</span>`
    )).join(' ')}</div>`
  )).join('');

  const positionCss = captionsConfig.position === 'top'
    ? 'top:52px;'
    : (captionsConfig.position === 'center' ? 'top:50%;transform:translate(-50%,-50%);' : 'bottom:54px;');
  const rootTransform = captionsConfig.position === 'center' ? 'translate(-50%,-50%)' : 'translateX(-50%)';
  const rootStyle = `position:absolute;left:50%;${positionCss}z-index:1200;pointer-events:none;opacity:0;width:92%;max-width:1660px;transform:${rootTransform};`;
  const panelChrome = captionsConfig.panel
    ? `padding:14px 20px;border-radius:16px;background:${captionsConfig.backgroundColor};backdrop-filter:blur(5px);`
    : 'padding:0;border-radius:0;background:transparent;backdrop-filter:none;';
  const panelStyle = `display:grid;grid-template:'caption';place-items:center;${panelChrome}font-family:${formatFontFamily(captionsConfig.font)};font-size:${captionsConfig.fontSize}px;line-height:1.18;text-align:center;filter:drop-shadow(0 3px 10px rgba(0,0,0,0.5));`;
  const html = `<div id="${escapeHtml(rootId)}" class="slate-caption-layer" style="${rootStyle}"><div class="slate-caption-panel" style="${panelStyle}">${indexedWordsHtml}</div></div>`;

  const lines = [];
  const rootSel = `#${rootId}`;
  lines.push(`master.set('${rootSel}', { autoAlpha: 0 }, 0);`);
  lines.push(`master.set('${rootSel}', { autoAlpha: 1 }, ${sceneCtx.sceneStart});`);
  lines.push(`master.set('${rootSel}', { autoAlpha: 0 }, ${sceneCtx.sceneStart + sceneCtx.duration});`);
  lines.push(`master.set('${rootSel} .slate-caption-row', { autoAlpha: 0, y: 8 }, ${sceneCtx.sceneStart});`);
  lines.push(`master.set('${rootSel} .slate-caption-word', { color: ${JSON.stringify(captionsConfig.color)}, backgroundColor: 'transparent', padding: '2px 5px', borderRadius: '7px' }, ${sceneCtx.sceneStart});`);
  indexedRows.forEach((row, rowIndex) => {
    const first = row[0];
    const last = row[row.length - 1];
    const nextFirst = indexedRows[rowIndex + 1]?.[0];
    const firstStart = Number(first?.start || 0) + captionsConfig.timingOffsetSec;
    const rowStart = sceneCtx.sceneStart + Math.min(sceneCtx.duration, Math.max(0, firstStart - 0.02));
    const naturalEnd = Math.max(Number(last?.end || last?.start || 0) + captionsConfig.timingOffsetSec + 0.18, firstStart + 0.45);
    const nextStart = Number.isFinite(Number(nextFirst?.start)) ? Number(nextFirst.start) + captionsConfig.timingOffsetSec - 0.04 : sceneCtx.duration;
    const rowEnd = sceneCtx.sceneStart + Math.min(sceneCtx.duration, Math.max(firstStart + 0.28, Math.min(naturalEnd, nextStart)));
    const rowSel = `${rootSel} .slate-caption-row-${rowIndex}`;
    lines.push(`master.set('${rowSel}', { autoAlpha: 1, y: 0 }, ${rowStart});`);
    lines.push(`master.set('${rowSel}', { autoAlpha: 0, y: -6 }, ${rowEnd});`);
  });
  indexedRows.flat().forEach((word) => {
    const wordStart = Number(word.start || 0) + captionsConfig.timingOffsetSec;
    const wordEnd = Number(word.end || word.start || 0) + captionsConfig.timingOffsetSec;
    const start = sceneCtx.sceneStart + Math.min(sceneCtx.duration, Math.max(0, wordStart));
    const end = sceneCtx.sceneStart + Math.min(sceneCtx.duration, Math.max(wordEnd, wordStart + 0.06));
    const sel = `${rootSel} .slate-caption-word-${word.__idx}`;
    lines.push(`master.set('${sel}', { color: ${JSON.stringify(captionsConfig.highlightColor)}, backgroundColor: ${JSON.stringify(captionsConfig.highlightBackgroundColor)} }, ${start});`);
    lines.push(`master.set('${sel}', { color: ${JSON.stringify(captionsConfig.color)}, backgroundColor: 'transparent' }, ${end});`);
  });
  return { html, js: lines.join('\n') };
}

// ---------- Layer renderers (custom scenes) ---------------------------------
//
// LAYER TIME WINDOWS (BUG FIX — layer-timing-windows agent):
//   text/image/shape/lottie/video layers may carry `startTime` and/or
//   `endTime` fields (seconds, scene-relative). When set, the layer is only
//   visible during [startTime, endTime). Without this, multiple sequential
//   text overlays in a single scene all stack on screen at once.
//
//   Implementation: each timed layer gets a stable id
//   (`<sceneId>-layer-<idx>`) plus `data-layer-start` / `data-layer-end`
//   attributes (informational). The renderer also pushes a visibility
//   record onto `sceneCtx.layerVisibility`; renderScene turns those into
//   GSAP `master.set(...)` calls so opacity follows the seek-driven master
//   timeline (works for both real-time playback and headless render).
//
//   Default opacity (inline style on the element) is `0` when startTime > 0
//   so the layer is hidden before its window begins; otherwise default `1`.
//
// COORDINATION NOTE (fix-position-styles agent): this section is the layer
// renderers. The other agent works inside `positionStyles()` (above) — no
// line collisions expected.

function layerTimingId(sceneCtx, idx) {
  return `${sceneCtx.id}-layer-${idx}`;
}

// Returns true if the layer has any time-window attributes that require
// GSAP visibility tweens.
function hasLayerTiming(layer) {
  return layer && (layer.startTime != null || layer.endTime != null);
}

// Build inline-style snippet for the layer's initial opacity (the master
// timeline will tween it, but the FIRST seek may land before any set fires).
function layerInitialOpacityStyle(layer) {
  if (!hasLayerTiming(layer)) return '';
  const start = layer.startTime ?? 0;
  return start > 0 ? 'opacity:0;' : '';
}

function layerOpacityStyle(layer) {
  if (hasLayerTiming(layer)) return '';
  if (layer?.opacity == null) return '';
  const opacity = Number(layer.opacity);
  if (!Number.isFinite(opacity)) return '';
  return `opacity:${Math.max(0, Math.min(1, opacity))};`;
}

// Append data-layer-start / data-layer-end attrs (informational + handy
// for debugging) to a layer's HTML attribute string.
function layerTimingAttrs(layer) {
  if (!hasLayerTiming(layer)) return '';
  const parts = [];
  if (layer.startTime != null) parts.push(`data-layer-start="${Number(layer.startTime)}"`);
  if (layer.endTime != null) parts.push(`data-layer-end="${Number(layer.endTime)}"`);
  return parts.join(' ');
}

// Register a visibility window on the scene context. renderScene flushes
// these into master.set() calls in the compiled JS.
function registerLayerVisibility(sceneCtx, idx, layer, elementId) {
  if (!hasLayerTiming(layer)) return;
  if (!sceneCtx.layerVisibility) sceneCtx.layerVisibility = [];
  const start = layer.startTime ?? 0;
  const end = layer.endTime != null ? Number(layer.endTime) : null;
  sceneCtx.layerVisibility.push({
    id: elementId,
    absStart: sceneCtx.sceneStart + Number(start),
    absEnd: end != null ? sceneCtx.sceneStart + end : null,
    initiallyHidden: start > 0,
  });
}

function renderLayer(layer, sceneCtx, idx) {
  const t = layer.type;
  if (t === 'image') return renderImageLayer(layer, sceneCtx, idx);
  if (t === 'video') return renderVideoLayer(layer, sceneCtx, idx);
  if (t === 'text' || t === 'caption') return renderTextLayer(layer, sceneCtx, idx);
  if (t === 'shape') return renderShapeLayer(layer, sceneCtx, idx);
  if (t === 'component') return renderComponentLayer(layer, sceneCtx, idx);
  if (t === 'lottie') return renderLottieLayer(layer, sceneCtx, idx);
  return `<!-- unsupported layer type: ${t} -->`;
}

// Map anchor keyword → implicit left/right/top/bottom + transform.
// Explicit position.x / position.y always override the anchor-derived
// left/top (the anchor only contributes the transform in that case).
// Without this mapping a `transform:translate(-50%,-50%)` on a
// position:absolute element with no left/top resolves against (0,0)
// and shifts the element OFF-SCREEN to the upper-left.
const ANCHOR_MAP = {
  'center':        { left: '50%', top: '50%',    transform: 'translate(-50%,-50%)' },
  'top-center':    { left: '50%', top: '0',      transform: 'translateX(-50%)' },
  'bottom-center': { left: '50%', bottom: '0',   transform: 'translateX(-50%)' },
  'center-left':   { left: '0',   top: '50%',    transform: 'translateY(-50%)' },
  'center-right':  { right: '0',  top: '50%',    transform: 'translateY(-50%)' },
  'top-left':      { left: '0',   top: '0' },
  'top-right':     { right: '0',  top: '0' },
  'bottom-left':   { left: '0',   bottom: '0' },
  'bottom-right':  { right: '0',  bottom: '0' },
};

export function positionStyles(position, defaults = {}) {
  const p = position || {};
  const styles = [];
  const anchor = p.anchor || defaults.anchor || '';
  const anchorSpec = ANCHOR_MAP[anchor] || null;

  const fmt = (v) => (typeof v === 'number' ? v + 'px' : v);

  // Horizontal placement: explicit p.x wins; otherwise use anchor's left/right.
  if (p.x !== undefined) {
    styles.push(`left:${fmt(p.x)}`);
  } else if (anchorSpec) {
    if (anchorSpec.left !== undefined) styles.push(`left:${anchorSpec.left}`);
    if (anchorSpec.right !== undefined) styles.push(`right:${anchorSpec.right}`);
  }

  // Vertical placement: explicit p.y wins; otherwise use anchor's top/bottom.
  if (p.y !== undefined) {
    styles.push(`top:${fmt(p.y)}`);
  } else if (anchorSpec) {
    if (anchorSpec.top !== undefined) styles.push(`top:${anchorSpec.top}`);
    if (anchorSpec.bottom !== undefined) styles.push(`bottom:${anchorSpec.bottom}`);
  }

  if (p.width !== undefined) styles.push(`width:${fmt(p.width)}`);
  if (p.height !== undefined) styles.push(`height:${fmt(p.height)}`);

  if (anchorSpec && anchorSpec.transform) {
    styles.push(`transform:${anchorSpec.transform}`);
  }

  return styles.join(';');
}

function renderImageLayer(layer, sceneCtx, idx) {
  const src = escapeHtml(stageBrowserAsset(layer.src, sceneCtx));
  const fit = escapeHtml(layer.fit || 'cover');
  const pos = positionStyles(layer.position);
  const baseStyle = pos
    ? `position:absolute;object-fit:${fit};${pos}`
    : `position:absolute;inset:0;width:100%;height:100%;object-fit:${fit}`;
  const initOpacity = layerInitialOpacityStyle(layer);
  const elementId = layerTimingId(sceneCtx, idx);
  const idAttr = hasLayerTiming(layer) ? `id="${escapeHtml(elementId)}"` : '';
  const timingAttrs = layerTimingAttrs(layer);
  registerLayerVisibility(sceneCtx, idx, layer, elementId);
  return `<img class="layer layer-image" ${idAttr} ${timingAttrs} src="${src}" style="${baseStyle};${initOpacity}" />`;
}

function renderVideoLayer(layer, sceneCtx, idx) {
  const src = escapeHtml(resolveAssetPath(layer.src, sceneCtx.scfDir));
  const layerStart = Number(layer.startTime ?? 0);
  // HyperFrames `parseVideoElements` reads data-start / data-end as
  // COMPOSITION-time coordinates (it pre-extracts frames for the range and
  // composites them at the same global time). Therefore data-start MUST be
  // sceneStart-relative, NOT layer-relative — otherwise frames are extracted
  // for the wrong window and the video shows static / black.
  const compStart = sceneCtx.sceneStart + layerStart;
  let compEnd;
  if (layer.endTime != null) {
    compEnd = sceneCtx.sceneStart + Number(layer.endTime);
  } else if (layer.duration != null) {
    compEnd = compStart + Number(layer.duration);
  } else {
    compEnd = sceneCtx.sceneStart + sceneCtx.duration;
  }
  const compDuration = Math.max(0, compEnd - compStart);
  const trackIndex = layer.trackIndex ?? (idx + 1);
  // Standing Rule #17 — every <video> element MUST emit an explicit `id`.
  // HyperFrames producer's `parseVideoElements` auto-assigns an internal id
  // (e.g. `hf-video-N`) on its in-memory parsed DOM, but never writes it back
  // to the served HTML. At runtime `injectVideoFramesBatch` calls
  // `document.getElementById(item.videoId)` and gets `null`, so frames are
  // silently never injected → video shows the static poster for the whole
  // scene. Mirrors the contract used by `transformStreamScene`.
  // See render/PATCHES.md and .internal/proposal-phase-ii…md SR #17.
  //
  // Layer-time-windows fix: when a scene contains MULTIPLE video layers and
  // none specify trackIndex, fall back to (idx + 1) so each gets a unique
  // composition id. Without this, `s04-video-gen-video-1` would collide
  // across both videos and GSAP tweens would target only the first one,
  // breaking the visibility schedule.
  const compositionId = `${sceneCtx.id}-video-${trackIndex}`;
  const compositionIdEsc = escapeHtml(compositionId);
  const initOpacity = layerInitialOpacityStyle(layer);
  const timingAttrs = layerTimingAttrs(layer);
  // Register GSAP visibility tween against the video's id so two stacked
  // videos in the same scene (position:absolute;inset:0) don't paint over
  // each other outside of their windows.
  registerLayerVisibility(sceneCtx, idx, layer, compositionId);
  return `<video class="layer layer-video clip"
    id="${compositionIdEsc}"
    data-composition-id="${compositionIdEsc}"
    data-start="${compStart}"
    data-end="${compEnd}"
    data-duration="${compDuration}"
    data-track-index="${trackIndex}"
    ${timingAttrs}
    src="${src}"
    muted
    playsinline
    style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;${initOpacity}"
  ></video>`;
}

function renderTextLayer(layer, sceneCtx, idx) {
  const content = escapeHtml(layer.content ?? layer.text ?? '');
  const style = layer.style || {};
  const css = [];
  let textAlignSet = false;
  const typography = sceneCtx.brandPackage?.typography || {};
  let fontFamily = typography.body?.font || 'Inter';
  if (typeof style === 'object') {
    if (style.fontSize) css.push(`font-size:${typeof style.fontSize === 'number' ? style.fontSize + 'px' : style.fontSize}`);
    if (style.fontWeight) css.push(`font-weight:${style.fontWeight}`);
    if (style.color) css.push(`color:${style.color}`);
    if (style.fontFamily) fontFamily = style.fontFamily;
    if (style.textAlign) { css.push(`text-align:${style.textAlign}`); textAlignSet = true; }
    if (style.lineHeight) css.push(`line-height:${style.lineHeight}`);
  } else if (style === 'heading') {
    fontFamily = typography.headings?.font || fontFamily;
    css.push(`font-size:64px;font-weight:${typography.headings?.weight || 700};color:var(--slate-text,#F8F4EC)`);
  } else if (style === 'subheading') {
    fontFamily = typography.headings?.font || fontFamily;
    css.push(`font-size:32px;font-weight:${typography.headings?.weight || 500};color:var(--slate-text,#F8F4EC)`);
  }
  // Default-anchor for text layers is `top-center`. When the resolved
  // anchor includes "center" the element is horizontally centered via
  // transform — but its inner text would still flow left-aligned. Default
  // text-align to center in that case (user can still override via
  // explicit style.textAlign).
  const resolvedAnchor = (layer.position && layer.position.anchor) || 'top-center';
  if (!textAlignSet && typeof resolvedAnchor === 'string' && resolvedAnchor.includes('center')) {
    css.push('text-align:center');
  }
  const pos = positionStyles(layer.position, { anchor: 'top-center' });
  const initOpacity = layerInitialOpacityStyle(layer);
  const zIndex = layer.zIndex != null ? `z-index:${Number(layer.zIndex)};` : '';
  const baseStyle = `position:absolute;${css.join(';')};${pos};${zIndex}max-width:80%;text-shadow:0 2px 8px rgba(0,0,0,0.4);font-family:${formatFontFamily(fontFamily)};${initOpacity}`;
  const content_html = String(content).split('\n').map(line => `<div>${line}</div>`).join('');
  const elementId = layerTimingId(sceneCtx, idx);
  const idAttr = hasLayerTiming(layer) ? `id="${escapeHtml(elementId)}"` : '';
  const timingAttrs = layerTimingAttrs(layer);
  registerLayerVisibility(sceneCtx, idx, layer, elementId);
  return `<div class="layer layer-text" ${idAttr} ${timingAttrs} style="${baseStyle}">${content_html}</div>`;
}

function renderComponentLayer(layer, sceneCtx, idx) {
  const componentName = layer.component;
  if (!componentName) return '<!-- component layer missing component name -->';
  const c = loadComponent(componentName);
  if (sceneCtx.compileCtx?.componentsUsed) sceneCtx.compileCtx.componentsUsed.add(componentName);
  if (THREE_COMPONENTS.has(componentName) && sceneCtx.compileCtx) sceneCtx.compileCtx.threeUsed = true;
  const rawProps = layer.props || layer.data || {};
  const resolvedProps = resolveNestedAssetPaths({ ...rawProps }, sceneCtx.scfDir, 0);
  applyBrandDefaults(resolvedProps, sceneCtx);
  transformComponentProps(componentName, resolvedProps, sceneCtx);
  const vars = { ...resolvedProps, sceneId: sceneCtx.id, duration: sceneCtx.duration };
  const inner = templateString(c.html, vars);
  const pos = positionStyles(layer.position);
  const initOpacity = layerInitialOpacityStyle(layer);
  const opacity = layerOpacityStyle(layer);
  const zIndex = layer.zIndex != null ? `z-index:${Number(layer.zIndex)};` : '';
  const baseStyle = pos
    ? `position:absolute;${pos};${zIndex}${opacity}${initOpacity}`
    : `position:absolute;inset:0;${zIndex}${opacity}${initOpacity}`;
  const elementId = layerTimingId(sceneCtx, idx);
  const idAttr = hasLayerTiming(layer) ? `id="${escapeHtml(elementId)}"` : '';
  const timingAttrs = layerTimingAttrs(layer);
  registerLayerVisibility(sceneCtx, idx, layer, elementId);
  if (!sceneCtx.componentLayerAssets) sceneCtx.componentLayerAssets = [];
  sceneCtx.componentLayerAssets.push({
    component: componentName,
    css: c.css,
    js: templateString(c.js, vars),
  });
  return `<div class="layer layer-component layer-component-${escapeHtml(componentName)}" ${idAttr} ${timingAttrs} data-component="${escapeHtml(componentName)}" style="${baseStyle}">${inner}</div>`;
}

function renderShapeLayer(layer, sceneCtx, idx) {
  const pos = positionStyles(layer.position);
  const fill = escapeHtml(layer.fill || '#000000');
  const initOpacity = layerInitialOpacityStyle(layer);
  const baseStyle = pos
    ? `position:absolute;background:${fill};${pos};${initOpacity}`
    : `position:absolute;inset:0;background:${fill};${initOpacity}`;
  const elementId = layerTimingId(sceneCtx, idx);
  const idAttr = hasLayerTiming(layer) ? `id="${escapeHtml(elementId)}"` : '';
  const timingAttrs = layerTimingAttrs(layer);
  registerLayerVisibility(sceneCtx, idx, layer, elementId);
  return `<div class="layer layer-shape" ${idAttr} ${timingAttrs} style="${baseStyle}"></div>`;
}

// ---------- Lottie layer (PR 9 — Lane A) ------------------------------------
//
// Slate treats Lottie as a first-class SCF layer type. Contract:
//
//   1. The Lottie JSON is read from disk at COMPILE time and embedded as a
//      `<script type="application/json">` data island inside the scene. No
//      runtime path-loading happens (PR 9 Rule #10 — render is hermetic).
//   2. The JSON must be self-contained: `assets: []`. Any non-empty assets
//      array (external images / nested compositions) raises a hard compile
//      error so authors see the violation immediately.
//   3. The vendored lottie-web SVG-only player (render/vendor/lottie-web/
//      lottie_svg.min.js, MIT, pinned 5.12.2) is injected ONCE per compiled
//      HTML, regardless of the number of Lottie layers.
//   4. The bootstrap `<script>` block (also emitted once) is the SINGLE
//      permitted exception to Standing Rule #7 (no DOM mutations in GSAP
//      onUpdate). It is framework infrastructure — it ticks each Lottie
//      instance via `goToAndStop(targetFrame, true)` keyed off the master
//      timeline's `master.time()`. Per-component animation.js files are
//      still forbidden from mutating DOM in onUpdate. See LOTTIE_DRIVER_JS.
//
// Per-layer config travels via data-* attributes on the container div, so
// the bootstrap can run after the entire DOM is wired up — order-independent.

function escapeAttr(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

// PR 9 Lane B — shared Lottie compile-time embed helper.
// Used by renderLottieLayer (custom-scene layers) and by component prop
// preprocessors (ScrollingBackground, ComplianceBadgeWall, EventBranding).
// Returns { containerHtml, dataIslandHtml, frameRate, totalFrames }.
export function compileLottieEmbed({ src, instanceId, sceneId, x, y, width, height,
    loop, speed, segment, sceneStart, sceneDuration, ctx, scfDir,
    defaultWidth, defaultHeight }) {
  if (!src || typeof src !== 'string') {
    throw new Error(
      `[scf-to-html] Lottie embed for "${instanceId}" in scene "${sceneId}" ` +
      `is missing required "src" path.`
    );
  }
  // Strip file:// prefix if the path was pre-resolved by resolveNestedAssetPaths
  let rawSrc = src;
  if (rawSrc.startsWith('file:')) rawSrc = fileURLToPath(rawSrc);
  const dir = scfDir || (ctx && ctx.scfDir) || process.cwd();
  const abs = isAbsolute(rawSrc) ? rawSrc : resolve(dir, rawSrc);
  if (!existsSync(abs)) {
    throw new Error(
      `[scf-to-html] Lottie embed for "${instanceId}" in scene "${sceneId}" ` +
      `references missing file: ${abs}`
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(abs, 'utf-8'));
  } catch (err) {
    throw new Error(
      `[scf-to-html] Lottie embed for "${instanceId}" in scene "${sceneId}" ` +
      `failed to parse "${src}" as JSON: ${err.message}`
    );
  }
  if (Array.isArray(parsed.assets) && parsed.assets.length > 0) {
    throw new Error(
      `[scf-to-html] Lottie embed for "${instanceId}" in scene "${sceneId}" ` +
      `at "${src}" has ${parsed.assets.length} external asset(s); ` +
      `Lottie files used by Slate must be self-contained (assets: []). ` +
      `Re-export from After Effects with "Embed assets" checked, or inline ` +
      `images as base64 data URIs into the JSON before referencing it.`
    );
  }

  const dW = defaultWidth || 1920;
  const dH = defaultHeight || 1080;
  const lx = Number.isFinite(x) ? x : 0;
  const ly = Number.isFinite(y) ? y : 0;
  const lw = Number.isFinite(width) ? width : dW;
  const lh = Number.isFinite(height) ? height : dH;
  const lSpeed = Number.isFinite(speed) ? speed : 1;
  const lLoop = loop === true ? 1 : 0;
  const segFrom = Array.isArray(segment) && Number.isInteger(segment[0]) ? segment[0] : '';
  const segTo = Array.isArray(segment) && Number.isInteger(segment[1]) ? segment[1] : '';

  if (ctx) ctx.lottieUsed = true;

  const stringified = JSON.stringify(parsed)
    .replace(/<\/(script)/gi, '<\\/$1')
    .replace(/<!--/g, '<\\!--');

  const dataIslandId = `lottie-data-${instanceId}`;
  const frameRate = parsed.fr || 30;
  const totalFrames = Math.max(1, (parsed.op || 30) - (parsed.ip || 0));

  const containerHtml = [
    `<div class="lottie-container lottie-${instanceId}"`,
    `  data-lottie-data-id="${escapeAttr(dataIslandId)}"`,
    `  data-lottie-scene-start="${sceneStart ?? 0}"`,
    `  data-lottie-scene-duration="${sceneDuration ?? 0}"`,
    `  data-lottie-speed="${lSpeed}"`,
    `  data-lottie-loop="${lLoop}"`,
    `  data-lottie-segment-from="${segFrom}"`,
    `  data-lottie-segment-to="${segTo}"`,
    `  style="position:absolute;left:${lx}px;top:${ly}px;width:${lw}px;height:${lh}px;pointer-events:none;">`,
    `</div>`,
  ].join('\n');

  const dataIslandHtml =
    `<script type="application/json" id="${escapeAttr(dataIslandId)}">${stringified}</script>`;

  return { containerHtml, dataIslandHtml, frameRate, totalFrames };
}

function renderLottieLayer(layer, sceneCtx, idx) {
  const instanceId = `${layer.id || sceneCtx.id}-${idx}`;
  const opacity = Number.isFinite(layer.opacity) ? layer.opacity : 1;
  const { containerHtml, dataIslandHtml } = compileLottieEmbed({
    src: layer.src,
    instanceId,
    sceneId: sceneCtx.id,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    loop: layer.loop,
    speed: layer.speed,
    segment: layer.segment,
    sceneStart: sceneCtx.sceneStart,
    sceneDuration: sceneCtx.duration,
    ctx: sceneCtx.compileCtx,
    scfDir: sceneCtx.scfDir,
    defaultWidth: sceneCtx.width,
    defaultHeight: sceneCtx.height,
  });
  // Re-wrap with the original layer-level class names for backward compat
  const containerCls = `lottie-${instanceId}`;
  // Apply initial opacity:0 if layer has startTime > 0 so the GSAP master
  // tween has a hidden starting state to reveal from. The `${opacity}`
  // value remains the post-reveal opacity (multiplied conceptually — we
  // emit the smaller of the two as the inline style starting value).
  const startTime = layer.startTime ?? 0;
  const initOpacity = hasLayerTiming(layer) && startTime > 0 ? 0 : opacity;
  // Add stable id + register visibility so master timeline tweens fire.
  // Lottie reuses its own per-layer id (`lottie-${instanceId}`) — that is
  // already a unique CSS class. Add it as an id too for direct GSAP target.
  const lottieElementId = `lottie-${instanceId}`;
  let rewrapped = containerHtml
    .replace('class="lottie-container', `class="layer layer-lottie lottie-container`)
    .replace('<div class=', `<div id="${escapeAttr(lottieElementId)}" class=`)
    .replace(/style="([^"]*)"/, (_, s) => `style="${s}opacity:${initOpacity};"`);
  if (hasLayerTiming(layer)) {
    const timingAttrs = layerTimingAttrs(layer);
    rewrapped = rewrapped.replace('<div ', `<div ${timingAttrs} `);
    registerLayerVisibility(sceneCtx, idx, layer, lottieElementId);
  }
  return rewrapped + '\n' + dataIslandHtml;
}

// PR 9 — single permitted exception to Standing Rule #7 (no DOM writes in
// GSAP onUpdate). This is FRAMEWORK helper code — it walks every registered
// Lottie instance once per gsap.ticker tick and calls goToAndStop(frame, true)
// with the rendering enabled flag. Per-component animation.js files MUST NOT
// imitate this pattern. The driver runs at most once per master-timeline frame
// regardless of how many Lottie layers the SCF references, and its DOM writes
// are confined to the lottie-web SVG renderer's own sub-tree.
const LOTTIE_DRIVER_JS = `
/* === Slate Lottie driver (PR 9 — Lane A + Lane B fix) ===================
 * Drives every Lottie instance off the master GSAP timeline. SINGLE
 * permitted onUpdate-style DOM-mutation site (Standing Rule #7 framework
 * exception). Do NOT replicate this pattern in per-component animation.js.
 *
 * PR 9 final architecture (after rubber-duck on Lane B runtime cascade):
 *   - Idempotent rescan: each .lottie-container is bound exactly once,
 *     marked via data-lottie-bound="1". Re-scan is safe to call N times.
 *   - Ticker installed exactly once and unconditionally — even if the first
 *     scan finds zero containers, late-mounted ones (e.g. CBW badges built
 *     inside master.call(SCENE_START + 0.05)) will be picked up by the
 *     MutationObserver and animated.
 *   - MutationObserver on document.body watches for any subtree mutation
 *     and triggers a rescan. Cheap (we filter via the bound attribute).
 *   - No setTimeout(0) defer needed: rescan-on-demand is the right model.
 * ====================================================================== */
(function(){
  if (typeof window === 'undefined') return;
  if (typeof lottie === 'undefined') return;
  if (window.__slateLottie && window.__slateLottie._installed) return;
  window.__slateLottie = window.__slateLottie || {
    instances: [], driver: null, _installed: true, _scanning: false
  };

  function bindContainer(el) {
    if (!el || el.getAttribute('data-lottie-bound') === '1') return false;
    var dataId = el.getAttribute('data-lottie-data-id');
    var island = dataId ? document.getElementById(dataId) : null;
    if (!island) return false;
    var raw = island.textContent;
    if (!raw) return false;
    var anim;
    try {
      anim = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        autoplay: false,
        loop: false,
        animationData: JSON.parse(raw),
        rendererSettings: { progressiveLoad: false, preserveAspectRatio: 'xMidYMid meet' }
      });
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[slate-lottie] load failed:', e && e.message);
      return false;
    }
    el.setAttribute('data-lottie-bound', '1');
    anim.setSubframe(false);

    var frameRate = anim.frameRate || (anim.animationData && anim.animationData.fr) || 30;
    var totalFrames = anim.totalFrames || (anim.animationData
        ? Math.max(1, anim.animationData.op - anim.animationData.ip) : 30);

    var sceneStartSec = parseFloat(el.getAttribute('data-lottie-scene-start')) || 0;
    var sceneDurationSec = parseFloat(el.getAttribute('data-lottie-scene-duration')) || 0;
    var speed = parseFloat(el.getAttribute('data-lottie-speed'));
    if (!isFinite(speed) || speed <= 0) speed = 1;
    var loop = el.getAttribute('data-lottie-loop') === '1';
    var segFromAttr = el.getAttribute('data-lottie-segment-from');
    var segToAttr = el.getAttribute('data-lottie-segment-to');
    var segFrom = (segFromAttr !== '' && segFromAttr != null) ? parseInt(segFromAttr, 10) : 0;
    var segTo   = (segToAttr   !== '' && segToAttr   != null) ? parseInt(segToAttr,   10) : totalFrames;
    if (!isFinite(segFrom) || segFrom < 0) segFrom = 0;
    if (!isFinite(segTo) || segTo > totalFrames) segTo = totalFrames;
    if (segTo <= segFrom) segTo = segFrom + 1;

    anim.goToAndStop(segFrom, true);

    window.__slateLottie.instances.push({
      anim: anim,
      sceneStartSec: sceneStartSec,
      sceneDurationSec: sceneDurationSec,
      frameRate: frameRate,
      totalFrames: totalFrames,
      segFrom: segFrom,
      segTo: segTo,
      segLen: segTo - segFrom,
      speed: speed,
      loop: loop
    });
    return true;
  }

  function scanForUnboundLotties() {
    if (window.__slateLottie._scanning) return 0;
    window.__slateLottie._scanning = true;
    var bound = 0;
    try {
      var containers = document.querySelectorAll('.lottie-container:not([data-lottie-bound="1"])');
      for (var i = 0; i < containers.length; i++) {
        if (bindContainer(containers[i])) bound++;
      }
    } finally {
      window.__slateLottie._scanning = false;
    }
    return bound;
  }
  // Expose for explicit calls from component animation.js if ever needed.
  window.__slateLottie.scan = scanForUnboundLotties;

  function tick() {
    var compositionId = (window.__timelines && Object.keys(window.__timelines)[0]);
    var masterTl = (compositionId && window.__timelines[compositionId]) || (typeof master !== 'undefined' ? master : null);
    if (!masterTl) return;
    var t = masterTl.time();
    var insts = window.__slateLottie.instances;
    for (var j = 0; j < insts.length; j++) {
      var inst = insts[j];
      var localSec = (t - inst.sceneStartSec) * inst.speed;
      var frameOffset;
      if (localSec <= 0) {
        frameOffset = 0;
      } else if (inst.loop) {
        frameOffset = (localSec * inst.frameRate) % inst.segLen;
      } else {
        frameOffset = Math.min(localSec * inst.frameRate, inst.segLen - 1);
      }
      var target = inst.segFrom + frameOffset;
      if (target < 0) target = 0;
      if (target > inst.totalFrames - 1) target = inst.totalFrames - 1;
      inst.anim.goToAndStop(target, true);
    }
  }

  // Install ticker exactly once, unconditionally. CRITICAL: hook the master
  // timeline's onUpdate (NOT just gsap.ticker), because headless video
  // rendering (HyperFrames producer) advances time via timeline.seek() per
  // frame; gsap.ticker does NOT fire under seek-driven rendering. The
  // timeline onUpdate fires on BOTH real-time playback and seek, so it
  // covers both preview and render. We also keep gsap.ticker for redundancy
  // when the master timeline isn't actively progressing.
  window.__slateLottie.driver = tick;
  function hookMasterTimeline() {
    var compositionId = (window.__timelines && Object.keys(window.__timelines)[0]);
    var masterTl = (compositionId && window.__timelines[compositionId]) || (typeof master !== 'undefined' ? master : null);
    if (!masterTl || !masterTl.eventCallback) return false;
    var existing = masterTl.eventCallback('onUpdate');
    masterTl.eventCallback('onUpdate', function(){
      if (typeof existing === 'function') { try { existing(); } catch(e){} }
      tick();
    });
    // Tick once now in case timeline is already at non-zero time.
    tick();
    return true;
  }
  if (!hookMasterTimeline()) {
    // Master timeline not ready yet — defer one microtask.
    Promise.resolve().then(hookMasterTimeline);
  }
  if (typeof gsap !== 'undefined' && gsap.ticker && typeof gsap.ticker.add === 'function') {
    gsap.ticker.add(tick);
  }

  // Initial scan for compile-time DOM containers (Lane A).
  scanForUnboundLotties();

  // MutationObserver picks up runtime-mounted containers (SB/CBW Lane B).
  if (typeof MutationObserver !== 'undefined' && document.body) {
    var mo = new MutationObserver(function(){ scanForUnboundLotties(); });
    mo.observe(document.body, { childList: true, subtree: true });
    window.__slateLottie._observer = mo;
  }
})();
`;

const THREE_RUNTIME_VERSION = '0.171.0';

function buildThreeImportMapTag(projectDir) {
  const threePackagePath = resolve(__dirname, '..', 'node_modules', 'three', 'package.json');
  const threeModulePath = resolve(__dirname, '..', 'node_modules', 'three', 'build', 'three.module.min.js');
  const threeCorePath = resolve(__dirname, '..', 'node_modules', 'three', 'build', 'three.core.min.js');
  if (!existsSync(threePackagePath) || !existsSync(threeModulePath) || !existsSync(threeCorePath)) {
    throw new Error('[scf-to-html] ThreeScene requires render/node_modules/three. Run npm install in render/.');
  }
  const threePackage = JSON.parse(readFileSync(threePackagePath, 'utf8'));
  if (threePackage.version !== THREE_RUNTIME_VERSION) {
    throw new Error(`[scf-to-html] Expected three@${THREE_RUNTIME_VERSION}, found three@${threePackage.version}.`);
  }
  const vendorDir = resolve(projectDir || process.cwd(), 'vendor', 'three');
  mkdirSync(vendorDir, { recursive: true });
  copyFileSync(threeModulePath, resolve(vendorDir, 'three.module.min.js'));
  copyFileSync(threeCorePath, resolve(vendorDir, 'three.core.min.js'));
  const importMap = JSON.stringify({ imports: { three: './vendor/three/three.module.min.js' } });
  return `<!-- three ${THREE_RUNTIME_VERSION} (MIT) staged from render/node_modules/three; no CDN fallback -->\n<script type="importmap">${importMap}</script>`;
}

const THREE_DRIVER_JS = `
/* === Slate three.js driver ==============================================
 * Drives registered WebGL scenes from the paused master GSAP timeline.
 * Determinism contract: components must not use requestAnimationFrame,
 * Date.now(), performance.now(), or unseeded randomness. This framework
 * hook calls renderAtTime(master.time()) during seek-driven renders.
 * ====================================================================== */
(function(){
  if (typeof window === 'undefined') return;

  var previous = window.__slateThree;
  if (previous && previous._installed) return;

  var instances = (previous && previous.instances) || [];
  var threePromise = null;

  function getMasterTimeline() {
    var compositionId = (window.__timelines && Object.keys(window.__timelines)[0]);
    return (compositionId && window.__timelines[compositionId]) || (typeof master !== 'undefined' ? master : null);
  }

  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (!threePromise) {
      threePromise = import('three').then(function(mod){
        window.THREE = mod;
        window.__slateThree.ready = true;
        return mod;
      }).catch(function(err){
        window.__slateThree.error = err && err.message ? err.message : String(err);
        if (typeof console !== 'undefined') console.warn('[slate-three] load failed:', window.__slateThree.error);
        throw err;
      });
    }
    return threePromise;
  }

  function ensureInitialized(inst) {
    if (!inst || inst._initStarted || inst.disposed) return;
    inst._initStarted = true;
    loadThree().then(function(THREE){
      inst.THREE = THREE;
      var initResult = null;
      if (inst.api && typeof inst.api.init === 'function') {
        try {
          initResult = inst.api.init(THREE);
        } catch (err) {
          inst.error = err && err.message ? err.message : String(err);
          window.__slateThree.error = inst.error;
          throw err;
        }
      }
      return Promise.resolve(initResult).then(function(){
        inst.ready = true;
        tick();
      });
    }).catch(function(err){
      inst.error = err && err.message ? err.message : (inst.error || String(err));
      inst.ready = false;
    });
  }

  function register(sceneId, api) {
    var inst = { sceneId: sceneId, api: api || {}, ready: false, _initStarted: false, disposed: false, error: null };
    instances.push(inst);
    ensureInitialized(inst);
    return inst;
  }

  function disposeInstance(inst) {
    if (!inst || inst.disposed) return;
    inst.disposed = true;
    try {
      if (inst.api && typeof inst.api.dispose === 'function') {
        inst.api.dispose(inst.THREE || window.THREE);
      }
    } catch (err) {
      if (typeof console !== 'undefined') console.warn('[slate-three] dispose failed:', err && err.message ? err.message : err);
    }
    inst.ready = false;
  }

  function unregister(sceneIdOrInst) {
    for (var i = instances.length - 1; i >= 0; i--) {
      var inst = instances[i];
      if (inst === sceneIdOrInst || inst.sceneId === sceneIdOrInst) {
        disposeInstance(inst);
        instances.splice(i, 1);
      }
    }
  }

  function disposeAll() {
    for (var i = instances.length - 1; i >= 0; i--) {
      disposeInstance(instances[i]);
    }
    instances.length = 0;
  }

  function tick() {
    var masterTl = getMasterTimeline();
    if (!masterTl) return;
    var t = masterTl.time();
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (inst.disposed) continue;
      if (!inst.ready) {
        ensureInitialized(inst);
        continue;
      }
      if (inst.api && typeof inst.api.renderAtTime === 'function') {
        inst.api.renderAtTime(t, inst.THREE || window.THREE);
      }
    }
  }

  window.__slateThree = {
    _installed: true,
    ready: !!window.THREE,
    error: null,
    instances: instances,
    register: register,
    unregister: unregister,
    disposeAll: disposeAll,
    driver: tick
  };

  function allInstancesReady() {
    if (window.__slateThree.error) {
      throw new Error('[slate-three] ' + window.__slateThree.error);
    }
    if (!window.__slateThree.ready) return false;
    for (var i = 0; i < instances.length; i++) {
      if (!instances[i].disposed && !instances[i].ready) return false;
    }
    return true;
  }

  function installHyperFramesCaptureGate() {
    var storedHf = window.__hf;
    function wrapHf(hf) {
      if (!hf || hf.__slateThreeWrapped) return hf;
      var wrapped = {
        __slateThreeWrapped: true,
        get duration() {
          return allInstancesReady() ? hf.duration : 0;
        },
        seek: function(t) {
          return hf.seek(t);
        }
      };
      return wrapped;
    }

    try {
      Object.defineProperty(window, '__hf', {
        configurable: true,
        get: function() {
          return wrapHf(storedHf);
        },
        set: function(value) {
          storedHf = value;
        }
      });
    } catch (err) {
      if (typeof console !== 'undefined') console.warn('[slate-three] unable to install capture gate:', err);
    }

    if (storedHf) storedHf = wrapHf(storedHf);
  }

  installHyperFramesCaptureGate();

  function hookMasterTimeline() {
    var masterTl = getMasterTimeline();
    if (!masterTl || !masterTl.eventCallback) return false;
    var existing = masterTl.eventCallback('onUpdate');
    masterTl.eventCallback('onUpdate', function(){
      if (typeof existing === 'function') { try { existing(); } catch(e){} }
      tick();
    });
    tick();
    return true;
  }

  if (!hookMasterTimeline()) {
    Promise.resolve().then(hookMasterTimeline);
  }

  if (typeof gsap !== 'undefined' && gsap.ticker && typeof gsap.ticker.add === 'function') {
    gsap.ticker.add(tick);
  }

  window.addEventListener('pagehide', disposeAll);
  window.addEventListener('beforeunload', disposeAll);

  loadThree().then(tick).catch(function(){});
})();
`;

// ---------- Scene renderer ---------------------------------------------------

function renderScene(scene, ctx) {
  const sceneStart = ctx.cursor;
  const duration = scene.duration ?? 5;
  ctx.cursor += duration;

  const sceneId = scene.id || `scene-${ctx.index}`;
  const trackIndex = ctx.index + 1;
  const sceneCtx = {
    id: sceneId,
    scfDir: ctx.scfDir,
    projectDir: ctx.projectDir,
    duration,
    sceneStart,
    width: ctx.width,
    height: ctx.height,
    brandPackage: ctx.brandPackage,
    compileCtx: ctx,
  };

  let inner = '';
  let css = '';
  let js = '';
  // Layer-time-windows fix: per-layer renderers push visibility records
  // onto sceneCtx.layerVisibility. compileSCFToHTML flushes them into
  // master.set() calls so opacity tracks the seek-driven timeline.
  sceneCtx.layerVisibility = [];

  if (scene.component) {
    const c = loadComponent(scene.component);
    if (ctx.componentsUsed) ctx.componentsUsed.add(scene.component);
    if (THREE_COMPONENTS.has(scene.component)) ctx.threeUsed = true;
    const props = scene.props || {};
    // Resolve any *Src / *Path / src props to file:// URLs.
    // PR 3: walk recursively into nested objects + arrays so that
    // products[].logoSrc, attribution.photoSrc, and similar nested asset
    // references are resolved before being templated. Recursion is depth-
    // capped (6) to avoid pathological inputs. Strings inside pre-stringified
    // JSON props (e.g. tiersJson) are NOT walked — those are handled by
    // per-component prop transformers below.
    const resolvedProps = resolveNestedAssetPaths(props, ctx.scfDir, 0);
    applyBrandDefaults(resolvedProps, sceneCtx);
    // PR 5 — per-component prop transformer:
    // Build the *Html string props from structured data arrays so SCF authors
    // do not have to hand-write component-internal HTML. Backward-compat: if
    // the *Html prop is already supplied, it wins and the data prop is ignored.
    // PR 9 Lane B: sceneCtx passed through so Lottie prop preprocessors can
    // call compileLottieEmbed with full scene-aware context.
    transformComponentProps(scene.component, resolvedProps, sceneCtx);
    const vars = { ...resolvedProps, sceneId, duration };
    inner = templateString(c.html, vars);
    css = c.css;
    js = templateString(c.js, vars);
  } else if (Array.isArray(scene.layers)) {
    inner = scene.layers.map((layer, i) => renderLayer(layer, sceneCtx, i)).join('\n');
    css = (sceneCtx.componentLayerAssets || []).map((asset) => asset.css).filter(Boolean).join('\n');
    js = (sceneCtx.componentLayerAssets || []).map((asset) => asset.js ? `// component layer: ${asset.component}\n(function(){\n${asset.js}\n})();` : '').filter(Boolean).join('\n');
  } else {
    inner = `<div style="color:#888;font-family:monospace;padding:24px">empty scene: ${escapeHtml(sceneId)}</div>`;
  }

  const captions = renderSceneCaptions(scene, sceneCtx, ctx.captionConfig);
  if (captions.html) inner += `\n${captions.html}`;
  if (captions.js) js = [js, captions.js].filter(Boolean).join('\n');

  // Narration audio
  let narrationAudio = '';
  if (scene.narration) {
    const narrationSrc = typeof scene.narration === 'string' ? scene.narration : scene.narration.src;
    if (narrationSrc) {
      const narrationId = `${sceneId}-narration`;
      narrationAudio = `<audio
        id="${escapeHtml(narrationId)}"
        data-composition-id="${escapeHtml(narrationId)}"
        data-start="${sceneStart}"
        data-duration="${duration}"
        data-media-start="0"
        data-track-index="${trackIndex}"
        src="${escapeHtml(stageBrowserAsset(narrationSrc, sceneCtx))}"
      ></audio>`;
    }
  }

  const sceneHtml = `<div class="scene scene-${escapeHtml(sceneId)}"
    data-composition-id="${escapeHtml(sceneId)}"
    data-start="${sceneStart}"
    data-duration="${duration}"
    data-track-index="${trackIndex}"
    data-width="${ctx.width}"
    data-height="${ctx.height}"
    style="position:absolute;inset:0;overflow:hidden;opacity:0">
    ${inner}
  </div>
  ${narrationAudio}`;

  return { html: sceneHtml, css, js, sceneId, sceneStart, duration, props: scene.props || {}, transition: scene.transition, layerVisibility: sceneCtx.layerVisibility || [], kind: 'scene' };
}

function normalizeTransition(transition) {
  if (!transition) return { type: 'cut', duration: 0 };
  if (typeof transition === 'string') return { type: transition, duration: transition === 'cut' ? 0 : 0.5 };
  const type = transition.type || 'cut';
  return {
    ...transition,
    type,
    duration: Math.max(0.1, Math.min(Number(transition.duration ?? 0.5), 3)),
    props: transition.props || {},
  };
}

function isComponentTransition(transition) {
  const spec = normalizeTransition(transition);
  return TRANSITION_COMPONENTS.has(spec.type) && KNOWN_COMPONENTS.has(spec.type);
}

function renderTransitionOverlay(fromScene, toScene, transition, ctx) {
  const spec = normalizeTransition(transition);
  const c = loadComponent(spec.type);
  if (ctx.componentsUsed) ctx.componentsUsed.add(spec.type);
  const duration = spec.duration;
  const sceneStart = Math.max(fromScene.sceneStart, fromScene.sceneStart + fromScene.duration - duration);
  const sceneId = `transition-${fromScene.sceneId}-to-${toScene.sceneId}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  const sceneCtx = {
    id: sceneId,
    scfDir: ctx.scfDir,
    projectDir: ctx.projectDir,
    duration,
    sceneStart,
    width: ctx.width,
    height: ctx.height,
    brandPackage: ctx.brandPackage,
    compileCtx: ctx,
  };
  const props = resolveNestedAssetPaths({ ...(spec.props || {}) }, ctx.scfDir, 0);
  if (props.direction == null && spec.direction) props.direction = spec.direction;
  if (props.frontLabel == null) props.frontLabel = fromScene.props?.title || fromScene.sceneId;
  if (props.backLabel == null) props.backLabel = toScene.props?.title || toScene.sceneId;
  applyBrandDefaults(props, sceneCtx);
  transformComponentProps(spec.type, props, sceneCtx);
  const vars = { ...props, sceneId, duration };
  const inner = templateString(c.html, vars);
  const html = `<div class="scene scene-${escapeHtml(sceneId)} slate-transition-overlay"
    data-composition-id="${escapeHtml(sceneId)}"
    data-start="${sceneStart}"
    data-duration="${duration}"
    data-width="${ctx.width}"
    data-height="${ctx.height}"
    data-transition-from="${escapeHtml(fromScene.sceneId)}"
    data-transition-to="${escapeHtml(toScene.sceneId)}"
    style="position:absolute;inset:0;overflow:hidden;z-index:900;pointer-events:none;opacity:0">
    ${inner}
  </div>`;
  return {
    html,
    css: c.css,
    js: templateString(c.js, vars),
    sceneId,
    sceneStart,
    duration,
    props,
    layerVisibility: [],
    transition: null,
    kind: 'transition',
  };
}

function buildSceneVisibilityJs(renderedScenes) {
  const lines = [];
  const contentScenes = renderedScenes.filter((scene) => scene.kind !== 'transition');
  for (let i = 0; i < contentScenes.length; i++) {
    const scene = contentScenes[i];
    const prev = i > 0 ? contentScenes[i - 1] : null;
    const incoming = prev ? normalizeTransition(prev.transition) : { type: 'cut', duration: 0 };
    const incomingDur = BUILTIN_TRANSITIONS.has(incoming.type) && incoming.type !== 'cut'
      ? Math.min(incoming.duration, scene.duration, prev ? prev.duration : scene.duration)
      : 0;
    const start = scene.sceneStart;
    const end = scene.sceneStart + scene.duration;
    const fadeStart = incomingDur > 0 ? Math.max(0, start - incomingDur) : start;
    lines.push(`master.set('.scene-${scene.sceneId}', { opacity: 0 }, 0);`);
    if (incomingDur > 0 && ['fadeIn', 'crossfade', 'slide', 'wipe', 'zoom'].includes(incoming.type)) {
      lines.push(`master.fromTo('.scene-${scene.sceneId}', { opacity: 0 }, { opacity: 1, duration: ${incomingDur}, ease: 'power1.inOut' }, ${fadeStart});`);
    } else {
      lines.push(`master.set('.scene-${scene.sceneId}', { opacity: 1 }, ${start});`);
    }
    lines.push(`master.set('.scene-${scene.sceneId}', { opacity: 0 }, ${end});`);
  }
  for (const scene of renderedScenes.filter((item) => item.kind === 'transition')) {
    lines.push(`master.set('.scene-${scene.sceneId}', { opacity: 0 }, 0);`);
    lines.push(`master.set('.scene-${scene.sceneId}', { opacity: 1 }, ${scene.sceneStart});`);
    lines.push(`master.set('.scene-${scene.sceneId}', { opacity: 0 }, ${scene.sceneStart + scene.duration});`);
  }
  for (let i = 0; i < contentScenes.length - 1; i++) {
    const scene = contentScenes[i];
    const spec = normalizeTransition(scene.transition);
    if (!BUILTIN_TRANSITIONS.has(spec.type) || spec.type === 'cut') continue;
    const dur = Math.min(spec.duration, scene.duration);
    const start = scene.sceneStart + scene.duration - dur;
    if (['fadeOut', 'crossfade', 'slide', 'wipe', 'zoom'].includes(spec.type)) {
      lines.push(`master.to('.scene-${scene.sceneId}', { opacity: 0, duration: ${dur}, ease: 'power1.inOut' }, ${start});`);
    }
  }
  return lines.join('\n');
}

// ---------- Top-level compile -----------------------------------------------

export function compileSCFToHTML(scf, options = {}) {
  const scfDir = options.scfDir || process.cwd();
  const profile = scf.outputProfile || {};
  const width = profile.width || 1920;
  const height = profile.height || 1080;
  const fps = profile.fps || 30;

  const projectDir = options.projectDir || scfDir;
  const repoRoot = options.repoRoot || null;
  const brandPackage = loadBrandPackage(scf.brandPackage);
  const theme = normalizeThemeFromSCF(scf, brandPackage);
  const captionConfig = normalizeCaptionConfig(scf.captions || {}, theme);
  const ctx = { cursor: 0, index: 0, scfDir, projectDir, repoRoot, width, height, brandPackage, theme, captionConfig, componentsUsed: new Set(), lottieUsed: false, threeUsed: false };
  const fontFaceCss = brandFontFaceCss(brandPackage, ctx);
  const renderedScenes = [];
  for (const scene of scf.scenes || []) {
    renderedScenes.push(renderScene(scene, ctx));
    ctx.index += 1;
  }
  const contentSceneCount = renderedScenes.length;
  const transitionOverlays = [];
  for (let i = 0; i < renderedScenes.length - 1; i++) {
    const fromScene = renderedScenes[i];
    const toScene = renderedScenes[i + 1];
    if (isComponentTransition(fromScene.transition)) {
      transitionOverlays.push(renderTransitionOverlay(fromScene, toScene, fromScene.transition, ctx));
    }
  }
  renderedScenes.push(...transitionOverlays);
  const totalDuration = ctx.cursor;

  const compositionId = scf.metadata?.id || scf.pipeline || 'slate-composition';

  // Background music
  let musicAudio = '';
  if (scf.music?.src) {
    const volume = scf.music.volume ?? 0.15;
    const musicId = `${compositionId}-music`;
    musicAudio = `<audio
      id="${escapeHtml(musicId)}"
      data-composition-id="${escapeHtml(musicId)}"
      data-start="0"
      data-duration="${totalDuration}"
      data-media-start="0"
      data-track-index="999"
      data-volume="${volume}"
      src="${escapeHtml(stageBrowserAsset(scf.music.src, { scfDir, projectDir, repoRoot }))}"
      ${scf.music.loop ? 'loop' : ''}
    ></audio>`;
  }

  const allCss = renderedScenes.map((s) => s.css).filter(Boolean).join('\n');
  const allJs = renderedScenes
    .map((s) => s.js ? `// ${s.sceneId}\n(function(){\nconst SCENE_ID=${JSON.stringify(s.sceneId)};\nconst SCENE_START=${s.sceneStart};\nconst SCENE_DURATION=${s.duration};\nconst SCENE_PROPS=${JSON.stringify(s.props || {})};\n${s.js}\n})();` : '')
    .filter(Boolean)
    .join('\n');

  let lottieVendorTag = '';
  if (ctx.lottieUsed) {
    const vendorPath = resolve(__dirname, '..', 'vendor', 'lottie-web', 'lottie_svg.min.js');
    const vendorJs = readFileSync(vendorPath, 'utf8').replace(/<\/(script)/gi, '<\\/$1');
    lottieVendorTag = `<script>/* lottie-web 5.12.2 svg renderer (MIT) — compile-time embed per Standing Rule #10 */\n${vendorJs}\n</script>`;
  }
  const lottieDriverTag = ctx.lottieUsed ? LOTTIE_DRIVER_JS : '';
  const threeImportMapTag = ctx.threeUsed ? buildThreeImportMapTag(projectDir) : '';
  const threeDriverTag = ctx.threeUsed ? THREE_DRIVER_JS : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${width}, height=${height}" />
<title>${escapeHtml(scf.metadata?.title || 'Slate Composition')}</title>
${threeImportMapTag}
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
${lottieVendorTag}
<style>
:root { color-scheme: dark; ${themeCssVars(theme)} }
${fontFaceCss}
* { box-sizing: border-box; }
html, body { margin:0; padding:0; width:${width}px; height:${height}px; background:var(--slate-bg,#120A1F); color:var(--slate-text,#F8F4EC); overflow:hidden; font-family:${formatFontFamily(brandPackage?.typography?.body?.font || 'Inter')}; }
.scene { opacity: 0; }
${allCss}
</style>
</head>
<body>
<div id="root"
  data-composition-id="${escapeHtml(compositionId)}"
  data-start="0"
  data-duration="${totalDuration}"
  data-width="${width}"
  data-height="${height}"
  style="position:relative;width:${width}px;height:${height}px;background:var(--slate-bg,#120A1F);overflow:hidden">
${renderedScenes.map((s) => s.html).join('\n')}
</div>
${musicAudio}
<script>
window.__timelines = window.__timelines || {};
window.__slateFontsReady = !document.fonts;
if (document.fonts) {
  document.fonts.ready.then(function(){ window.__slateFontsReady = true; document.documentElement.setAttribute('data-fonts-ready', 'true'); });
}
const master = gsap.timeline({ paused: true });

// Per-scene visibility — only the active scene is shown at any time
${buildSceneVisibilityJs(renderedScenes)}

// Per-layer visibility — layers with startTime/endTime are revealed/hidden
// at composition-time. CSS-id selectors are escaped for GSAP (it accepts
// '#id' selectors directly). Initial opacity is also set inline on the
// element so the very first seeked frame does not flash content that
// should still be hidden.
${renderedScenes.flatMap((s) => (s.layerVisibility || []).map((v) => {
  const sel = `'#${v.id}'`;
  const lines = [];
  // Always anchor a hidden state at t=0 so seeking backwards (or the very
  // first frame in headless render) lands in the correct state.
  if (v.initiallyHidden) {
    lines.push(`master.set(${sel}, { opacity: 0 }, 0);`);
  }
  lines.push(`master.set(${sel}, { opacity: 1 }, ${v.absStart});`);
  if (v.absEnd != null) {
    lines.push(`master.set(${sel}, { opacity: 0 }, ${v.absEnd});`);
  }
  return lines.join('\n');
})).join('\n')}

window.__timelines[${JSON.stringify(compositionId)}] = master;

${threeDriverTag}
${allJs}
${lottieDriverTag}
</script>
</body>
</html>
`;
  return { html, totalDuration, fps, width, height, sceneCount: contentSceneCount, componentsUsed: Array.from(ctx.componentsUsed) };
}

// ---------- PR 5 component prop transformers --------------------------------
//
// Lane B (PR 2) shipped AuditTrail and PolicyEnforcement consuming pre-baked
// HTML string props (eventsHtml, checksHtml, ...) which is brittle for SCF
// authors. PR 5 adds a transformer pass that lets SCF authors supply
// data-array props instead and have the renderer build the *Html strings.
// If the *Html prop is already present, the transformer leaves it alone
// (backward compatible with the smoke SCFs Lane B shipped).

function transformComponentProps(componentName, props, sceneCtx) {
  const fn = PROP_TRANSFORMERS[componentName];
  if (fn) fn(props, sceneCtx);
}

function transformStreamScene(props, sceneCtx) {
  // Emit a static <video> tag in the compiled scene HTML when videoSrc is
  // provided (videoClipMode variant). Required because @hyperframes/producer's
  // "Extracting video frames" preprocessing step scans build-time HTML for
  // <video> elements; runtime-injected videos are invisible to it and play
  // back as a frozen first frame under headless deterministic seek.
  // Markup mirrors renderVideoLayer() so the producer sees a familiar
  // contract (data-composition-id, data-start, data-duration, data-track-index).
  if (typeof props.videoElementHtml === 'string') return;
  const videoSrc = props.videoSrc;
  if (!videoSrc) {
    props.videoElementHtml = '';
    return;
  }
  // Browser loads page from http://localhost:PORT served by producer's fileServer
  // (rooted at projectDir = output/). Producer's extractAllVideoFrames also
  // resolves relative paths against projectDir. file:// URLs fail both paths:
  // mixed-content blocked in browser, mishandled by extractor on Windows.
  // Stage the asset under projectDir/assets/ and emit a relative URL.
  const stagedRelSrc = stageVideoAsset(String(videoSrc), sceneCtx);
  const compositionId = `${sceneCtx.id}-video-1`;
  props.videoElementHtml =
    `<video class="layer layer-video clip stream-video"`
    + ` id="${escapeHtml(compositionId)}"`
    + ` data-composition-id="${escapeHtml(compositionId)}"`
    + ` data-start="${sceneCtx.sceneStart}"`
    + ` data-duration="${sceneCtx.duration}"`
    + ` data-media-start="0"`
    + ` data-track-index="1"`
    + ` src="${escapeHtml(stagedRelSrc)}"`
    + ` muted playsinline`
    + `></video>`;
}

// Convert a local browser-served asset path (image, audio, or video) into a path
// relative to projectDir, copying the file into projectDir/assets/<basename>
// if it lives outside projectDir. Returns a forward-slash relative URL safe for
// the producer's localhost file server and its extractors.
function stageBrowserAsset(rawSrc, sceneCtx) {
  if (!rawSrc) return '';
  if (/^https?:|^data:/.test(rawSrc)) return rawSrc;
  let absPath;
  if (rawSrc.startsWith('file://')) {
    try { absPath = fileURLToPath(rawSrc); } catch { absPath = rawSrc; }
  } else if (isAbsolute(rawSrc)) {
    absPath = rawSrc;
  } else {
    absPath = resolve(sceneCtx.scfDir, rawSrc);
  }
  const projectDir = sceneCtx.projectDir || sceneCtx.scfDir;
  if (!existsSync(absPath)) {
    // Fallback: try resolving relative to the repo root
    if (sceneCtx.repoRoot) {
      const repoRootPath = resolve(sceneCtx.repoRoot, rawSrc);
      if (existsSync(repoRootPath)) {
        absPath = repoRootPath;
      }
    }
  }
  if (!existsSync(absPath)) {
    // Asset missing — emit an honest broken path so 404s show up loudly in
    // FileServer logs rather than being silently masked.
    return `assets/${basename(absPath)}`;
  }
  const projectDirAbs = resolve(projectDir);
  const absResolved = resolve(absPath);
  let relFromProject = absResolved.startsWith(projectDirAbs + (process.platform === 'win32' ? '\\' : '/'))
    ? absResolved.slice(projectDirAbs.length + 1)
    : null;
  if (!relFromProject) {
    // Asset lives outside projectDir → copy into projectDir/assets/.
    const assetsDir = join(projectDir, 'assets');
    if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });
    const destPath = join(assetsDir, basename(absPath));
    const needCopy = !existsSync(destPath)
      || statSync(destPath).size !== statSync(absResolved).size;
    if (needCopy) copyFileSync(absResolved, destPath);
    relFromProject = join('assets', basename(absPath));
  }
  return relFromProject.split(/[\\/]/).join('/');
}

function stageVideoAsset(rawSrc, sceneCtx) {
  return stageBrowserAsset(rawSrc, sceneCtx);
}

const PROP_TRANSFORMERS = {
  DataFlow(props) {
    // DataFlow expects stagesJson/edgesJson/legendJson/calloutsJson as JSON strings.
    // SCF authors pass stages/edges/legend/callouts as native arrays/objects.
    if (props.stages && !props.stagesJson) props.stagesJson = JSON.stringify(props.stages);
    if (props.edges && !props.edgesJson) props.edgesJson = JSON.stringify(props.edges);
    if (props.legend && !props.legendJson) props.legendJson = JSON.stringify(props.legend);
    if (props.callouts && !props.calloutsJson) props.calloutsJson = JSON.stringify(props.callouts);
  },

  DeviceStage3D(props, sceneCtx) {
    // Default the optional copy props so {{title}} / {{subtitle}} don't appear
    // literally in the rendered DOM when the SCF omits them.
    if (props.title == null) props.title = '';
    if (props.subtitle == null) props.subtitle = '';
    if (props.mode == null) props.mode = 'browser';
    if (props.primaryColor == null) props.primaryColor = '#8B5CF6';
    if (props.accentColor == null) props.accentColor = '#E7D7A2';
    if (props.seed == null) props.seed = '';
    // Stage the screen image through the localhost file server so WebGL can
    // load it CORS-cleanly via THREE.TextureLoader.
    if (typeof props.screenSrc === 'string' && props.screenSrc.trim() && sceneCtx) {
      props.screenSrc = stageBrowserAsset(props.screenSrc, sceneCtx);
    } else {
      props.screenSrc = '';
    }
  },

  HTMLTextureWall(props, sceneCtx) {
    if (props.title == null) props.title = '';
    if (props.mode == null) props.mode = 'wall';
    if (props.primaryColor == null) props.primaryColor = '#8B5CF6';
    if (props.accentColor == null) props.accentColor = '#E7D7A2';
    if (props.seed == null) props.seed = '';
    // cards: array of {title, subtitle, kicker} → JSON string for data attr.
    if (Array.isArray(props.cards) && !props.cardsJson) {
      props.cardsJson = JSON.stringify(props.cards);
    }
    if (!props.cardsJson) props.cardsJson = '[]';
    // textureSrcs: array of image paths. Stage each into the localhost server
    // root so WebGL can load CORS-cleanly, then JSON-encode for the data attr.
    if (Array.isArray(props.textureSrcs) && sceneCtx) {
      const staged = props.textureSrcs.map((src) =>
        typeof src === 'string' && src.trim() ? stageBrowserAsset(src, sceneCtx) : ''
      ).filter(Boolean);
      props.textureSrcsJson = JSON.stringify(staged);
    }
    if (!props.textureSrcsJson) props.textureSrcsJson = '[]';
  },

  TeamsScene: transformTeamsScene,
  OutlookScene: transformOutlookScene,
  VSCodeScene: transformVSCodeScene,
  GitHubScene: transformGitHubScene,
  StreamScene: transformStreamScene,
  ListsScene: transformListsScene,
  PlannerScene: transformPlannerScene,
  OneDriveScene: transformOneDriveScene,
  FormsScene: transformFormsScene,
  BookingsScene: transformBookingsScene,

  MetricsCard(props) {
    // subMetrics array → HTML string for {{{subMetricsHtml}}} placeholder
    if (Array.isArray(props.subMetrics) && !props.subMetricsHtml) {
      props.subMetricsHtml = props.subMetrics.map(m =>
        `<div class="mc-sub" style="flex:1;padding:20px 24px;border-radius:16px;`
        + `background:rgba(30,41,59,0.55);border:1px solid rgba(148,163,184,0.12);`
        + `text-align:center;opacity:0">`
        + `<span style="display:block;font-size:20px;font-weight:500;color:rgba(255,255,255,0.50);`
        + `letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px">${escapeHtml(m.label || '')}</span>`
        + `<span style="display:block;font-size:36px;font-weight:700;color:#e2e8f0">${escapeHtml(m.value || '')}</span>`
        + `</div>`
      ).join('');
    }
    if (!props.subMetricsHtml) props.subMetricsHtml = '';
  },

  MetricStack(props) {
    // metrics array → JSON string for data-metrics-json attribute
    if (Array.isArray(props.metrics) && !props.metricsJson) {
      props.metricsJson = JSON.stringify(props.metrics);
    }
    if (!props.metricsJson) props.metricsJson = '[]';
  },

  PALReviewSurface(props) {
    const fileRows = Array.isArray(props.changedFiles) ? props.changedFiles : [
      { path: '/src/Financials.RevRec.Models/Balance/MACC.cs', badge: 'model' },
      { path: '/src/Financials.RevRec.StorageContracts/Balance/MACCStorageContractV1.cs', badge: 'contract' },
    ];
    props.changedFilesHtml = props.changedFilesHtml || fileRows.map((file) => (
      `<div class="pal-file-row"><div class="pal-file-icon">Y</div><div class="pal-file-path">${escapeHtml(file.path || file)}</div><div class="pal-file-badge">${escapeHtml(file.badge || 'changed')}</div></div>`
    )).join('');

    const impactRows = Array.isArray(props.impactRows) ? props.impactRows : [
      { directory: 'src/Financials.RevRec.Models/Balance', file: 'MACC.cs', sharedWith: 'BFG.Collector.EventCollector', contacts: ['viravula', 'asathy'], count: 24 },
      { directory: 'src/Financials.RevRec.StorageContracts/Balance', file: 'MACCStorageContractV1.cs', sharedWith: 'CFS-Financials-Ledger', contacts: ['swegh', 'jonalexa'], count: 1 },
      { directory: 'src/Financials.RevRec.StorageContracts/Balance', file: 'MACCStorageContractV1.cs', sharedWith: 'CFS-Financials-Revenue-Consumer', contacts: ['ConsumerCRSDev'], count: 4 },
    ];
    props.impactRowsHtml = props.impactRowsHtml || impactRows.map((row) => {
      const contacts = (Array.isArray(row.contacts) ? row.contacts : String(row.contacts || '').split(',')).filter(Boolean);
      return `<tr class="pal-impact-row"><td><span class="pal-code">${escapeHtml(row.directory || '')}</span></td><td><span class="pal-code">${escapeHtml(row.file || '')}</span></td><td>${escapeHtml(row.sharedWith || '')}</td><td>${contacts.map((contact) => `<span class="pal-owner">${escapeHtml(contact)}</span>`).join('')}</td><td>${escapeHtml(row.count || '')}</td></tr>`;
    }).join('');

    const reviewers = Array.isArray(props.reviewers) ? props.reviewers : ['Rujuta Marathe', 'Sumouli Choudhury'];
    props.reviewerChipsHtml = props.reviewerChipsHtml || reviewers.map((reviewer) => {
      const name = typeof reviewer === 'string' ? reviewer : reviewer.name;
      const initials = String(name || 'PAL').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
      return `<div class="pal-reviewer"><div class="pal-reviewer-initial">${escapeHtml(initials)}</div><div><b>${escapeHtml(name || '')}</b><span>Added as reviewer</span></div></div>`;
    }).join('');

    const kpis = Array.isArray(props.kpis) ? props.kpis : [
      { label: 'Total repos', value: 36 },
      { label: 'Onboarded repos', value: 9 },
      { label: 'Onboarded PRs', value: 1188 },
      { label: 'Flagged PRs', value: 6 },
    ];
    props.kpisHtml = props.kpisHtml || kpis.map((kpi) => (
      `<div class="pal-kpi"><div class="pal-kpi-num">${escapeHtml(kpi.value || 0)}</div><div class="pal-kpi-label">${escapeHtml(kpi.label || '')}</div></div>`
    )).join('');

    const flagged = Array.isArray(props.flaggedRows) ? props.flaggedRows : [
      { pr: '15589558', title: '[MACC ACO Blending] Use MACCPurchaseDate for 30-day blending window', badge: 'flagged' },
      { pr: 'Contract map', title: 'Shared Balance contract directory detected in downstream repos', badge: 'review' },
    ];
    props.flaggedRowsHtml = props.flaggedRowsHtml || flagged.map((row) => (
      `<div class="pal-report-row"><div class="pal-report-pr">${escapeHtml(row.pr || '')}</div><div class="pal-report-copy">${escapeHtml(row.title || '')}</div><div class="pal-report-pill">${escapeHtml(row.badge || 'flagged')}</div></div>`
    )).join('');

    const repos = Array.isArray(props.repos) ? props.repos : [
      'CFS-Financials-Revenue',
      'CFS-Financials-Ledger',
      'BFG.Collector.EventCollector',
      'finplat-egress',
      'CFS-Financials-Revenue-Consumer',
    ];
    props.repoPillsHtml = props.repoPillsHtml || repos.map((repo) => `<span class="pal-repo-pill">${escapeHtml(repo)}</span>`).join('');

    props.mode = props.mode || 'pr-detection';
    props.repoName = props.repoName || 'CFS-Financials-Revenue';
    props.branchName = props.branchName || 'feature/macc-aco-blending';
    props.prId = props.prId || '15589558';
    props.prTitle = props.prTitle || '[MACC ACO Blending] Use MACCPurchaseDate for 30-day blending window';
    props.eyebrow = props.eyebrow || 'Cross-Repo Contract Review';
    props.title = props.title || 'PAL reviews the PR before the incident exists';
    props.subtitle = props.subtitle || 'Contract changes are matched against downstream dependencies and routed to the right owners automatically.';
    props.statusText = props.statusText || 'Scanning changed files';
    props.scanLabel = props.scanLabel || 'GitOps PR Assistant scan';
  },

  BookPageMetrics(props, sceneCtx) {
    if (typeof props.pageImage === 'string' && props.pageImage.trim() && sceneCtx) {
      props.pageImage = stageBrowserAsset(props.pageImage, sceneCtx);
    }

    if (typeof props.overlayHtml !== 'string' && props.overlay && typeof props.overlay === 'object') {
      const overlayComponent = props.overlay.component;
      if (overlayComponent && overlayComponent !== 'BookPageMetrics' && KNOWN_COMPONENTS.has(overlayComponent)) {
        const overlayTemplate = loadComponent(overlayComponent);
        if (sceneCtx?.compileCtx?.componentsUsed) sceneCtx.compileCtx.componentsUsed.add(overlayComponent);
        const overlayProps = resolveNestedAssetPaths({ ...(props.overlay.props || {}) }, sceneCtx.scfDir, 0);
        applyBrandDefaults(overlayProps, sceneCtx);
        transformComponentProps(overlayComponent, overlayProps, sceneCtx);
        props.overlayHtml = templateString(overlayTemplate.html, {
          ...overlayProps,
          sceneId: sceneCtx.id,
          duration: sceneCtx.duration,
        });
      }
    }
    if (typeof props.overlayHtml !== 'string') props.overlayHtml = '';

    if (typeof props.metricsFallbackHtml !== 'string') {
      const fallbackRows = [
        [props.metric1Value, props.metric1Label],
        [props.metric2Value, props.metric2Label],
        [props.metric3Value, props.metric3Label],
      ].filter(([value, label]) => String(value || '').trim() || String(label || '').trim());
      props.metricsFallbackHtml = fallbackRows.length
        ? `<div class="book-page-fallback">${fallbackRows.map(([value, label]) => (
          `<div class="book-page-fallback-item"><div class="book-page-fallback-value">${escapeHtml(value || '')}</div><div class="book-page-fallback-label">${escapeHtml(label || '')}</div></div>`
        )).join('')}</div>`
        : '';
    }
  },

  AuditTrail(props) {
    if (typeof props.eventsHtml === 'string') return;
    if (!Array.isArray(props.events)) {
      props.eventsHtml = '';
      return;
    }
    props.eventsHtml = props.events.map((evt, idx) => {
      const id = escapeHtml(evt.id || `evt-${idx}`);
      const highlighted = evt.highlighted ? 'true' : 'false';
      const ts = escapeHtml(evt.ts || '');
      const icon = escapeHtml(evt.icon || '•');
      const actor = escapeHtml(evt.actor || '');
      const action = escapeHtml(evt.action || '');
      const target = escapeHtml(evt.target || '');
      const result = (evt.result || 'success').toString();
      const resultLabel = escapeHtml(evt.resultLabel || (result === 'success' ? '✓' : '✗'));
      const corr = evt.corr ? `<span class="at-corr">${escapeHtml(evt.corr)}</span>` : '';
      return `<div class="at-event" id="${id}" data-highlighted="${highlighted}">`
           + `<div class="at-dot-wrap"><div class="at-dot"></div></div>`
           + `<div class="at-card">`
           +   `<div class="at-card-head"><span class="at-ts">${ts}</span><span class="at-icon">${icon}</span></div>`
           +   `<div class="at-card-body"><span class="at-actor">${actor}</span> ${action} <span class="at-target">${target}</span></div>`
           +   `<div class="at-card-meta"><span class="at-result" data-result="${escapeHtml(result)}">${resultLabel}</span>${corr}</div>`
           + `</div></div>`;
    }).join('');
  },

  PolicyEnforcement(props) {
    // request → requestHtml
    if (typeof props.requestHtml !== 'string' && props.request) {
      const r = props.request;
      const label = escapeHtml(r.label || 'Incoming Request');
      const actor = escapeHtml(r.actor || '');
      const action = escapeHtml(r.action || 'requests access to');
      const resource = escapeHtml(r.resource || '');
      props.requestHtml = `<div class="pe-request-label">${label}</div>`
                        + `<div class="pe-request-body"><span class="pe-actor">${actor}</span> ${action} <span class="pe-resource">${resource}</span></div>`;
    }

    // checks[] → checksHtml
    if (typeof props.checksHtml !== 'string' && Array.isArray(props.checks)) {
      props.checksHtml = props.checks.map((chk) => {
        const outcome = (chk.outcome || 'pass').toString();
        const stamp = escapeHtml(chk.stamp || (outcome === 'pass' ? '✓' : '✗'));
        const name = escapeHtml(chk.name || '');
        const detail = escapeHtml(chk.detail || '');
        return `<div class="pe-check"><div class="pe-stamp" data-outcome="${escapeHtml(outcome)}">${stamp}</div>`
             + `<div><div class="pe-check-name">${name}</div><div class="pe-check-detail">${detail}</div></div></div>`;
      }).join('');
    }

    // decision → decisionHtml
    if (typeof props.decisionHtml !== 'string' && props.decision) {
      const d = props.decision;
      const icon = escapeHtml(d.icon || (d.outcome === 'allow' ? '✅' : '🚫'));
      const text = escapeHtml(d.text || (d.outcome === 'allow' ? 'Allow' : 'Deny'));
      const reason = escapeHtml(d.reason || '');
      props.decisionHtml = `<div class="pe-decision-icon">${icon}</div>`
                         + `<div><div class="pe-decision-text">${text}</div><div class="pe-decision-reason">${reason}</div></div>`;
    }

    // ruleCitation (string OR object) → ruleCitationHtml
    if (typeof props.ruleCitationHtml !== 'string' && props.ruleCitation != null) {
      props.ruleCitationHtml = typeof props.ruleCitation === 'string'
        ? escapeHtml(props.ruleCitation)
        : escapeHtml(props.ruleCitation.text || '');
    }

    // auditRef → auditRefHtml (chip linking to an AuditTrail event by id)
    if (typeof props.auditRefHtml !== 'string' && props.auditRef) {
      const ref = String(props.auditRef);
      props.auditRefHtml = `<span class="pe-audit-chip">↪ ${escapeHtml(ref)}</span>`;
    }

    // Defaults so the template never leaks `{{{...}}}` literals.
    if (typeof props.requestHtml !== 'string') props.requestHtml = '';
    if (typeof props.checksHtml !== 'string') props.checksHtml = '';
    if (typeof props.decisionHtml !== 'string') props.decisionHtml = '';
    if (typeof props.ruleCitationHtml !== 'string') props.ruleCitationHtml = '';
    if (typeof props.auditRefHtml !== 'string') props.auditRefHtml = '';
  },

  // PR 3 — pre-stringify JSON props so SCF authors can write natural
  // arrays/objects. If the *Json prop is already a string (smoke SCFs
  // pre-stringify), it is left untouched.
  PricingTable(props) {
    if (Array.isArray(props.tiers) && typeof props.tiersJson !== 'string') {
      props.tiersJson = JSON.stringify(props.tiers);
    }
    if (typeof props.tiersJson !== 'string') props.tiersJson = '[]';
  },

  CompetitiveMatrix(props) {
    if (Array.isArray(props.products) && typeof props.productsJson !== 'string') {
      props.productsJson = JSON.stringify(props.products);
    }
    if (Array.isArray(props.features) && typeof props.featuresJson !== 'string') {
      props.featuresJson = JSON.stringify(props.features);
    }
    if (Array.isArray(props.footnotes) && typeof props.footnotesJson !== 'string') {
      props.footnotesJson = JSON.stringify(props.footnotes);
    }
    if (typeof props.productsJson !== 'string') props.productsJson = '[]';
    if (typeof props.featuresJson !== 'string') props.featuresJson = '[]';
    if (typeof props.footnotesJson !== 'string') props.footnotesJson = '[]';
  },

  CustomerStory(props) {
    if (Array.isArray(props.metrics) && typeof props.metricsJson !== 'string') {
      props.metricsJson = JSON.stringify(props.metrics);
    }
    if (typeof props.metricsJson !== 'string') props.metricsJson = '[]';
  },

  ROICalculator(props) {
    if (Array.isArray(props.inputs) && typeof props.inputsJson !== 'string') {
      props.inputsJson = JSON.stringify(props.inputs);
    }
    if (props.formula && typeof props.formula === 'object' && typeof props.formulaJson !== 'string') {
      props.formulaJson = JSON.stringify(props.formula);
    }
    if (props.result && typeof props.result === 'object' && typeof props.resultJson !== 'string') {
      props.resultJson = JSON.stringify(props.result);
    }
    if (Array.isArray(props.steps) && typeof props.stepsJson !== 'string') {
      props.stepsJson = JSON.stringify(props.steps);
    }
    if (Array.isArray(props.sensitivity) && typeof props.sensitivityJson !== 'string') {
      props.sensitivityJson = JSON.stringify(props.sensitivity);
    }
    if (typeof props.inputsJson !== 'string') props.inputsJson = '[]';
    if (typeof props.formulaJson !== 'string') props.formulaJson = '{}';
    if (typeof props.resultJson !== 'string') props.resultJson = '{}';
    if (typeof props.stepsJson !== 'string') props.stepsJson = '[]';
    if (typeof props.sensitivityJson !== 'string') props.sensitivityJson = '[]';
  },

  // PR 4 — PM / EM release pack
  Roadmap(props) {
    if (Array.isArray(props.swimlanes) && typeof props.swimlanesJson !== 'string') {
      props.swimlanesJson = JSON.stringify(props.swimlanes);
    }
    if (Array.isArray(props.milestones) && typeof props.milestonesJson !== 'string') {
      props.milestonesJson = JSON.stringify(props.milestones);
    }
    if (Array.isArray(props.legend) && typeof props.legendJson !== 'string') {
      props.legendJson = JSON.stringify(props.legend);
    }
    if (props.todayMarker && typeof props.todayMarker === 'object'
        && typeof props.todayMarkerJson !== 'string') {
      props.todayMarkerJson = JSON.stringify(props.todayMarker);
    }
    if (typeof props.swimlanesJson !== 'string') props.swimlanesJson = '[]';
    if (typeof props.milestonesJson !== 'string') props.milestonesJson = '[]';
    if (typeof props.legendJson !== 'string') props.legendJson = '[]';
    if (typeof props.todayMarkerJson !== 'string') props.todayMarkerJson = 'null';
  },

  BurnDown(props) {
    if (Array.isArray(props.plan) && typeof props.planJson !== 'string') {
      props.planJson = JSON.stringify(props.plan);
    }
    if (Array.isArray(props.actual) && typeof props.actualJson !== 'string') {
      props.actualJson = JSON.stringify(props.actual);
    }
    if (Array.isArray(props.forecast) && typeof props.forecastJson !== 'string') {
      props.forecastJson = JSON.stringify(props.forecast);
    }
    if (Array.isArray(props.highlights) && typeof props.highlightsJson !== 'string') {
      props.highlightsJson = JSON.stringify(props.highlights);
    }
    if (typeof props.planJson !== 'string') props.planJson = '[]';
    if (typeof props.actualJson !== 'string') props.actualJson = '[]';
    if (typeof props.forecastJson !== 'string') props.forecastJson = '[]';
    if (typeof props.highlightsJson !== 'string') props.highlightsJson = '[]';
  },

  OKRStatus(props) {
    if (Array.isArray(props.keyResults) && typeof props.keyResultsJson !== 'string') {
      props.keyResultsJson = JSON.stringify(props.keyResults);
    }
    if (typeof props.keyResultsJson !== 'string') props.keyResultsJson = '[]';
  },

  ReleaseNotes(props) {
    if (Array.isArray(props.features) && typeof props.featuresJson !== 'string') {
      props.featuresJson = JSON.stringify(props.features);
    }
    if (Array.isArray(props.fixes) && typeof props.fixesJson !== 'string') {
      props.fixesJson = JSON.stringify(props.fixes);
    }
    if (Array.isArray(props.breakingChanges) && typeof props.breakingChangesJson !== 'string') {
      props.breakingChangesJson = JSON.stringify(props.breakingChanges);
    }
    if (Array.isArray(props.links) && typeof props.linksJson !== 'string') {
      props.linksJson = JSON.stringify(props.links);
    }
    if (typeof props.featuresJson !== 'string') props.featuresJson = '[]';
    if (typeof props.fixesJson !== 'string') props.fixesJson = '[]';
    if (typeof props.breakingChangesJson !== 'string') props.breakingChangesJson = '[]';
    if (typeof props.linksJson !== 'string') props.linksJson = '[]';
  },

  // PR 6 — Education + Event pack
  Quiz(props) {
    if (Array.isArray(props.options) && typeof props.optionsJson !== 'string') {
      props.optionsJson = JSON.stringify(props.options);
    }
    if (props.scoreBadge && typeof props.scoreBadge === 'object'
        && typeof props.scoreBadgeJson !== 'string') {
      props.scoreBadgeJson = JSON.stringify(props.scoreBadge);
    }
    if (typeof props.optionsJson !== 'string') props.optionsJson = '[]';
    if (typeof props.scoreBadgeJson !== 'string') props.scoreBadgeJson = 'null';
  },

  TerminologyCard(props) {
    if (Array.isArray(props.doNotConfuseWith) && typeof props.doNotConfuseWithJson !== 'string') {
      props.doNotConfuseWithJson = JSON.stringify(props.doNotConfuseWith);
    }
    if (typeof props.doNotConfuseWithJson !== 'string') props.doNotConfuseWithJson = '[]';
  },

  ProgressBar(props) {
    if (Array.isArray(props.sections) && typeof props.sectionsJson !== 'string') {
      props.sectionsJson = JSON.stringify(props.sections);
    }
    if (Array.isArray(props.milestones) && typeof props.milestonesJson !== 'string') {
      props.milestonesJson = JSON.stringify(props.milestones);
    }
    if (typeof props.sectionsJson !== 'string') props.sectionsJson = '[]';
    if (typeof props.milestonesJson !== 'string') props.milestonesJson = '[]';
  },

  TerminalCast(props) {
    if (Array.isArray(props.commands) && typeof props.commandsJson !== 'string') {
      props.commandsJson = JSON.stringify(props.commands);
    }
    if (Array.isArray(props.zoomMoments) && typeof props.zoomMomentsJson !== 'string') {
      props.zoomMomentsJson = JSON.stringify(props.zoomMoments);
    }
    if (props.sessionBranding && typeof props.sessionBranding === 'object'
        && typeof props.sessionBrandingJson !== 'string') {
      props.sessionBrandingJson = JSON.stringify(props.sessionBranding);
    }
    if (typeof props.commandsJson !== 'string') props.commandsJson = '[]';
    if (typeof props.zoomMomentsJson !== 'string') props.zoomMomentsJson = '[]';
    if (typeof props.sessionBrandingJson !== 'string') props.sessionBrandingJson = 'null';
  },

  PresenterBug(props) {
    if (Array.isArray(props.social) && typeof props.socialJson !== 'string') {
      props.socialJson = JSON.stringify(props.social);
    }
    if (typeof props.socialJson !== 'string') props.socialJson = '[]';
  },

  EventBranding(props, sceneCtx) {
    if (Array.isArray(props.sponsorLockups) && typeof props.sponsorLockupsJson !== 'string') {
      props.sponsorLockupsJson = JSON.stringify(props.sponsorLockups);
    }
    if (typeof props.sponsorLockupsJson !== 'string') props.sponsorLockupsJson = '[]';
    // PR 9 Lane B — optional Lottie theme-art background
    if (props.themeArtLottieSrc && sceneCtx) {
      const id = `${sceneCtx.id}-eb-bg-lottie`;
      const embed = compileLottieEmbed({
        src: props.themeArtLottieSrc,
        instanceId: id,
        sceneId: sceneCtx.id,
        loop: true, speed: 1, sceneStart: sceneCtx.sceneStart,
        sceneDuration: sceneCtx.duration, ctx: sceneCtx.compileCtx,
        scfDir: sceneCtx.scfDir,
      });
      props._lottieThemeArtContainer = embed.containerHtml;
      props._lottieThemeArtDataIsland = embed.dataIslandHtml;
    }
    if (typeof props._lottieThemeArtContainer !== 'string') props._lottieThemeArtContainer = '';
    if (typeof props._lottieThemeArtDataIsland !== 'string') props._lottieThemeArtDataIsland = '';
  },

  // PR 9 Lane B — Lottie tile type in ScrollingBackground layers
  ScrollingBackground(props, sceneCtx) {
    if (Array.isArray(props.layers) && typeof props.layersJson !== 'string') {
      props.layersJson = JSON.stringify(props.layers);
    }
    if (typeof props.layersJson !== 'string') props.layersJson = '[]';
    // Walk layers and embed Lottie data at compile time for any lottie tiles.
    const lottieIslands = [];
    if (Array.isArray(props.layers) && sceneCtx) {
      props.layers.forEach((lyr, li) => {
        // Layer-level lottie type (flat structure: { type: "lottie", src: "..." })
        if (lyr.type === 'lottie' && lyr.src) {
          const id = `${sceneCtx.id}-sb-lyr${li}`;
          const embed = compileLottieEmbed({
            src: lyr.src, instanceId: id, sceneId: sceneCtx.id,
            loop: lyr.loop !== false, speed: lyr.speed,
            sceneStart: sceneCtx.sceneStart,
            sceneDuration: sceneCtx.duration,
            ctx: sceneCtx.compileCtx, scfDir: sceneCtx.scfDir,
          });
          lyr._lottieDataIslandId = `lottie-data-${id}`;
          lyr._lottieFrameRate = embed.frameRate;
          lottieIslands.push(embed.dataIslandHtml);
        }
        // Nested tiles structure (if present)
        if (Array.isArray(lyr.tiles)) {
          lyr.tiles.forEach((tile, ti) => {
            if (tile.type === 'lottie' && tile.src) {
              const id = `${sceneCtx.id}-sb-lyr${li}-tile${ti}`;
              const embed = compileLottieEmbed({
                src: tile.src, instanceId: id, sceneId: sceneCtx.id,
                loop: tile.loop !== false, speed: tile.speed,
                sceneStart: sceneCtx.sceneStart,
                sceneDuration: sceneCtx.duration,
                ctx: sceneCtx.compileCtx, scfDir: sceneCtx.scfDir,
              });
              tile._lottieDataIslandId = `lottie-data-${id}`;
              tile._lottieFrameRate = embed.frameRate;
              lottieIslands.push(embed.dataIslandHtml);
            }
          });
        }
      });
      // Re-stringify after mutation
      props.layersJson = JSON.stringify(props.layers);
    }
    props._lottieDataIslands = lottieIslands.join('\n');
  },

  // PR 9 Lane B — Lottie icon in ComplianceBadgeWall badges
  ComplianceBadgeWall(props, sceneCtx) {
    if (Array.isArray(props.badges) && typeof props.badgesJson !== 'string') {
      props.badgesJson = JSON.stringify(props.badges);
    }
    if (typeof props.badgesJson !== 'string') props.badgesJson = '[]';
    const lottieIslands = [];
    if (Array.isArray(props.badges) && sceneCtx) {
      props.badges.forEach((badge, bi) => {
        if (badge.iconLottieSrc) {
          const id = `${sceneCtx.id}-cbw-badge${bi}`;
          const embed = compileLottieEmbed({
            src: badge.iconLottieSrc, instanceId: id, sceneId: sceneCtx.id,
            loop: true, speed: 1,
            sceneStart: sceneCtx.sceneStart,
            sceneDuration: sceneCtx.duration,
            ctx: sceneCtx.compileCtx, scfDir: sceneCtx.scfDir,
          });
          badge._lottieDataIslandId = `lottie-data-${id}`;
          badge._lottieFrameRate = embed.frameRate;
          lottieIslands.push(embed.dataIslandHtml);
        }
      });
      props.badgesJson = JSON.stringify(props.badges);
    }
    props._lottieDataIslands = lottieIslands.join('\n');
  },

  AskTheAudience(props) {
    if (Array.isArray(props.results) && typeof props.resultsJson !== 'string') {
      props.resultsJson = JSON.stringify(props.results);
    }
    if (typeof props.resultsJson !== 'string') props.resultsJson = '[]';
  },

  StepByStep(props) {
    if (typeof props.stepsHtml === 'string') return;
    if (!Array.isArray(props.steps)) {
      props.stepsHtml = '';
      return;
    }
    props.stepsHtml = props.steps.map((step, idx) => {
      const num = escapeHtml(String(step.number ?? idx + 1));
      const title = escapeHtml(step.title || '');
      const desc = escapeHtml(step.description || '');
      return `<div class="sbs-step" style="display:flex;align-items:center;gap:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px 32px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0">`
           + `<div class="sbs-num" style="flex:0 0 56px;width:56px;height:56px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);font-size:28px;font-weight:800;color:#818cf8;opacity:0">${num}</div>`
           + `<div style="flex:1;min-width:0"><div style="font-size:26px;font-weight:700;color:#FFFFFF;margin-bottom:4px">${title}</div>`
           + `<div style="font-size:20px;font-weight:400;color:rgba(255,255,255,0.6);line-height:1.4">${desc}</div></div></div>`;
    }).join('');
  },

  CalloutPin(props) {
    // Provide sensible defaults for position props
    if (!props.x) props.x = '50';
    if (!props.y) props.y = '40';
    if (!props.labelX) props.labelX = '50';
    if (!props.labelY) props.labelY = '58';
    if (!props.pinColor) props.pinColor = '#f59e0b';
    // Compute glow color from pinColor (same color at 70% opacity)
    props.pinGlow = props.pinColor + 'b3';
    if (!props.baseSrc) props.baseSrc = '';
  },

  CompareSlider(props) {
    if (typeof props.itemsHtml === 'string') return;
    if (!Array.isArray(props.items)) {
      props.itemsHtml = '';
      return;
    }
    if (!props.leftLabel) props.leftLabel = 'Before';
    if (!props.rightLabel) props.rightLabel = 'After';
    props.itemsHtml = props.items.map((item) => {
      const label = escapeHtml(item.label || '');
      const left = escapeHtml(item.left || '');
      const right = escapeHtml(item.right || '');
      return `<div class="cs-row" style="display:flex;align-items:center;gap:24px;opacity:0">`
           + `<div style="flex:0 0 200px;font-size:22px;font-weight:600;color:rgba(255,255,255,0.8)">${label}</div>`
           + `<div style="flex:1;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:18px 24px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)">`
           + `<span style="font-size:24px;font-weight:700;color:rgba(239,68,68,0.95)">${left}</span></div>`
           + `<div style="flex:1;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:18px 24px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)">`
           + `<span style="font-size:24px;font-weight:700;color:rgba(34,197,94,0.95)">${right}</span></div></div>`;
    }).join('');
  },
};
