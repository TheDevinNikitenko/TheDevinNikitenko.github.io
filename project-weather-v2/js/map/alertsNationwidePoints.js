// js/map/alertsNationwidePoints.js
// Nationwide alert "dots" layer (fast):
// - Uses alert geometry centroid when available
// - If geometry missing but affectedZones exists, it lazily fetches ONE zone geometry to place a dot
// - Canvas renderer for performance

import { severityColor } from "../ui/severity.js";

const ZONE_POINT_CACHE = new Map(); // zoneUrl -> [lat,lng] | null

function safe(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

async function zoneUrlToPoint(zoneUrl) {
  if (!zoneUrl) return null;
  if (ZONE_POINT_CACHE.has(zoneUrl)) return ZONE_POINT_CACHE.get(zoneUrl);

  try {
    const res = await fetch(zoneUrl, { headers: { Accept: "application/geo+json" } });
    if (!res.ok) { ZONE_POINT_CACHE.set(zoneUrl, null); return null; }
    const z = await res.json();
    if (!z?.geometry) { ZONE_POINT_CACHE.set(zoneUrl, null); return null; }

    // centroid of zone geometry
    const c = turf.centroid(z);
    const coords = c?.geometry?.coordinates;
    if (!coords || coords.length < 2) { ZONE_POINT_CACHE.set(zoneUrl, null); return null; }

    const pt = [coords[1], coords[0]]; // [lat,lng]
    ZONE_POINT_CACHE.set(zoneUrl, pt);
    return pt;
  } catch {
    ZONE_POINT_CACHE.set(zoneUrl, null);
    return null;
  }
}

function centroidFromAlertGeometry(feature) {
  try {
    const c = turf.centroid(feature);
    const coords = c?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return [coords[1], coords[0]]; // [lat,lng]
  } catch {
    return null;
  }
}

export function createAlertsNationwidePointsLayer(map, {
  onSelectAlert,
  maxZoneLookups = 250,     // how many missing-geometry alerts we try to place with zone lookup
  zoneLookupConcurrency = 6 // keep it gentle
} = {}) {
  const renderer = L.canvas({ padding: 0.5 });
  const group = L.layerGroup();

  let enabled = true;
  let currentAlerts = [];

  // internal: one layer we rebuild
  let geo = L.geoJSON([], {
    renderer,
    pointToLayer: (feature, latlng) => {
      const p = feature?.properties || {};
      const sev = p.severity || "Unknown";
      const col = severityColor(sev);

      return L.circleMarker(latlng, {
        renderer,
        radius: 5,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.25,
        color: col,
        fillColor: col,
      });
    },
    onEachFeature: (feature, layer) => {
      const p = feature?.properties || {};
      layer.bindTooltip(`${p.event || "Alert"}`, { direction: "top", opacity: 0.9 });

      layer.on("click", () => {
        if (onSelectAlert) onSelectAlert(feature.__srcAlert || feature);
      });

      layer.bindPopup(
        `<div class="popup">
          <div class="popup__top">
            <div class="popup__title">${safe(p.event || "Alert")}</div>
            <div class="popup__tag">${safe(p.severity || "Unknown")}</div>
          </div>
          <div class="popup__meta">
            <div><span style="color:rgba(255,255,255,0.65)">Area:</span> ${safe(p.areaDesc || "—")}</div>
            <div><span style="color:rgba(255,255,255,0.65)">Sent:</span> ${safe(p.sent || "—")}</div>
            <div><span style="color:rgba(255,255,255,0.65)">Ends:</span> ${safe(p.ends || p.expires || "—")}</div>
          </div>
        </div>`,
        { className: "weather-popup", maxWidth: 360 }
      );
    },
  });

  group.addLayer(geo);
  group.addTo(map);

  function show() {
    enabled = true;
    if (!map.hasLayer(group)) map.addLayer(group);
  }

  function hide() {
    enabled = false;
    if (map.hasLayer(group)) map.removeLayer(group);
  }

  function setAlerts(alertFeatures) {
    currentAlerts = alertFeatures || [];
    geo.clearLayers();

    // Build point features for alerts with geometry immediately
    const pointFC = {
      type: "FeatureCollection",
      features: [],
    };

    for (const a of currentAlerts) {
      const p = a?.properties || {};
      const pt = a?.geometry ? centroidFromAlertGeometry(a) : null;
      if (!pt) continue;

      pointFC.features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pt[1], pt[0]] }, // [lng,lat]
        properties: p,
        __srcAlert: a,
      });
    }

    geo.addData(pointFC);

    // Lazy-add dots for alerts that have NO geometry using a zone centroid lookup
    hydrateMissingGeometryDots().catch(console.warn);
  }

  async function hydrateMissingGeometryDots() {
    if (!enabled) return;

    const missing = currentAlerts.filter(a =>
      !a?.geometry && Array.isArray(a?.properties?.affectedZones) && a.properties.affectedZones.length
    );

    // Cap so you don't accidentally fetch 2000 zones
    const todo = missing.slice(0, maxZoneLookups);

    let idx = 0;
    async function worker() {
      while (idx < todo.length) {
        const i = idx++;
        const a = todo[i];
        const zoneUrl = a.properties.affectedZones?.[0];
        const pt = await zoneUrlToPoint(zoneUrl);
        if (!pt) continue;

        const f = {
          type: "Feature",
          geometry: { type: "Point", coordinates: [pt[1], pt[0]] },
          properties: a.properties || {},
          __srcAlert: a,
        };
        geo.addData(f);
      }
    }

    const workers = [];
    for (let k = 0; k < zoneLookupConcurrency; k++) workers.push(worker());
    await Promise.all(workers);
  }

  return { show, hide, setAlerts };
}