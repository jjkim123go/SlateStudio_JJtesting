/*
 * DataChart
 * Purpose: Initialize deterministic inline-SVG charts and animate them on Slate's master timeline.
 * Props consumed: chartType, title, subtitle, labels, series, unit, showLegend, showGridlines, theme, animateOnEnter
 */
if (typeof master?.paused === 'function' && !master.paused()) {
  master.pause();
}

const root = document.querySelector('.scene-' + SCENE_ID + ' .dc-root');
if (!root) {
  return;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const palette = ['#2563eb', '#14b8a6', '#f97316', '#a855f7', '#ec4899', '#eab308', '#38bdf8', '#22c55e'];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseBoolean(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  return !/^(false|0|no)$/i.test(String(value).trim());
}

function tryJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[\[{"]/.test(trimmed)) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function parseStringArray(value) {
  const parsed = tryJson(value);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => String(item));
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value !== 'string') return [];
  return value
    .split(/\s*\|\|\s*|\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSeriesItem(item, index) {
  const values = Array.isArray(item?.values)
    ? item.values.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];
  return {
    name: String(item?.name || `Series ${index + 1}`),
    values,
    color: item?.color || palette[index % palette.length],
  };
}

function parseSeries(value) {
  const parsed = tryJson(value);
  if (Array.isArray(parsed)) {
    return parsed.map(normalizeSeriesItem).filter((item) => item.values.length);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeSeriesItem).filter((item) => item.values.length);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(/\s*;\s*/)
    .map((chunk, index) => {
      const [namePart, valuesPart, colorPart] = chunk.split(':');
      const values = String(valuesPart || '')
        .split(/\s*,\s*/)
        .map((part) => Number(part))
        .filter((num) => Number.isFinite(num));
      return normalizeSeriesItem({ name: namePart, values, color: colorPart }, index);
    })
    .filter((item) => item.values.length);
}

function formatNumber(value) {
  const abs = Math.abs(value);
  const decimals = abs >= 100 || Number.isInteger(value) ? 0 : abs >= 10 ? 1 : 2;
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatValue(value, unit) {
  const numeric = Number(value) || 0;
  const formatted = formatNumber(numeric);
  const normalizedUnit = String(unit || '').trim();
  if (!normalizedUnit) return formatted;
  if (/^[€£$]/.test(normalizedUnit)) return `${normalizedUnit}${formatted}`;
  if (/^%$/.test(normalizedUnit)) return `${formatted}${normalizedUnit}`;
  return `${formatted} ${normalizedUnit}`;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function svgNode(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function niceMax(value) {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * Math.pow(10, exponent);
}

function buildLegend(entries, unit) {
  const list = root.querySelector('.dc-legend-list');
  clearNode(list);
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'dc-legend-entry';

    const swatch = document.createElement('span');
    swatch.className = 'dc-legend-swatch';
    swatch.style.background = entry.color;

    const labelWrap = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'dc-legend-name';
    name.textContent = entry.name;
    labelWrap.appendChild(name);
    if (entry.subtext) {
      const sub = document.createElement('span');
      sub.className = 'dc-legend-sub';
      sub.textContent = entry.subtext;
      labelWrap.appendChild(sub);
    }

    const valueEl = document.createElement('div');
    valueEl.className = 'dc-legend-value dc-number';
    valueEl.dataset.target = String(entry.value);
    valueEl.dataset.unit = entry.unitOverride ?? unit ?? '';
    valueEl.textContent = formatValue(0, entry.unitOverride ?? unit);

    item.appendChild(swatch);
    item.appendChild(labelWrap);
    item.appendChild(valueEl);
    list.appendChild(item);
  });
}

function renderCartesian(svg, chartType, labels, series, showGridlines, unit) {
  const chartGroup = svgNode('g');
  const plot = { left: 104, top: 48, right: 952, bottom: 520 };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  const allValues = series.flatMap((item) => item.values);
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(0, ...allValues);
  const rangeTop = niceMax(maxValue === minValue ? Math.abs(maxValue || 1) : maxValue);
  const rangeBottom = minValue < 0 ? -niceMax(Math.abs(minValue)) : 0;
  const valueRange = rangeTop - rangeBottom || 1;
  const tickCount = 5;

  const valueToY = (value) => plot.bottom - ((value - rangeBottom) / valueRange) * plotHeight;
  const zeroY = valueToY(0);
  const xStep = labels.length > 1 ? plotWidth / labels.length : plotWidth;

  if (showGridlines) {
    for (let index = 0; index <= tickCount; index += 1) {
      const tickValue = rangeBottom + (valueRange / tickCount) * index;
      const y = valueToY(tickValue);
      const line = svgNode('line', {
        x1: plot.left,
        y1: y,
        x2: plot.right,
        y2: y,
        class: 'dc-gridline',
      });
      chartGroup.appendChild(line);

      const text = svgNode('text', {
        x: plot.left - 16,
        y: y + 6,
        class: 'dc-axis-number dc-number',
        'text-anchor': 'end',
        'data-target': tickValue,
        'data-unit': unit || '',
      });
      text.textContent = formatValue(0, unit);
      chartGroup.appendChild(text);
    }
  }

  chartGroup.appendChild(svgNode('line', {
    x1: plot.left,
    y1: zeroY,
    x2: plot.right,
    y2: zeroY,
    class: 'dc-domain',
  }));

  labels.forEach((label, labelIndex) => {
    const xCenter = plot.left + xStep * labelIndex + xStep / 2;
    const labelText = svgNode('text', {
      x: xCenter,
      y: plot.bottom + 38,
      class: 'dc-axis-label',
      'text-anchor': 'middle',
    });
    labelText.textContent = label;
    chartGroup.appendChild(labelText);
  });

  if (chartType === 'bar') {
    const groupWidth = xStep * 0.7;
    const slotWidth = groupWidth / Math.max(series.length, 1);
    const barWidth = slotWidth * 0.68;
    series.forEach((item, seriesIndex) => {
      item.values.forEach((value, valueIndex) => {
        const x = plot.left + xStep * valueIndex + (xStep - groupWidth) / 2 + slotWidth * seriesIndex + (slotWidth - barWidth) / 2;
        const y = Math.min(valueToY(value), zeroY);
        const height = Math.max(Math.abs(zeroY - valueToY(value)), 0.001);
        const rect = svgNode('rect', {
          x,
          y,
          width: barWidth,
          height,
          rx: 10,
          class: 'dc-bar',
          fill: item.color,
          'fill-opacity': 0.96,
        });
        chartGroup.appendChild(rect);

        const valueLabel = svgNode('text', {
          x: x + barWidth / 2,
          y: value >= 0 ? y - 12 : y + height + 26,
          class: 'dc-point-value dc-number',
          'text-anchor': 'middle',
          'data-target': value,
          'data-unit': unit || '',
        });
        valueLabel.textContent = formatValue(0, unit);
        chartGroup.appendChild(valueLabel);
      });
    });
  } else {
    series.forEach((item) => {
      const points = item.values.map((value, index) => {
        const x = plot.left + xStep * index + xStep / 2;
        const y = valueToY(value);
        return { x, y, value };
      });
      if (!points.length) return;
      const linePath = points.reduce((acc, point, index) => acc + `${index === 0 ? 'M' : ' L'} ${point.x} ${point.y}`, '');

      if (chartType === 'area') {
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${zeroY} L ${points[0].x} ${zeroY} Z`;
        const area = svgNode('path', {
          d: areaPath,
          class: 'dc-area-path',
          fill: item.color,
          'fill-opacity': 0.18,
          stroke: 'none',
        });
        chartGroup.appendChild(area);
      }

      const path = svgNode('path', {
        d: linePath,
        class: 'dc-line-path',
        fill: 'none',
        stroke: item.color,
        'stroke-width': 5,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      });
      chartGroup.appendChild(path);

      points.forEach((point) => {
        const circle = svgNode('circle', {
          cx: point.x,
          cy: point.y,
          r: 7,
          class: 'dc-point',
          fill: item.color,
          stroke: root.dataset.theme === 'dark' ? '#0f172a' : '#ffffff',
          'stroke-width': 3,
        });
        chartGroup.appendChild(circle);

        const valueLabel = svgNode('text', {
          x: point.x,
          y: point.y - 18,
          class: 'dc-point-value dc-number',
          'text-anchor': 'middle',
          'data-target': point.value,
          'data-unit': unit || '',
        });
        valueLabel.textContent = formatValue(0, unit);
        chartGroup.appendChild(valueLabel);
      });
    });
  }

  svg.appendChild(chartGroup);
  buildLegend(
    series.map((item) => ({
      name: item.name,
      value: item.values.reduce((sum, value) => sum + value, 0),
      color: item.color,
      subtext: `${item.values.length} point${item.values.length === 1 ? '' : 's'}`,
    })),
    unit,
  );
}

function renderCircular(svg, chartType, labels, series, unit) {
  const group = svgNode('g');
  const firstSeries = series[0];
  const values = firstSeries?.values || [];
  const colors = values.map((_, index) => palette[index % palette.length]);
  const displayTotal = values.reduce((sum, value) => sum + Math.max(value, 0), 0);
  const safeTotal = displayTotal > 0 ? displayTotal : 1;
  const centerX = 500;
  const centerY = 300;
  const radius = chartType === 'donut' ? 152 : 118;
  const strokeWidth = chartType === 'donut' ? 54 : radius * 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const track = svgNode('circle', {
    cx: centerX,
    cy: centerY,
    r: radius,
    fill: 'none',
    stroke: root.dataset.theme === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.18)',
    'stroke-width': strokeWidth,
    transform: `rotate(-90 ${centerX} ${centerY})`,
  });
  group.appendChild(track);

  values.forEach((value, index) => {
    const proportion = Math.max(value, 0) / safeTotal;
    const segmentLength = circumference * proportion;
    const segment = svgNode('circle', {
      cx: centerX,
      cy: centerY,
      r: radius,
      fill: 'none',
      stroke: colors[index],
      'stroke-width': strokeWidth,
      'stroke-linecap': chartType === 'donut' ? 'round' : 'butt',
      class: 'dc-segment',
      transform: `rotate(-90 ${centerX} ${centerY})`,
    });
    segment.style.strokeDasharray = `${segmentLength} ${circumference}`;
    segment.style.strokeDashoffset = `${-offset}`;
    segment.dataset.segmentLength = String(segmentLength);
    segment.dataset.circumference = String(circumference);
    group.appendChild(segment);
    offset += segmentLength;
  });

  if (chartType === 'donut') {
    const centerLabel = svgNode('text', {
      x: centerX,
      y: centerY - 6,
      class: 'dc-center-total dc-number',
      'text-anchor': 'middle',
      'data-target': displayTotal,
      'data-unit': unit || '',
    });
    centerLabel.textContent = formatValue(0, unit);
    group.appendChild(centerLabel);

    const centerCaption = svgNode('text', {
      x: centerX,
      y: centerY + 34,
      class: 'dc-center-caption',
      'text-anchor': 'middle',
    });
    centerCaption.textContent = firstSeries?.name || 'Total';
    group.appendChild(centerCaption);
  }

  svg.appendChild(group);
  buildLegend(
    values.map((value, index) => ({
      name: labels[index] || `Slice ${index + 1}`,
      value,
      color: colors[index],
      subtext: `${((Math.max(value, 0) / safeTotal) * 100).toFixed(1)}%`,
      unitOverride: unit,
    })),
    unit,
  );
}

function initializeChart() {
  if (root.dataset.initialized === 'true') return;

  const chartType = String(root.dataset.chartType || 'bar').toLowerCase();
  const labels = parseStringArray(root.dataset.labels);
  const series = parseSeries(root.dataset.series).map((item, index) => ({
    ...item,
    color: item.color || palette[index % palette.length],
  }));
  const unit = root.dataset.unit || '';
  const showLegend = parseBoolean(root.dataset.showLegend, true);
  const showGridlines = parseBoolean(root.dataset.showGridlines, chartType === 'bar' || chartType === 'line' || chartType === 'area');
  const svg = root.querySelector('.dc-svg');
  clearNode(svg);

  root.dataset.showLegend = String(showLegend);
  root.dataset.showGridlines = String(showGridlines);

  if (chartType === 'donut' || chartType === 'pie') {
    renderCircular(svg, chartType, labels, series, unit);
  } else {
    renderCartesian(svg, chartType, labels, series, showGridlines, unit);
  }

  Array.from(root.querySelectorAll('.dc-line-path, .dc-area-path')).forEach((path) => {
    if (typeof path.getTotalLength === 'function') {
      const length = path.getTotalLength();
      path.dataset.pathLength = String(length);
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
    }
  });

  root.dataset.initialized = 'true';
  root.__chartConfig = {
    animateOnEnter: parseBoolean(root.dataset.animateOnEnter, true),
    chartType,
    showLegend,
    unit,
  };
}

initializeChart();

const chartConfig = root.__chartConfig || { animateOnEnter: true, chartType: 'bar' };
const animateOnEnter = chartConfig.animateOnEnter;
const sceneSelector = '.scene-' + SCENE_ID;
const headerDuration = clamp(SCENE_DURATION * 0.16, 0.32, 0.7);
const chartDelay = SCENE_START + 0.2;
const chartDrawDuration = clamp(SCENE_DURATION * 0.22, 0.5, 1.1);
const valueDuration = clamp(SCENE_DURATION * 0.2, 0.55, 1.0);

if (animateOnEnter) {
  master.fromTo(sceneSelector + ' .dc-header > *',
    { autoAlpha: 0, y: 22 },
    { autoAlpha: 1, y: 0, duration: headerDuration, ease: 'power2.out', stagger: 0.08 },
    SCENE_START + 0.08);

  master.fromTo(sceneSelector + ' .dc-canvas-wrap',
    { autoAlpha: 0, y: 18, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: headerDuration, ease: 'power2.out' },
    chartDelay);

  master.fromTo(sceneSelector + ' .dc-legend-entry',
    { autoAlpha: 0, x: 18 },
    { autoAlpha: 1, x: 0, duration: clamp(SCENE_DURATION * 0.14, 0.3, 0.5), ease: 'power2.out', stagger: 0.08 },
    chartDelay + 0.24);

  if (chartConfig.chartType === 'bar') {
    master.fromTo(sceneSelector + ' .dc-bar',
      { scaleY: 0, autoAlpha: 0.28, transformOrigin: '50% 100%' },
      { scaleY: 1, autoAlpha: 1, duration: chartDrawDuration, ease: 'power2.out', stagger: 0.06 },
      chartDelay + 0.16);
  } else if (chartConfig.chartType === 'line' || chartConfig.chartType === 'area') {
    master.to(sceneSelector + ' .dc-line-path',
      {
        strokeDashoffset: (index, element) => Number(element.dataset.pathLength || 0) * 0,
        duration: chartDrawDuration,
        ease: 'power2.out',
        stagger: 0.08,
      },
      chartDelay + 0.14);
    master.fromTo(sceneSelector + ' .dc-area-path',
      { autoAlpha: 0, fillOpacity: 0.02 },
      { autoAlpha: 1, fillOpacity: 0.18, duration: chartDrawDuration, ease: 'power2.out', stagger: 0.08 },
      chartDelay + 0.2);
    master.fromTo(sceneSelector + ' .dc-point',
      { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' },
      { scale: 1, autoAlpha: 1, duration: clamp(SCENE_DURATION * 0.1, 0.2, 0.4), ease: 'back.out(2)', stagger: 0.05 },
      chartDelay + 0.34);
  } else {
    const segments = document.querySelectorAll(sceneSelector + ' .dc-segment');
    segments.forEach((element, index) => {
      const segLen = Number(element.dataset.segmentLength || 0);
      const circ = Number(element.dataset.circumference || 0);
      const finalOffset = Number(element.style.strokeDashoffset || 0);
      element.style.strokeDasharray = `${segLen} ${circ}`;
      element.style.strokeDashoffset = `${finalOffset + segLen}`;
      master.fromTo(element,
        { strokeDashoffset: finalOffset + segLen },
        { strokeDashoffset: finalOffset, duration: chartDrawDuration, ease: 'power2.out' },
        chartDelay + 0.18 + index * 0.08);
    });
  }
} else {
  gsap.set(sceneSelector + ' .dc-header > *, ' + sceneSelector + ' .dc-canvas-wrap, ' + sceneSelector + ' .dc-legend-entry', {
    autoAlpha: 1,
    x: 0,
    y: 0,
    scale: 1,
  });
  gsap.set(sceneSelector + ' .dc-bar, ' + sceneSelector + ' .dc-point', { autoAlpha: 1, scale: 1, scaleY: 1 });
  gsap.set(sceneSelector + ' .dc-line-path', { strokeDashoffset: 0 });
  gsap.set(sceneSelector + ' .dc-area-path', { autoAlpha: 1, fillOpacity: 0.18, strokeDashoffset: 0 });
  document.querySelectorAll(sceneSelector + ' .dc-segment').forEach((element) => {
    element.style.strokeDasharray = `${element.dataset.segmentLength || 0} ${element.dataset.circumference || 0}`;
  });
}

Array.from(root.querySelectorAll('.dc-number[data-target]')).forEach((element, index) => {
  const target = Number(element.dataset.target || 0);
  const unit = element.dataset.unit || '';
  if (!animateOnEnter) {
    element.textContent = formatValue(target, unit);
    return;
  }
  const state = { value: 0 };
  master.to(state, {
    value: target,
    duration: valueDuration,
    ease: 'power2.out',
    onUpdate: function() {
      element.textContent = formatValue(state.value, unit);
    },
  }, SCENE_START + 0.36 + Math.min(index * 0.04, 0.36));
});

master.to(sceneSelector + ' .dc-shell',
  { autoAlpha: 0, y: -12, duration: clamp(SCENE_DURATION * 0.12, 0.28, 0.42), ease: 'power2.in' },
  SCENE_START + SCENE_DURATION - clamp(SCENE_DURATION * 0.13, 0.28, 0.42));
