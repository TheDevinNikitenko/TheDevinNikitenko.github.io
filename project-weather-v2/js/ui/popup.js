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

function short(text, n = 1200) {
  const t = String(text ?? "");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export function buildAlertPopupHtml(feature) {
  const p = feature?.properties || {};
  const event = p.event || "NWS Alert";
  const severity = p.severity || "Unknown";
  const area = p.areaDesc || "—";

  const sent = fmt(p.sent);
  const effective = fmt(p.effective);
  const ends = fmt(p.ends || p.expires);

  const headline = p.headline || "";
  const desc = p.description || p.instruction || "";

  const color = severityColor(severity);

  return `
    <div class="popup">
      <div class="popup__top">
        <div>
          <div class="popup__title">${safe(event)}</div>
          <div class="popup__meta">
            <div><span style="color:rgba(255,255,255,0.65)">Area:</span> ${safe(area)}</div>
            <div><span style="color:rgba(255,255,255,0.65)">Sent:</span> ${safe(sent)}</div>
            <div><span style="color:rgba(255,255,255,0.65)">Effective:</span> ${safe(effective)}</div>
            <div><span style="color:rgba(255,255,255,0.65)">Ends:</span> ${safe(ends)}</div>
          </div>
        </div>

        <div class="popup__tag" style="border-color:${color}66;background:${color}22">
          ${safe(severity)}
        </div>
      </div>

      ${headline ? `<div class="popup__meta" style="margin-top:10px;color:rgba(255,255,255,0.82)">${safe(headline)}</div>` : ""}

      <div class="popup__desc">
        ${safe(short(desc)).replace(/\n/g, "<br/>")}
      </div>

      <div class="popup__actions">
        ${p.id ? `<a href="${safe(p.id)}" target="_blank" rel="noopener">Open NWS</a>` : `<a href="#" onclick="return false;">NWS Link N/A</a>`}
        <a href="#" onclick="return false;">${safe(p.senderName || "NWS")}</a>
      </div>
    </div>
  `;
}