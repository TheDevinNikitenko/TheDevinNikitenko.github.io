// js/ui/toasts.js
import { severityColor } from "./severity.js";

function safe(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

export function createToasts(container) {
  function pushAlertToast(feature, { onZoom } = {}) {
    const p = feature?.properties || {};
    const event = p.event || "New alert";
    const area = p.areaDesc || "—";
    const sev = p.severity || "Unknown";
    const color = severityColor(sev);

    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
      <div class="toast__body">
        <div class="toast__dot" style="background:${color}"></div>
        <div style="flex:1">
          <div class="toast__t">${safe(event)}</div>
          <div class="toast__m">${safe(sev)} • ${safe(area)}</div>
        </div>
      </div>
      <div class="toast__actions">
        <button class="toast__btn" data-action="zoom">Zoom</button>
        <button class="toast__btn" data-action="dismiss">Dismiss</button>
      </div>
    `;

    const ttl = 10_000; // auto-dismiss after 10s
    const timer = setTimeout(() => el.remove(), ttl);

    el.querySelector('[data-action="dismiss"]').addEventListener("click", () => {
      clearTimeout(timer);
      el.remove();
    });

    el.querySelector('[data-action="zoom"]').addEventListener("click", () => {
      clearTimeout(timer);
      el.remove();
      if (onZoom) onZoom(feature);
    });

    container.appendChild(el);
  }

  return { pushAlertToast };
}