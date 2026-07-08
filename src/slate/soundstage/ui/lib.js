// Shared helpers for the Soundstage UI.

export async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "style") n.setAttribute("style", v);
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

export function fmtDur(s) {
  if (s == null || isNaN(s)) return "—";
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtMoney(v) {
  if (v == null) return "—";
  return "$" + Number(v).toFixed(v < 1 ? 3 : 2);
}

export function fmtAgo(epoch) {
  if (!epoch) return "";
  const d = Date.now() / 1000 - epoch;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export const mediaURL = (slug, rel) => `/media/${encodeURIComponent(slug)}/${encodeURI(rel)}`;
export const thumbURL = (slug, rel) => `/thumb/${encodeURIComponent(slug)}/${encodeURI(rel)}`;

// Subscribe to an SSE change feed; debounced onChange per burst.
export function subscribe(url, onChange) {
  let timer = null;
  const src = new EventSource(url);
  src.onmessage = (msg) => {
    let data;
    try { data = JSON.parse(msg.data); } catch { return; }
    if (data.type !== "change") return;
    clearTimeout(timer);
    timer = setTimeout(onChange, 220);
  };
  src.onerror = () => { /* EventSource auto-reconnects */ };
  return src;
}

// Deterministic pseudo-waveform heights (0..1) seeded by a string.
export function waveHeights(seedStr, count = 40) {
  let seed = 0;
  for (const c of seedStr || "wave") seed = (seed * 31 + c.charCodeAt(0)) % 2147483647;
  seed = seed || 7;
  const out = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 16807) % 2147483647;
    const base = (seed % 100) / 100;
    out.push(Math.max(0.12, base * (0.55 + 0.45 * Math.abs(Math.sin(i / 4)))));
  }
  return out;
}

export function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- theme (light / dark) ------------------------------------------------
export function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}

export function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("soundstage-theme", t); } catch { /* private mode */ }
}

// A sun/moon toggle button. Shows the icon for the theme you'd switch TO.
export function themeToggle() {
  const b = el("button", { class: "tgl", title: "Toggle light / dark", "aria-label": "Toggle theme" });
  const paint = () => { b.textContent = currentTheme() === "light" ? "☾" : "☀"; };
  b.addEventListener("click", () => { applyTheme(currentTheme() === "light" ? "dark" : "light"); paint(); });
  paint();
  return b;
}

