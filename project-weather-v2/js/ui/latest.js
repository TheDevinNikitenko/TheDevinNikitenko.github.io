// js/ui/latest.js
import { severityColor } from "./severity.js";

function safe(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? safe(iso) : d.toLocaleString();
}

export function renderLatest(panelEls, alerts, { max = 6, onClick } = {}) {
  const { listEl, metaEl } = panelEls;

  const items = (alerts || [])
    .filter(a => a?.properties?.sent)
    .slice()
    .sort((a, b) => (Date.parse(b.properties.sent) || 0) - (Date.parse(a.properties.sent) || 0))
    .slice(0, max);

  metaEl.textContent = items.length ? `Updated ${fmt(items[0].properties.sent)}` : "—";

  listEl.innerHTML = items.map((f) => {
    const p = f.properties || {};
    const sev = p.severity || "Unknown";
    const c = severityColor(sev);

    return `
      <div class="latestItem" data-id="${safe(f.id)}">
        <div class="latestItem__row">
          <div class="latestDot" style="background:${c}"></div>
          <div style="flex:1; min-width:0;">
            <div class="latestItem__t">${safe(p.event || "Alert")}</div>
            <div class="latestItem__m">
              ${safe(sev)} • ${safe(p.areaDesc || "—")}
              <br/>
              <span style="color:rgba(255,255,255,0.6)">Sent:</span> ${fmt(p.sent)}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll(".latestItem").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-id");
      const f = (alerts || []).find(a => a.id === id);
      if (f && onClick) onClick(f);
    });
  });
}