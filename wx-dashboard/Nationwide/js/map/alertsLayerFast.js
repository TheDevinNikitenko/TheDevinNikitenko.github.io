// js/map/alertsLayerFast.js
import { fetchZoneFeature } from "../api/nws.js";
import { alertToPopupHtml, severityBadgeClass } from "./alertsLayer.js"; // reuse your existing popup builder if you want

function kindFromEventName(eventName) {
  const n = (eventName || "").toLowerCase();
  if (n.includes("warning")) return "Warning";
  if (n.includes("watch")) return "Watch";
  if (n.includes("advisory")) return "Advisory";
  if (n.includes("statement")) return "Statement";
  return "Other";
}

function styleForAlert(alert) {
  const sev = (alert.severity || "").toLowerCase();
  let color = "#5dd6ff";
  if (sev === "extreme") color = "#ff3b3b";
  else if (sev === "severe") color = "#ff6b6b";
  else if (sev === "moderate") color = "#ffcc66";
  else if (sev === "minor") color = "#45d483";
  return { color, weight: 2, opacity: 0.95, fillColor: color, fillOpacity: 0.18 };
}

// ✅ signature used to skip unchanged alerts
export function layerSignature(a) {
  // include only properties that affect geometry / style / popup content
  // (keep it cheap)
  const g = a.geometry ? JSON.stringify(a.geometry).length : 0;
  const zones = a.affectedZones?.length || 0;
  return [
    a.id,
    a.sent || "",
    a.expires || "",
    a.severity || "",
    a.name || "",
    g,
    zones
  ].join("|");
}

/**
 * Returns:
 *  - layer: Leaflet LayerGroup (added immediately)
 *  - zoneTasks: array of functions to run in background (fetch + create zone layers)
 */
export function buildAlertLayerFast(alert, zonesCache, { onZoneReady } = {}) {
  alert.kind = kindFromEventName(alert.name);

  const popupOpts = {
    autoClose: false,
    closeOnClick: false,
    closeOnEscapeKey: false,
    className: "nwsPopup"
  };

  const group = L.layerGroup();

  const makeGeoLayer = (geojson) => {
    return L.geoJSON(geojson, {
      renderer: L.canvas(), // ✅ big speed-up for lots of vectors
      style: () => styleForAlert(alert),
      onEachFeature: (_f, layer) => {
        layer._alertId = alert.id;
        layer.bindPopup(alertToPopupHtml(alert), popupOpts);
      }
    });
  };

  // FAST: geometry present -> add immediately
  if (alert.geometry) {
    const geo = { type: "Feature", geometry: alert.geometry, properties: { id: alert.id } };
    group.addLayer(makeGeoLayer(geo));
    return { layer: group, zoneTasks: [] };
  }

  // No geometry: schedule zone tasks (don’t block)
  const zoneTasks = [];
  const zones = Array.isArray(alert.affectedZones) ? alert.affectedZones : [];
  if (!zones.length) return { layer: group, zoneTasks: [] };

  for (const zoneUrl of zones) {
    zoneTasks.push(async () => {
      // cached?
      if (zonesCache.has(zoneUrl)) {
        const z = zonesCache.get(zoneUrl);
        if (z?.geometry) {
          const zLayer = makeGeoLayer(z);
          onZoneReady?.(alert.id, zLayer);
        }
        return;
      }

      try {
        const z = await fetchZoneFeature(zoneUrl);
        zonesCache.set(zoneUrl, z || null);
        if (z?.geometry) {
          const zLayer = makeGeoLayer(z);
          onZoneReady?.(alert.id, zLayer);
        }
      } catch (e) {
        zonesCache.set(zoneUrl, null);
        throw e;
      }
    });
  }

  return { layer: group, zoneTasks };
}