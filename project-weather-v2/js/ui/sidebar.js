// js/ui/sidebar.js
import { severityColor } from "./severity.js";

function safe(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function textBlob(p) {
  return (
    `${p.event || ""} ${p.headline || ""} ${p.areaDesc || ""} ${p.description || ""} ${p.instruction || ""}`
  ).toLowerCase();
}

/**
 * MUST match your chip keys:
 * warning, watch, advisory, statement, forecast, other
 */
function classifyEvent(eventName) {
  const e = (eventName || "").toLowerCase();

  if (e.includes("warning")) return "warning";
  if (e.includes("watch")) return "watch";
  if (e.includes("advisory")) return "advisory";
  if (e.includes("statement")) return "statement";

  // common forecast-style NWS products
  if (e.includes("outlook") || e.includes("forecast") || e.includes("hazardous weather outlook")) {
    return "forecast";
  }

  return "other";
}

export function createSidebar({ container, onSelectAlert }) {
  let all = [];
  let shown = [];

  function setAlerts(features) {
    all = features || [];
  }

  function classify(eventName) {
    return classifyEvent(eventName);
  }

  function filter(query, types) {
    const q = (query || "").trim().toLowerCase();

    shown = (all || []).filter((f) => {
      const p = f?.properties || {};
      const kind = classify(p.event || "");

      // if types missing key, default to true (prevents "filters everything out")
      if (types && Object.prototype.hasOwnProperty.call(types, kind) && !types[kind]) return false;

      if (q) {
        if (!textBlob(p).includes(q)) return false;
      }
      return true;
    });

    render();
  }

  function render() {
    if (!container) return;

    // Use your original styled markup class names
    container.innerHTML = shown.map((f) => {
      const p = f.properties || {};
      const sev = p.severity || "Unknown";
      const dot = severityColor(sev);

      return `
        <div class="alertCard" data-id="${safe(f.id)}">
          <div class="alertCard__row">
            <div class="alertCard__dot" style="background:${dot}"></div>
            <div class="alertCard__body">
              <div class="alertCard__title">${safe(p.event || "Alert")}</div>
              <div class="alertCard__meta">${safe(sev)} • ${safe(p.areaDesc || "—")}</div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".alertCard").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-id");
        const f = (all || []).find(a => a.id === id);
        if (f && onSelectAlert) onSelectAlert(f);
      });
    });
  }

  function getShownCount() {
    return shown.length;
  }

  function computeSeverityCounts() {
    const counts = { Extreme: 0, Severe: 0, Moderate: 0, Minor: 0, Unknown: 0 };
    for (const f of shown) {
      const sev = (f?.properties?.severity || "Unknown");
      if (counts[sev] == null) counts.Unknown++;
      else counts[sev]++;
    }
    return counts;
  }

  return {
    setAlerts,
    filter,
    render,
    getShownCount,
    computeSeverityCounts,
    classify,
  };
}