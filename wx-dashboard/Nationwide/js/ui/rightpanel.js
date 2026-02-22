import { el, qs } from "../utils/dom.js";
import { fmtTime } from "../utils/time.js";
import { severityBadgeClass } from "../map/alertsLayer.js";

export function renderRightPanel(state, handlers) {
   const {
    onToggleRadar,
    onRefresh,
    onSetRadarIndex,
    onSetRadarOpacity,
    onSelectRecent
  } = handlers;

  const root = qs("#rightPanel");
  root.innerHTML = "";

  const controls = el("div", { class:"card panelInner" }, [
    el("div", { class:"panelTitle" }, ["Map Controls"]),
    el("div", { class:"panelSub" }, ["Radar timeline, layers, and refresh."]),

    el("div", { class:"hr" }),

    el("div", { class:"row" }, [
      el("button", {
        class:`btn ${state.radar.enabled ? "primary" : ""}`,
        type:"button",
        onclick: () => onToggleRadar(!state.radar.enabled)
      }, [state.radar.enabled ? "Radar: ON" : "Radar: OFF"]),

      el("button", { class:"btn", type:"button", onclick: onRefresh }, ["Refresh"])
    ]),

    el("div", { class:"hCol" }, [
      el("div", { class:"small" }, ["Radar time"]),
      el("input", {
        class:"slider",
        type:"range",
        min:"0",
        max: String(Math.max(0, state.radar.timestamps.length - 1)),
        value: String(state.radar.currentIndex),
        oninput: (e) => onSetRadarIndex(Number(e.target.value))
      }),
      el("div", { class:"small" }, [
        state.radar.timestamps[state.radar.currentIndex]
          ? `Showing: ${new Date(state.radar.timestamps[state.radar.currentIndex] * 1000).toLocaleString()}`
          : "—"
      ]),
    ]),

    el("div", { class:"hCol" }, [
      el("div", { class:"small" }, ["Radar opacity"]),
      el("input", {
        class:"slider",
        type:"range",
        min:"0",
        max:"1",
        step:"0.05",
        value: String(state.radar.opacity),
        oninput: (e) => onSetRadarOpacity(Number(e.target.value))
      })
    ]),

    // --- Severity legend (add inside controls children array) ---
    el("div", { class:"hr" }),

    el("div", { class:"small" }, ["Alert severity legend"]),

    el("div", { class:"legend" }, [
      el("div", { class:"legItem" }, [
        el("span", { class:"swatch", style:"background:#ff3b3b" }),
        "Extreme"
      ]),
      el("div", { class:"legItem" }, [
        el("span", { class:"swatch", style:"background:#ff6b6b" }),
        "Severe"
      ]),
      el("div", { class:"legItem" }, [
        el("span", { class:"swatch", style:"background:#ffcc66" }),
        "Moderate"
      ]),
      el("div", { class:"legItem" }, [
        el("span", { class:"swatch", style:"background:#45d483" }),
        "Minor"
      ]),
      el("div", { class:"legItem" }, [
        el("span", { class:"swatch", style:"background:#5dd6ff" }),
        "Unknown"
      ]),
    ]),
    
  ]);

  const recent = el("div", { class:"card panelInner" }, [
    el("div", { class:"panelTitle" }, ["Recently Added Alerts"]),
    el("div", { class:"panelSub" }, ["Newest alerts since the page loaded. Tap to open popup."]),
    el("div", { class:"hr" }),
    el("div", { class:"recentList" },
      state.recent.items.slice(0, state.recent.max).map((it) => {
        const sevCls = severityBadgeClass(it.severity);
        const row = el("div", { class:"alertItem" }, [
          el("div", { class:"top" }, [
            el("div", { class:"name" }, [it.name]),
            el("div", { class:`badge ${sevCls}` }, [it.severity || "Unknown"])
          ]),
          el("div", { class:"meta" }, [`Sent: ${fmtTime(it.sent)}`]),
        ]);
        row.addEventListener("click", () => onSelectRecent(it.id));
        return row;
      })
    )
  ]);
  
  const toggleBtn = el("button", {
  class: `btn ${state.ui.rightPanelOpen ? "" : "primary"}`,
  type: "button",
  onclick: () => {
    state.ui.rightPanelOpen = !state.ui.rightPanelOpen;
    renderRightPanel(state, handlers);
  }
}, [state.ui.rightPanelOpen ? "Hide Panel" : "Show Panel"]);

  // ✅ apply collapsed styling depending on state
  toggleBtn.classList.toggle(
    "rightPanelCollapsedBtn",
    !state.ui.rightPanelOpen
  );

  const wrap = qs("#rightPanel");
wrap.innerHTML = "";
wrap.appendChild(toggleBtn);

if (state.ui.rightPanelOpen) {
  wrap.appendChild(controls);
  wrap.appendChild(recent);
}
}