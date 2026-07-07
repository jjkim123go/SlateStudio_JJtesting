// Soundstage library — grid of productions, live over SSE.

import { el, fmtAgo, fmtDur, fmtMoney, getJSON, subscribe, themeToggle, thumbURL } from "/ui/lib.js";

const grid = document.getElementById("grid");
const countEl = document.getElementById("count");
const emptyEl = document.getElementById("empty");
const STATIC = new URLSearchParams(location.search).has("static");

const tglSlot = document.getElementById("tgl-slot");
if (tglSlot) tglSlot.append(themeToggle());

function miniRail(states) {
  const rail = el("div", { class: "mini" });
  for (const s of states || []) {
    const cls = s.status === "completed" ? "done" : s.status === "awaiting_human" ? "await" : "";
    rail.append(el("i", { class: cls }));
  }
  return rail;
}

function card(p) {
  const poster = el("div", { class: "poster" }, el("div", { class: "glow" }));
  if (p.poster) {
    poster.append(el("img", { loading: "lazy", src: thumbURL(p.slug, p.poster.path),
      onerror: function () { this.style.display = "none"; } }));
  }
  let badge = null;
  if (p.awaiting_human) badge = el("span", { class: "badge await" }, "◈ AWAITING");
  else if (p.live) badge = el("span", { class: "badge live" }, "● LIVE");
  else if (p.delivered) badge = el("span", { class: "badge done" }, "✓ DONE");
  if (badge) poster.append(badge);

  const accent = p.accent || "#4ea1ff";
  const accent2 = p.accent2 || "#6ee7a8";
  return el("a", { class: "lib-card", href: `/p/${encodeURIComponent(p.slug)}`,
      style: `--proj:${accent};--proj2:${accent2}` },
    poster,
    el("div", { class: "b" },
      el("div", { class: "t" }, p.title || p.slug),
      miniRail(p.stage_states),
      el("div", { class: "meta2" },
        el("span", {}, `${p.scene_count || 0} scenes${p.duration ? " · " + fmtDur(p.duration) : ""}`),
        el("span", {}, p.spent_usd != null ? `${fmtMoney(p.spent_usd)}${p.budget_usd ? " / " + fmtMoney(p.budget_usd) : ""}` : (p.last_activity ? fmtAgo(p.last_activity) : "")))));
}

async function render() {
  const projects = await getJSON("/api/projects");
  grid.innerHTML = "";
  countEl.textContent = `${projects.length} production${projects.length === 1 ? "" : "s"}`;
  emptyEl.style.display = projects.length ? "none" : "block";
  for (const p of projects) grid.append(card(p));
}

render().catch((e) => { emptyEl.style.display = "block"; emptyEl.textContent = String(e); });
if (!STATIC) subscribe("/api/library/events", () => render().catch(console.error));
