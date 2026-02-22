import { fetchZoneFeature } from "../api/nws.js";

function kindFromEventName(eventName) {
  const n = (eventName || "").toLowerCase();
  if (n.includes("warning")) return "Warning";
  if (n.includes("watch")) return "Watch";
  if (n.includes("advisory")) return "Advisory";
  if (n.includes("statement")) return "Statement";
  return "Other";
}

export function severityBadgeClass(sev) {
  const s = (sev || "").toLowerCase();
  if (s === "extreme" || s === "severe") return "bad";
  if (s === "moderate") return "warn";
  if (s === "minor") return "ok";
  return "";
}

export function alertToPopupHtml(a) {
  const sent = a.sent ? new Date(a.sent).toLocaleString() : "—";
  const exp = a.expires ? new Date(a.expires).toLocaleString() : "—";
  const sevClass = severityBadgeClass(a.severity);

  const desc = (a.description || "").trim();
  const instr = (a.instruction || "").trim();

  return `
    <div class="popup">
      <div class="popupTitle">${escapeHtml(a.name)}</div>
      <div class="popupMeta">
        <span class="badge ${sevClass}">${escapeHtml(a.severity || "Unknown")}</span>
        &nbsp;• Sent: ${escapeHtml(sent)}
        &nbsp;• Expires: ${escapeHtml(exp)}
      </div>
      <div class="popupMeta">${escapeHtml(a.areaDesc || "")}</div>
      ${desc ? `<div class="popupDesc">${escapeHtml(desc)}</div>` : ""}
      ${instr ? `<div class="popupDesc"><b>Instructions:</b>\n${escapeHtml(instr)}</div>` : ""}
      <div class="popupActions">
        ${a.web ? `<a class="linkBtn" href="${a.web}" target="_blank" rel="noopener">Open NWS</a>` : ""}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function styleForAlert(alert) {
  const sev = (alert.severity || "").toLowerCase();
  let color = "#5dd6ff";
  if (sev === "extreme") color = "#ff3b3b";
  else if (sev === "severe") color = "#ff6b6b";
  else if (sev === "moderate") color = "#ffcc66";
  else if (sev === "minor") color = "#45d483";
  return {
    color,
    weight: 2,
    opacity: 0.95,
    fillColor: color,
    fillOpacity: 0.18
  };
}

/**
 * Build a Leaflet LayerGroup for an alert.
 * - Uses alert.geometry if present
 * - Else fetches each affectedZones feature and uses its geometry
 */
export async function buildAlertLayer(alert, zonesCache) {
  const group = L.layerGroup();
  const kind = kindFromEventName(alert.name);
  alert.kind = kind;

  const popupOpts = {
    autoClose: false,
    closeOnClick: false,
    closeOnEscapeKey: false,
    className: "nwsPopup"
  };

  const addGeo = (geojson, sourceLabel) => {
    const gj = L.geoJSON(geojson, {
      style: () => styleForAlert(alert),
      onEachFeature: (_f, layer) => {
        layer.bindPopup(alertToPopupHtml(alert), popupOpts);

        // Make it easier to tap on iPad:
        if (layer.setStyle) layer.setStyle({ interactive: true });

        // Store a reference
        layer._alertId = alert.id;
        layer._alertSource = sourceLabel;
      }
    });
    group.addLayer(gj);
  };

  if (alert.geometry) {
    addGeo({ type: "Feature", geometry: alert.geometry, properties: {} }, "alert.geometry");
    return group;
  }

  // Fallback: zones
  if (!alert.affectedZones?.length) return group;

  for (const zoneUrl of alert.affectedZones) {
    if (zonesCache.has(zoneUrl)) {
      const zoneFeature = zonesCache.get(zoneUrl);
      if (zoneFeature?.geometry) addGeo(zoneFeature, "zone");
      continue;
    }

    try {
      const zoneFeature = await fetchZoneFeature(zoneUrl);
      zonesCache.set(zoneUrl, zoneFeature);
      if (zoneFeature?.geometry) addGeo(zoneFeature, "zone");
    } catch (e) {
      zonesCache.set(zoneUrl, null);
      console.warn("Zone fetch failed", zoneUrl, e);
    }
  }

  return group;
}