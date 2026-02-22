// js/ui/sidebar.js
import { qs, el } from "../utils/dom.js";
import { severityBadgeClass } from "../map/alertsLayer.js";

const KINDS = ["Warning","Watch","Advisory","Statement","Other"];
const SEVERITIES = ["Any","Extreme","Severe","Moderate","Minor","Unknown"];

function kindFromName(name="") {
  const n = name.toLowerCase();
  if (n.includes("warning")) return "Warning";
  if (n.includes("watch")) return "Watch";
  if (n.includes("advisory")) return "Advisory";
  if (n.includes("statement")) return "Statement";
  return "Other";
}

function computeStats(alerts) {
  const counts = { Extreme:0, Severe:0, Moderate:0, Minor:0, Unknown:0 };
  for (const a of alerts) {
    const s = a.severity || "Unknown";
    if (counts[s] !== undefined) counts[s]++; else counts.Unknown++;
  }
  return { total: alerts.length, counts };
}

function matchesFilters(a, state) {
  const q = (state.ui.search || "").trim().toLowerCase();
  const kind = a.kind || kindFromName(a.name);
  const kindOk = state.ui.filterKinds.has(kind);

  const sev = a.severity || "Unknown";
  const sevOk = state.ui.severity === "Any" ? true : sev === state.ui.severity;

  if (!kindOk || !sevOk) return false;
  if (!q) return true;

  const hay = `${a.name||""} ${a.areaDesc||""} ${a.severity||""} ${a.urgency||""} ${a.headline||""}`.toLowerCase();
  return hay.includes(q);
}

function ensureDefaults(state){
  if (!state.ui.filterKinds) state.ui.filterKinds = new Set(KINDS);
  if (!state.ui.severity) state.ui.severity = "Any";
  if (typeof state.ui.search !== "string") state.ui.search = "";
}

/* --------------------------
   One-time mount
--------------------------- */

function mountSidebar(state, { onSelectAlert }) {
  const root = qs("#sidebar");
  root.innerHTML = "";

  const header = el("div", { class:"sidebarHeader" }, [
    el("div", { class:"hRow" }, [
      el("div", { class:"panelTitle" }, ["Weather Console"]),
      el("div", { class:"pill", id:"alertsCountPill" }, ["0"]),
    ]),

    el("div", { class:"small", style:"display:flex; align-items:center; gap:8px;" }, [
      el("span", { class:"dot ok" }),
      el("span", { id:"statusText" }, [state.ui.statusText || "Ready"])
    ]),

    // Search (NOTE: NO rerender here)
    el("input", {
      class:"input",
      id:"alertSearch",
      type:"search",
      placeholder:"Filter alerts (type to search)…",
      value: state.ui.search
    }),

    // Type chips row
    el("div", { class:"chipRow", id:"typeChips" }),

    // Severity select
    el("div", { class:"hCol", style:"gap:8px;" }, [
      el("div", { class:"small" }, ["Alert severity"]),
      el("select", { class:"selectDark", id:"severitySelect" })
    ]),

    // Severity counts row (MOVED OUT OF SCROLLABLE BODY)
    el("div", { class:"statRow5Wrap" }, [
      el("div", { class:"statRow5", id:"severityStats" })
    ]),

    el("div", { class:"row" }, [
      el("button", { class:"btn", type:"button", id:"resetFilters" }, ["Reset filters"]),
    ]),
  ]);

  const body = el("div", { class:"sidebarBody" }, [
    el("div", { class:"alertList", id:"alertList" })
  ]);

  root.appendChild(header);
  root.appendChild(body);

  // Build chips once
  const chips = header.querySelector("#typeChips");
  for (const k of KINDS) {
    const btn = el("button", { class:"chip", type:"button", "data-kind": k }, [k]);
    chips.appendChild(btn);
  }

  // Build severity options once
  const sel = header.querySelector("#severitySelect");
  for (const s of SEVERITIES) {
    sel.appendChild(el("option", { value:s }, [s]));
  }

  // Wire events ONCE (no DOM replacement)
  const search = header.querySelector("#alertSearch");
  search.addEventListener("input", () => {
    state.ui.search = search.value;
    updateSidebar(state, { onSelectAlert });
  });

  chips.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-kind]");
    if (!btn) return;
    const k = btn.dataset.kind;

    if (state.ui.filterKinds.has(k)) state.ui.filterKinds.delete(k);
    else state.ui.filterKinds.add(k);

    updateSidebar(state, { onSelectAlert });
  });

  sel.addEventListener("change", () => {
    state.ui.severity = sel.value;
    updateSidebar(state, { onSelectAlert });
  });

  header.querySelector("#resetFilters").addEventListener("click", () => {
    state.ui.search = "";
    state.ui.severity = "Any";
    state.ui.filterKinds = new Set(KINDS);

    search.value = "";
    sel.value = "Any";
    updateSidebar(state, { onSelectAlert });
  });

  // Store handler for list clicks
  root._onSelectAlert = onSelectAlert;
}

/* --------------------------
   Incremental update
--------------------------- */

function updateSidebar(state, { onSelectAlert }) {
  ensureDefaults(state);
  const root = qs("#sidebar");

  // status text (no rerender)
  const st = root.querySelector("#statusText");
  if (st) st.textContent = state.ui.statusText || "Ready";

  // update chips
  const chips = root.querySelectorAll(".chip[data-kind]");
  chips.forEach((b) => {
    const k = b.dataset.kind;
    b.classList.toggle("on", state.ui.filterKinds.has(k));
  });

  // update select
  const sel = root.querySelector("#severitySelect");
  if (sel) sel.value = state.ui.severity;

  // filtered alerts
  const filtered = (state.alerts || []).filter(a => matchesFilters(a, state));
  const stats = computeStats(filtered);

  const pill = root.querySelector("#alertsCountPill");
  if (pill) pill.textContent = String(stats.total);

  // severity stats
  const statsRoot = root.querySelector("#severityStats");
  if (statsRoot) {
    statsRoot.innerHTML = "";
    statsRoot.appendChild(statCard("Extreme", stats.counts.Extreme));
    statsRoot.appendChild(statCard("Severe", stats.counts.Severe));
    statsRoot.appendChild(statCard("Moderate", stats.counts.Moderate));
    statsRoot.appendChild(statCard("Minor", stats.counts.Minor));
    statsRoot.appendChild(statCard("Unknown", stats.counts.Unknown));
  }

  // list
  const list = root.querySelector("#alertList");
  if (list) {
    list.innerHTML = "";
    const sorted = filtered.slice().sort((a,b) => (b.sent||"").localeCompare(a.sent||""));
    for (const a of sorted) {
      const sevCls = severityBadgeClass(a.severity);
      const item = el("div", { class:"alertItem" }, [
        el("div", { class:"top" }, [
          el("div", { class:"name" }, [a.name || "Alert"]),
          el("div", { class:`badge ${sevCls}` }, [a.severity || "Unknown"]),
        ]),
        el("div", { class:"meta" }, [`${a.severity || "Unknown"} • ${a.areaDesc || ""}`]),
      ]);
      item.addEventListener("click", () => onSelectAlert(a.id));
      list.appendChild(item);
    }
  }
}

function statCard(label, value) {
  return el("div", { class:"stat5" }, [
    el("div", { class:"k" }, [label]),
    el("div", { class:"v" }, [String(value)]),
  ]);
}

/* --------------------------
   Public render entry
--------------------------- */

export function renderSidebar(state, { onSelectAlert }) {
  ensureDefaults(state);

  const root = qs("#sidebar");

  // mount once, update many
  if (!root.dataset.mounted) {
    mountSidebar(state, { onSelectAlert });
    root.dataset.mounted = "1";
  }

  updateSidebar(state, { onSelectAlert });
}