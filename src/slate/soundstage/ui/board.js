// Soundstage board — renders BoardState with the storyboard + narration
// timeline as the hero, and stays live over SSE. Read-only.

import {
    el,
    fmtAgo,
    fmtDur, fmtMoney,
    getJSON, mediaURL,
    subscribe,
    themeToggle,
    thumbURL,
    waveHeights
} from "/ui/lib.js";

const slug = decodeURIComponent(location.pathname.split("/p/")[1] || "");
const params = new URLSearchParams(location.search);
const STATIC = params.has("static");
const EMBED = params.get("embed");            // "vscode" tightens chrome
const app = document.getElementById("app");
const modal = document.getElementById("modal");
let state = null;

const CLS = { chrome: "chrome", hand: "hand", generated: "generated" };
const CLS_VAR = { chrome: "var(--cls-chrome)", hand: "var(--cls-hand)", generated: "var(--cls-gen)" };

function setTheme(theme) {
  const root = document.documentElement.style;
  const p = (theme && (theme.primary || theme.accent)) || "#4ea1ff";
  const p2 = (theme && (theme.accent || theme.primary)) || "#6ee7a8";
  root.setProperty("--proj", p);
  root.setProperty("--proj2", p2);
}

// ---------------------------------------------------------------- header
function renderHead(s) {
  const sb = s.storyboard || {};
  const chips = el("div", { class: "chips" },
    sb.total_duration_seconds ? el("span", { class: "chip" },
      el("span", { class: "em" }, `${(sb.scenes || []).length}`), ` scenes · `,
      el("span", { class: "em" }, fmtDur(sb.total_duration_seconds))) : null,
    s.voice ? el("span", { class: "chip" }, `voice · ${s.voice}`) : null,
    sb.theme && sb.theme.name ? el("span", { class: "chip" }, `theme · ${sb.theme.name}`) : null,
  );

  let status;
  if (s.awaiting_human) status = el("span", { class: "status await" }, el("span", { class: "dot" }), "◈ AWAITING YOU");
  else if (s.live) status = el("span", { class: "status live" }, el("span", { class: "dot" }), "LIVE");
  else if (s.delivered) status = el("span", { class: "status done" }, el("span", { class: "dot" }), "✓ DELIVERED");
  else status = el("span", { class: "status idle" }, el("span", { class: "dot" }),
    `IDLE${s.last_activity ? " · " + fmtAgo(s.last_activity) : ""}`);

  const cost = s.cost || {};
  const costEl = cost.spent_usd != null ? el("div", { class: "cost-readout" },
    el("div", { class: "big" }, fmtMoney(cost.spent_usd),
      cost.budget_usd ? el("span", { style: "color:var(--text-3);font-weight:400" }, ` / ${fmtMoney(cost.budget_usd)}`) : null),
    el("div", { class: "sub" }, cost.pct != null ? `${(cost.pct * 100).toFixed(1)}% OF BUDGET · ${cost.calls} CALLS` : `${cost.calls || 0} CALLS`),
  ) : null;

  const brand = EMBED === "vscode" ? null : el("div", { class: "clapper" });
  return el("header", { class: "head rise" },
    brand,
    el("div", { class: "brand" },
      el("a", { class: "mark", href: "/", style: "text-decoration:none" }, "Soundstage"),
      el("h1", {}, s.title || slug)),
    el("div", { class: "spacer" }),
    el("div", { style: "display:flex;flex-direction:column;align-items:flex-end;gap:2px" },
      el("div", { style: "display:flex;align-items:center;gap:12px" }, status, costEl),
      chips),
    themeToggle(),
  );
}

// ---------------------------------------------------------------- stage ribbon
function renderRibbon(s) {
  const rib = el("div", { class: "ribbon rise" });
  for (const st of s.stages || []) {
    const cls = st.status === "completed" ? "done" : st.status === "awaiting_human" ? "await" : "";
    rib.append(el("div", { class: `rib ${cls}` },
      st.gated ? el("span", { class: "gate-dot" }, "◆") : null,
      el("div", { class: "nm" }, st.name.replace("_", " ")),
      el("div", { class: "st" }, st.sub || (st.status === "pending" ? "" : st.status)),
    ));
  }
  return rib;
}

function renderBanner(s) {
  if (s.awaiting_human && s.active_gate) {
    const g = s.active_gate;
    return el("div", { class: "banner await rise" },
      el("span", { class: "glyph" }, "◈"),
      el("span", {}, el("b", {}, `Awaiting you — ${g.checkpoint_type || "gate"}. `),
        `Review “${g.scope || "the artifact"}” in chat, then approve to continue.`),
      g.shown ? el("a", { href: mediaURL(slug, g.shown), target: "_blank" }, g.shown) : null,
    );
  }
  if (s.delivered || s.rendered) {
    const rev = s.review || {};
    const render = (s.media && s.media.renders && s.media.renders[0]) || null;
    return el("div", { class: "banner done rise" },
      el("span", { class: "glyph" }, "✓"),
      el("span", {}, el("b", {}, s.delivered ? "Delivered. " : "Rendered. "),
        rev.total_score != null ? `Review ${rev.total_score}/${rev.max_score} — ${rev.passed ? "passed" : "revise"}.` : "Final render ready."),
      render ? el("a", { href: mediaURL(slug, render.path), target: "_blank" }, `▶ ${render.name}`) : null,
      (s.storyboard && s.storyboard.total_duration_seconds)
        ? el("span", { class: "rt" }, `${fmtDur(s.storyboard.total_duration_seconds)}`) : null,
    );
  }
  return null;
}

// ---------------------------------------------------------------- storyboard
function renderStoryboard(s) {
  const sb = s.storyboard;
  if (!sb || !(sb.scenes || []).length) return null;
  const v = sb.variety || {};
  const hist = v.histogram || {};
  const total = (hist.chrome || 0) + (hist.hand || 0) + (hist.generated || 0) || 1;
  const seg = (n, c) => n ? el("span", { style: `width:${(n / total) * 100}%;background:${c}` }) : null;

  const variety = el("div", { class: "variety" },
    el("div", { class: "vbar" },
      seg(hist.chrome, "var(--cls-chrome)"),
      seg(hist.hand, "var(--cls-hand)"),
      seg(hist.generated, "var(--cls-gen)")),
    el("div", { class: "vlegend" },
      el("span", {}, el("i", { style: "background:var(--cls-chrome)" }), `chrome ×${hist.chrome || 0}`),
      el("span", {}, el("i", { style: "background:var(--cls-hand)" }), `bespoke ×${hist.hand || 0}`),
      el("span", {}, el("i", { style: "background:var(--cls-gen)" }), `generated ×${hist.generated || 0}`)),
    el("span", { class: `verdict ${v.verdict === "check" ? "check" : "varied"}` },
      v.verdict === "check" ? "⚠ CHECK VARIETY" : "✓ VARIED"),
    v.note ? el("div", { class: "vnote" }, v.note) : null,
  );

  const strip = el("div", { class: "strip" });
  (sb.scenes || []).forEach((sc, i) => {
    strip.append(sceneCard(sc, i));
  });

  return el("section", { class: "rise" },
    el("div", { class: "sec-head" }, el("h2", {}, "Storyboard"), el("div", { class: "rule" })),
    variety,
    strip,
  );
}

function sceneCard(sc, i) {
  const kf = sc.keyframe;
  const frame = el("div", { class: "frame" });
  if (sc.generating || !kf) {
    frame.append(el("div", { class: "ph" }, sc.generating ? "" : (sc.technique || "scene")));
  } else {
    const img = el("img", { loading: "lazy", alt: sc.title,
      src: thumbURL(slug, kf.path), onerror: function () { this.style.display = "none"; } });
    frame.append(img);
  }
  frame.append(el("div", { class: "grad" }));
  frame.append(el("div", { class: "num" }, `S${sc.index}`));
  frame.append(el("div", { class: "dur" }, fmtDur(sc.duration)));
  if (sc.hero) frame.append(el("div", { class: "hero" }, "★ HERO"));

  const chips = [
    sc.transition ? el("span", { class: "schip" }, sc.transition) : null,
    sc.component ? el("span", { class: "schip" }, sc.component) : null,
    sc.narration_seconds ? el("span", { class: "schip" }, `${sc.narration_seconds}s narration`) : null,
  ].filter(Boolean);

  return el("div", { class: `scard${sc.generating ? " gen" : ""}`, style: `animation-delay:${i * 45}ms`,
      onclick: () => openScene(sc) },
    frame,
    el("div", { class: "meta" },
      el("span", { class: "title" }, sc.title),
      el("span", { class: `tbadge ${CLS[sc.treatment_class] || "hand"}` }, sc.technique || sc.treatment_class)),
    chips.length ? el("div", { class: "chips-row" }, ...chips) : null,
    el("div", { class: "sub" }, sc.narration_text || (sc.hero ? "Hero beat — no narration (music breath)." : "")),
  );
}

// ---------------------------------------------------------------- narration timeline (hero)
function renderTimeline(s) {
  const sb = s.storyboard;
  if (!sb || !(sb.scenes || []).length) return null;
  const total = sb.total_duration_seconds || sb.scenes.reduce((a, x) => a + (x.duration || 0), 0) || 1;

  // ruler ticks every 5s
  const ruler = el("div", { class: "tl-ruler" });
  for (let t = 0; t <= total; t += 5) {
    ruler.append(el("div", { class: "tl-tick", style: `left:${(t / total) * 100}%` }, fmtDur(t)));
  }

  const track = el("div", { class: "tl-track" });
  sb.scenes.forEach((sc, i) => {
    const blkColor = CLS_VAR[sc.treatment_class] || "var(--cls-hand)";
    const nsec = sc.narration_seconds;
    const cover = nsec && sc.duration ? Math.min(1, nsec / sc.duration) : 0;
    const fillCls = sc.narration_overflow ? "over" : sc.narration_tight ? "tight" : "";

    const wave = el("div", { class: "tl-wave" });
    const heights = waveHeights(sc.id, 30);
    const active = Math.round(heights.length * (cover || 0.001));
    heights.forEach((h, idx) => {
      wave.append(el("i", { style: `height:${Math.round(h * 100)}%;opacity:${idx < active || !nsec ? 0.85 : 0.28}` }));
    });

    const block = el("div", {
      class: `tl-block${sc.narration_overflow ? " overflow" : ""}`,
      style: `flex:${sc.duration || 1} 1 0;--blk:${blkColor};animation-delay:${i * 45}ms`,
      title: sc.narration_text || sc.title,
      onclick: () => openScene(sc),
    },
      el("div", { class: "cap" }),
      el("div", { class: "lab" },
        el("span", { class: "n" }, `S${sc.index}`),
        el("span", { class: "t" }, sc.title),
        el("span", { class: "d" }, fmtDur(sc.duration))),
      wave,
      el("div", { class: `tl-narr${sc.narration_text ? "" : " none"}` },
        sc.narration_text || "♪ music"),
      el("div", { class: `tl-fill ${fillCls}` },
        el("i", { style: `width:${Math.round((cover || (nsec ? 1 : 0)) * 100)}%` })),
    );
    track.append(block);
  });

  return el("section", { class: "rise" },
    el("div", { class: "sec-head" }, el("h2", {}, "Narration Timeline"), el("div", { class: "rule" })),
    el("div", { class: "timeline" },
      ruler, track,
      el("div", { class: "tl-legend" },
        el("span", {}, el("i", { style: "background:var(--spark)" }), "narration fits"),
        el("span", {}, el("i", { style: "background:var(--gate)" }), "tight"),
        el("span", {}, el("i", { style: "background:var(--danger)" }), "overflow"),
        el("span", {}, "block width = scene duration · color = technique"))),
  );
}

// ---------------------------------------------------------------- script (screenplay)
function scriptSections(s) {
  return ((s.storyboard || {}).scenes || [])
    .filter((sc) => sc.narration_text)
    .map((sc) => ({ n: sc.index, title: sc.title, text: sc.narration_text,
                    start: sc.start, end: (sc.start || 0) + (sc.duration || 0) }));
}

function sectionNodes(sec) {
  return [
    el("div", { class: "sp-slug" }, `S${sec.n} — ${sec.title.toUpperCase()}`,
      el("span", { class: "tc" }, `${fmtDur(sec.start)} – ${fmtDur(sec.end)}`)),
    el("div", { class: "sp-line" }, sec.text),
  ];
}

function scriptStamp(s) {
  const st = (s.stages || []).find((x) => x.name === "script");
  if (!st) return null;
  if (st.status === "awaiting_human") return { cls: "await", label: "Awaiting" };
  const v = (st.verdict || "").toLowerCase();
  if (st.status === "completed" || v === "approved" || v === "passed")
    return { cls: "approved", label: "Approved" };
  return { cls: "draft", label: "Draft" };
}

function renderScript(s) {
  const secs = scriptSections(s);
  if (!secs.length) return null;
  const sb = s.storyboard || {};
  const SHOWN = 4;
  const shown = secs.slice(0, SHOWN);
  const more = secs.length - shown.length;
  const stamp = scriptStamp(s);
  const sub = `${s.voice ? s.voice + " · " : ""}${secs.length} sections · ${fmtDur(sb.total_duration_seconds)}`;

  const body = el("div", { class: `sp-body${more > 0 ? " fade" : ""}` });
  shown.forEach((sec) => body.append(...sectionNodes(sec)));

  return el("section", { class: "rise", style: "margin-top:24px" },
    el("div", { class: "sec-head" }, el("h2", {}, "Script"), el("div", { class: "rule" })),
    el("div", { class: "screenplay" },
      stamp ? el("div", { class: `stamp ${stamp.cls}` }, stamp.label) : null,
      el("div", { class: "sp-head" },
        el("div", { class: "sp-title" }, s.title || slug),
        el("div", { class: "sp-sub" }, sub)),
      body,
      el("div", { class: "sp-foot" },
        el("span", {}, more > 0 ? `showing ${SHOWN} of ${secs.length} sections` : `${secs.length} sections`),
        el("button", { class: "expand", onclick: () => openScriptModal(s, secs) },
          more > 0 ? `${more} more · ✓ expand script` : "✓ expand script"))));
}

function openScriptModal(s, secs) {
  const mb = el("div", { class: "mb" });
  secs.forEach((sec) => mb.append(...sectionNodes(sec)));
  showModal(s.title || "Script", mb, true);
}

// ---------------------------------------------------------------- secondary
function renderSecondary(s) {
  const fc = renderFinalCut(s);
  const trail = renderTrail(s), cost = renderCost(s), gov = renderGovernance(s);
  if (!fc) {
    return el("div", { class: "grid2" },
      el("div", { class: "main-left" }, trail),
      el("aside", {}, cost, gov));
  }
  return el("div", { class: "grid2" },
    el("div", { class: "main-left" }, fc),
    el("aside", {}, trail, cost, gov));
}

function renderFinalCut(s) {
  const render = (s.media && s.media.renders && s.media.renders[0]) || null;
  if (!render) return null;
  return el("div", { class: "panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Final Cut"),
      el("span", { class: "meta" }, render.name)),
    el("div", { class: "panel-body" },
      el("video", { class: "finalvid", src: mediaURL(slug, render.path),
        controls: "", playsinline: "", preload: "metadata",
        poster: thumbURL(slug, render.path) })));
}

function renderTrail(s) {
  const body = el("div", { class: "panel-body trailbody" });
  const items = (s.decisions || []).slice(0, 22);
  if (!items.length) body.append(el("div", { class: "empty" }, el("div", { class: "big" }, "No decisions logged")));
  for (const d of items) {
    const clock = d.ts ? String(d.ts).slice(11, 16) : "";
    body.append(el("div", { class: "dec" },
      el("div", { class: "tk" }, clock),
      el("div", {},
        el("div", { class: `ty ${d.kind || "note"}` }, (d.kind || "note"),
          d.verdict ? el("span", { class: `vchip ${d.verdict}` }, d.verdict) : null),
        d.title ? el("div", { class: "msg" }, d.title) : null,
        d.why ? el("div", { class: "why" }, d.why) : null,
        d.also ? el("div", { class: "also" }, "also considered ", el("s", {}, d.also)) : null)));
  }
  return el("div", { class: "panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Decision Trail"),
      el("span", { class: "meta" }, "provenance")),
    body);
}

function renderCost(s) {
  const c = s.cost || {};
  if (c.spent_usd == null) return null;
  const body = el("div", { class: "panel-body burn" });
  const byTool = c.by_tool || {};
  const maxv = Math.max(0.0001, ...Object.values(byTool));
  const colors = ["var(--cls-hand)", "var(--proj)", "var(--spark)", "var(--gate)"];
  Object.entries(byTool).forEach(([tool, v], i) => {
    body.append(el("div", { class: "row" },
      el("span", { class: "l" }, tool.replace("foundry_", "")),
      el("span", { class: "tk" }, el("i", { style: `width:${(v / maxv) * 100}%;background:${colors[i % colors.length]}` })),
      el("span", { class: "v" }, fmtMoney(v))));
  });
  body.append(el("div", { class: "total" },
    el("span", { style: "color:var(--text-2)" }, "spent"),
    el("span", { style: "color:var(--text);font-weight:600" }, `${fmtMoney(c.spent_usd)} / ${fmtMoney(c.budget_usd)}`)));
  if (c.budget_usd) {
    body.append(el("div", { class: "budget" },
      el("i", { style: `width:${Math.min(100, (c.pct || 0) * 100)}%` }),
      el("span", { class: "warn", style: "left:50%" }),
      el("span", { class: "pause", style: "left:90%" })));
    body.append(el("div", { class: "th" },
      el("span", {}, "$0"),
      el("span", { style: "color:var(--gate)" }, `warn ${fmtMoney(c.warn_usd)}`),
      el("span", { style: "color:var(--danger)" }, `pause ${fmtMoney(c.pause_usd)}`),
      el("span", {}, fmtMoney(c.budget_usd))));
  }
  return el("div", { class: "panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Cost"), el("span", { class: "meta" }, "ledger")),
    body);
}

function renderGovernance(s) {
  const g = s.governance || {};
  const row = (k, v, ok) => el("div", { class: "g" },
    el("span", { class: "k" }, k), el("span", { class: `v ${ok === true ? "ok" : ok === false ? "warn" : ""}` }, v));
  const body = el("div", { class: "panel-body gov" },
    row("brand package", g.brand_package || "none (custom)", g.brand_package ? true : null),
    row("captions", g.captions ? `on · ${g.caption_style || ""}` : "off", g.captions ? true : false),
    row("theme", g.theme_name || "—", g.theme_name ? true : null),
    row("music", g.music ? "on" : "off", g.music ? true : null),
    row("review", g.review_passed === true ? "passed" : g.review_passed === false ? "revise" : "—",
      g.review_passed === true ? true : g.review_passed === false ? false : null));
  return el("div", { class: "panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Governance")), body);
}

// ---------------------------------------------------------------- modal
function openScene(sc) {
  const kf = sc.keyframe;
  const mb = el("div", { class: "mb" });
  if (kf && kf.kind === "video") {
    mb.append(el("video", { src: mediaURL(slug, kf.path), controls: "", playsinline: "" }));
  } else if (kf) {
    mb.append(el("img", { src: mediaURL(slug, kf.path), alt: sc.title }));
  }
  mb.append(el("div", { style: "margin-top:14px;display:flex;gap:8px;flex-wrap:wrap" },
    el("span", { class: `tbadge ${CLS[sc.treatment_class] || "hand"}` }, sc.technique),
    el("span", { class: "chip" }, `S${sc.index} · ${fmtDur(sc.duration)}`),
    sc.transition ? el("span", { class: "chip" }, `→ ${sc.transition}`) : null,
    sc.narration_seconds ? el("span", { class: "chip" }, `narration ${sc.narration_seconds}s`) : null,
    sc.narration_overflow ? el("span", { class: "chip", style: "color:var(--danger)" }, "⚠ narration overflow") : null));
  if (sc.narration_text) mb.append(el("p", { style: "margin-top:14px;color:var(--text-2);font-style:italic;font-size:15px;line-height:1.6" }, `“${sc.narration_text}”`));
  showModal(`S${sc.index} · ${sc.title}`, mb);
}

function showModal(title, bodyEl, paper) {
  modal.innerHTML = "";
  modal.append(el("div", { class: `modal${paper ? " paper" : ""}` },
    el("div", { class: "mh" }, el("h3", {}, title),
      el("button", { class: "x", onclick: closeModal }, "✕")),
    bodyEl));
  modal.classList.add("open");
}
function closeModal() { modal.classList.remove("open"); modal.innerHTML = ""; }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

// ---------------------------------------------------------------- assembly
function render() {
  if (!state) return;
  setTheme((state.storyboard || {}).theme);
  document.title = `Soundstage — ${state.title || slug}`;
  app.innerHTML = "";
  app.append(renderHead(state));
  app.append(renderRibbon(state));
  const banner = renderBanner(state);
  if (banner) app.append(banner);

  if (!state.has_scf) {
    app.append(el("div", { class: "empty", style: "margin-top:30px" },
      el("div", { class: "big" }, "No composition yet"),
      el("div", {}, "This project has no SCF — Soundstage is showing what it found on disk. "
        + "Runs that reach the scene plan get the full storyboard.")));
  } else {
    const story = renderStoryboard(state); if (story) app.append(story);
    const tl = renderTimeline(state); if (tl) app.append(el("div", { style: "margin-top:24px" }, tl));
    const scr = renderScript(state); if (scr) app.append(scr);
  }
  app.append(el("div", { style: "margin-top:8px" }, renderSecondary(state)));
  app.append(el("footer", {},
    el("span", {}, "Soundstage — Slate's living storyboard"),
    el("span", {}, "· read-only observer"),
    el("span", {}, "· inspired by ", el("a", { href: "https://github.com/calesthio/OpenMontage/pull/273", target: "_blank" }, "OpenMontage Backlot")),
    el("span", { class: "spacer" }),
    el("span", {}, slug)));
}

async function refresh() {
  state = await getJSON(`/api/project/${encodeURIComponent(slug)}/state`);
  render();
}

refresh().catch((err) => {
  app.innerHTML = "";
  app.append(el("div", { class: "empty", style: "margin-top:80px" },
    el("div", { class: "big" }, "Project not found"),
    el("div", {}, String(err))));
});

if (!STATIC) {
  subscribe(`/api/project/${encodeURIComponent(slug)}/events`, () => refresh().catch(console.error));
}
