// js/map/alertsRenderer.js
import { fetchZoneFeature } from "../api/nws.js";

function kindFromEventName(eventName) {
  const n = (eventName || "").toLowerCase();
  if (n.includes("warning")) return "Warning";
  if (n.includes("watch")) return "Watch";
  if (n.includes("advisory")) return "Advisory";
  if (n.includes("statement")) return "Statement";
  return "Other";
}

function styleForSeverity(sev) {
  const s = (sev || "").toLowerCase();
  let color = "#5dd6ff";
  if (s === "extreme") color = "#ff3b3b";
  else if (s === "severe") color = "#ff6b6b";
  else if (s === "moderate") color = "#ffcc66";
  else if (s === "minor") color = "#45d483";
  return { color, weight: 2, opacity: 0.95, fillColor: color, fillOpacity: 0.18 };
}

const SEV_RANK = {
  extreme: 5,
  severe: 4,
  moderate: 3,
  minor: 2,
  unknown: 1
};

function bestSeverity(alertIds, alertsById) {
  let best = "unknown";
  let bestScore = 0;

  for (const id of alertIds || []) {
    const a = alertsById.get(id);
    if (!a) continue;
    const s = (a.severity || "unknown").toLowerCase();
    const score = SEV_RANK[s] || 1;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

function sevColor(sevLower) {
  switch (sevLower) {
    case "extreme": return "#ff3b3b";
    case "severe": return "#ff6b6b";
    case "moderate": return "#ffcc66";
    case "minor": return "#45d483";
    default: return "#5dd6ff";
  }
}

function popupOptions() {
  return {
    autoClose: false,
    closeOnClick: false,
    closeOnEscapeKey: false,
    className: "nwsPopup",
    closeButton: false   // ✅ important
  };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fmtShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString([], { month:"numeric", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit" });
}

function sevClass(sev){
  const s = (sev || "").toLowerCase();
  if (s === "extreme" || s === "severe") return "sev";
  if (s === "moderate") return "mod";
  if (s === "minor") return "min";
  return "unk";
}

// Keep WHAT/WHERE/WHEN readable if present
function splitSections(text) {
  const t = (text || "").trim();
  if (!t) return [];

  // Try common NWS format: "* WHAT...", "* WHERE...", "* WHEN...", "* IMPACTS..."
  const lines = t.split(/\r?\n/);
  const sections = [];
  let current = null;

  const isHeader = (line) => /^\s*\*\s*(WHAT|WHERE|WHEN|IMPACTS|ADDITIONAL DETAILS)\b/i.test(line);

  for (const line of lines) {
    if (isHeader(line)) {
      if (current) sections.push(current);
      const title = line.replace(/^\s*\*\s*/,"").trim();
      current = { title, body: "" };
    } else {
      if (!current) current = { title: "", body: "" };
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  // If it didn’t really split, return a single block
  if (sections.length === 1 && !sections[0].title) {
    return [{ title: "", body: t }];
  }
  return sections.map(s => ({ title: s.title, body: s.body.trim() })).filter(s => s.title || s.body);
}

function buildPopupHtml(alert) {
  const title = alert.name || "Alert";
  const severity = alert.severity || "Unknown";
  const area = alert.areaDesc || "";
  const sent = fmtShort(alert.sent);
  const eff  = fmtShort(alert.effective || alert.onset);
  const ends = fmtShort(alert.ends || alert.expires);

  const desc = (alert.description || "").trim();
  const instr = (alert.instruction || "").trim();

  // NWS often includes "* WHAT...", "* WHERE...", etc. Keep readable with line breaks.
  const bodyText = desc || "";
  const office = alert.senderName ? String(alert.senderName) : "";

  return `
  <div class="wxpop">
    <button class="wxpopX" type="button" aria-label="Close">×</button>

    <div class="wxpopHead">
      <div class="wxpopTitle">${escapeHtml(title)}</div>
      <div class="wxpopSev ${sevClass(severity)}">${escapeHtml(severity)}</div>
    </div>

    <div class="wxpopMeta">
      ${area ? `<div class="wxrow"><span class="wxk">Area:</span><span class="wxv">${escapeHtml(area)}</span></div>` : ``}
      <div class="wxrow"><span class="wxk">Sent:</span><span class="wxv">${escapeHtml(sent)}</span></div>
      <div class="wxrow"><span class="wxk">Effective:</span><span class="wxv">${escapeHtml(eff)}</span></div>
      <div class="wxrow"><span class="wxk">Ends:</span><span class="wxv">${escapeHtml(ends)}</span></div>
    </div>

    <div class="wxpopBody">
      ${bodyText ? `<div class="wxbody">${escapeHtml(bodyText)}</div>` : ``}
      ${instr ? `<div class="wxdivider"></div><div class="wxsecTitle">Instructions:</div><div class="wxbody">${escapeHtml(instr)}</div>` : ``}
    </div>

    <div class="wxpopActions">
      ${alert.web ? `<a class="wxbtn" href="${alert.web}" target="_blank" rel="noopener">Open NWS</a>` : ``}
      ${office ? `<div class="wxbtn ghost" title="${escapeHtml(office)}">${escapeHtml(office)}</div>` : ``}
    </div>
  </div>
  `;
}

// chunk add so we don’t freeze the UI
async function addInBatches(layer, fc, batchSize = 250) {
  const feats = fc.features || [];
  for (let i = 0; i < feats.length; i += batchSize) {
    layer.addData({ type: "FeatureCollection", features: feats.slice(i, i + batchSize) });
    await new Promise(requestAnimationFrame);
  }
}

export function createAlertsRenderer(map, state, { onOpenInspect, onStatus } = {}) {
  const canvasRenderer = L.canvas({ padding: 0.5 });

  // All alert geometries in one layer
  const geometryLayer = L.geoJSON(null, {
    renderer: canvasRenderer,
    style: (feat) => styleForSeverity(feat?.properties?.severity),
    onEachFeature: (feat, layer) => {
      layer._alertId = feat?.properties?.alertId;
      /*
      layer.on("click", () => {
        const a = state.alertsById.get(layer._alertId);
        if (!a) return;
        if (!layer.getPopup()) layer.bindPopup(buildPopupHtml(a), popupOptions());
        layer.openPopup();
      });
      */
    }
  }).addTo(map);

  // Zones deduped in one layer; each zone has alertIds[]
  const zoneLayer = L.geoJSON(null, {
    renderer: canvasRenderer,
    style: (feat) => {
  const ids = feat?.properties?.alertIds || [];
  const best = bestSeverity(ids, state.alertsById);
  const color = sevColor(best);
  return {
    color,
    weight: 1.6,
    opacity: 0.75,
    fillColor: color,
    fillOpacity: 0.10
  };
},
    onEachFeature: (feat, layer) => {
      layer._zoneUrl = feat?.properties?.zoneUrl;
      layer._alertIds = feat?.properties?.alertIds || [];
      /*
      layer.on("click", () => {
        const ids = layer._alertIds || [];
        if (ids.length > 1) onOpenInspect?.(ids);
        else if (ids.length === 1) {
          const a = state.alertsById.get(ids[0]);
          if (!a) return;
          if (!layer.getPopup()) layer.bindPopup(buildPopupHtml(a), popupOptions());
          layer.openPopup();
        }
      });
      */
    }
  }).addTo(map);

  async function update(alerts) {
    geometryLayer.clearLayers();
    zoneLayer.clearLayers();

    const geomFC = { type: "FeatureCollection", features: [] };
    const zoneToAlerts = new Map();

    for (const a of alerts) {
      a.kind = kindFromEventName(a.name);

      if (a.geometry) {
        geomFC.features.push({
          type: "Feature",
          geometry: a.geometry,
          properties: { alertId: a.id, severity: a.severity }
        });
      } else if (Array.isArray(a.affectedZones)) {
        for (const z of a.affectedZones) {
          if (!zoneToAlerts.has(z)) zoneToAlerts.set(z, []);
          zoneToAlerts.get(z).push(a.id);
        }
      }
    }

    onStatus?.(`Map: adding ${geomFC.features.length} alert polygons…`);
    await addInBatches(geometryLayer, geomFC, 300);

    const zoneUrls = [...zoneToAlerts.keys()];
    onStatus?.(`Map: preparing ${zoneUrls.length} zones (deduped)…`);

    // Concurrency-limited zone fetch
    const concurrency = 10;
    let idx = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (idx < zoneUrls.length) {
        const my = zoneUrls[idx++];
        if (state.zonesCache.has(my)) continue;
        try {
          const z = await fetchZoneFeature(my);
          state.zonesCache.set(my, z || null);
        } catch {
          state.zonesCache.set(my, null);
        }
      }
    });
    await Promise.all(workers);

    const zoneFC = { type: "FeatureCollection", features: [] };
    for (const [zoneUrl, alertIds] of zoneToAlerts.entries()) {
      const z = state.zonesCache.get(zoneUrl);
      if (!z?.geometry) continue;
      const bestSev = bestSeverity(alertIds, state.alertsById);
      zoneFC.features.push({
        type: "Feature",
        geometry: z.geometry,
        properties: { zoneUrl, alertIds, bestSev }
      });
    }

    onStatus?.(`Map: adding ${zoneFC.features.length} unique zones…`);
    await addInBatches(zoneLayer, zoneFC, 200);

    onStatus?.(`Map: done`);
  }

  // ✅ Point inspect hit test for map click
  function getAlertIdsAtLatLng(latlng) {
    const ids = new Set();
    const pt = turf.point([latlng.lng, latlng.lat]);

    // geometry alerts
    geometryLayer.eachLayer((layer) => {
      const b = layer.getBounds?.();
      if (!b || !b.contains(latlng)) return;

      // precise check
      const gj = layer.toGeoJSON?.();
      if (gj?.geometry && (gj.geometry.type === "Polygon" || gj.geometry.type === "MultiPolygon")) {
        try {
          if (turf.booleanPointInPolygon(pt, gj)) {
            if (layer._alertId) ids.add(layer._alertId);
          }
        } catch {}
      }
    });

    // zones (each has multiple alertIds)
    zoneLayer.eachLayer((layer) => {
      const b = layer.getBounds?.();
      if (!b || !b.contains(latlng)) return;

      const gj = layer.toGeoJSON?.();
      if (gj?.geometry && (gj.geometry.type === "Polygon" || gj.geometry.type === "MultiPolygon")) {
        try {
          if (turf.booleanPointInPolygon(pt, gj)) {
            const aIds = layer._alertIds || [];
            for (const id of aIds) ids.add(id);
          }
        } catch {}
      }
    });

    return [...ids];
  }

  function setZonesVisible(on) {
    if (on) map.addLayer(zoneLayer);
    else map.removeLayer(zoneLayer);
  }
  function setGeomsVisible(on) {
    if (on) map.addLayer(geometryLayer);
    else map.removeLayer(geometryLayer);
  }

  return {
    update,
    setZonesVisible,
    setGeomsVisible,
    geometryLayer,
    zoneLayer,
    _buildPopupHtml: buildPopupHtml,
    getAlertIdsAtLatLng
  };
}