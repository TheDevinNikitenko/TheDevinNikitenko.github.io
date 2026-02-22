import { el, qs } from "../utils/dom.js";
import { since } from "../utils/time.js";

export function renderStatus(state) {
  const root = qs("#statusbar");
  root.innerHTML = "";

  const dotClass =
    state.ui.statusKind === "ok" ? "ok" :
    state.ui.statusKind === "warn" ? "warn" :
    state.ui.statusKind === "bad" ? "bad" : "";

  const dot = el("span", { class: `statusDot ${dotClass}` });
  const title = el("div", { class: "statusTitle" }, ["NWS Alerts Dashboard"]);
  const msg = el("div", { class: "statusMsg" }, [state.ui.statusText]);

  const last = el("div", { class: "pill" }, [
    `Last fetch: ${state.refresh.lastFetchIso ? since(state.refresh.lastFetchIso) : "—"}`
  ]);

  const left = el("div", { class: "rowStatus" }, [dot, el("div", {}, [title, msg])]);

  root.appendChild(left);
  root.appendChild(el("div", { class: "statusRight" }, [last]));
}

// Inject tiny status styles here (keeps app.css simpler)
const style = document.createElement("style");
style.textContent = `
  .rowStatus{ display:flex; align-items:center; gap:10px; min-width: 240px; }
  .statusDot{ width:10px; height:10px; border-radius:999px; background: rgba(255,255,255,.35); box-shadow: 0 0 0 4px rgba(255,255,255,.06); }
  .statusDot.ok{ background: var(--ok); box-shadow: 0 0 0 4px rgba(69,212,131,.14); }
  .statusDot.warn{ background: var(--warn); box-shadow: 0 0 0 4px rgba(255,204,102,.14); }
  .statusDot.bad{ background: var(--bad); box-shadow: 0 0 0 4px rgba(255,107,107,.14); }
  .statusTitle{ font-weight: 900; font-size: 13px; letter-spacing: .2px; }
  .statusMsg{ font-size: 12px; color: var(--muted); margin-top: 2px; }
  .statusRight{ margin-left:auto; display:flex; gap:10px; align-items:center; }
`;
document.head.appendChild(style);