import { state } from "./state.js";
import { fmtTime } from "./util/time.js";
import { throttle } from "./util/throttle.js";

import { createMap } from "./map/createMap.js";
import { createRadarTimelineLayer } from "./map/radarTimeline.js";
import { createAlertsLayer } from "./map/alertsLayer.js";
import { createSpcLayer } from "./map/spcLayer.js";
import { createMetarLayer } from "./map/metarLayer.js";
import { createLightningLayer } from "./map/lightningLayer.js";
import { createSatelliteLayer } from "./map/satelliteLayer.js";

import { buildRadarFrames } from "./services/rainviewer.js";
import { fetchActiveAlerts } from "./services/nws.js";
import { buildAlertDrawFeaturesOptimized } from "./services/nwsZones.js";
import { fetchAlertsAtPoint } from "./services/nwsPoint.js";
import { fetchAlertsForViewportSamples } from "./services/nwsPoint.js";
import { fetchSpcDay1CategoricalGeoJSON } from "./services/spc.js";
import { fetchStationsInBBox, fetchLatestObservation } from "./services/metar.js";

import { createSidebar } from "./ui/sidebar.js";
import { setStatus, renderTypeChips, renderSeverityGraph, lockScrollToSidebarList } from "./ui/hud.js";
import { createToasts } from "./ui/toasts.js";
import { renderLatest } from "./ui/latest.js";

const REFRESH_ALERTS_MS = 60_000;
const REFRESH_RADAR_MS  = 120_000;
const REFRESH_SPC_MS    = 10 * 60_000;

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const ui = {
  btnRefresh: document.getElementById("btnRefresh"),
  searchInput: document.getElementById("searchInput"),
  alertsList: document.getElementById("alertsList"),
  lastUpdate: document.getElementById("lastUpdate"),
  countShown: document.getElementById("countShown"),
  typeFilters: document.getElementById("typeFilters"),
  severityGraph: document.getElementById("severityGraph"),

  radarScrub: document.getElementById("radarScrub"),
  radarPlay: document.getElementById("radarPlay"),
  radarPause: document.getElementById("radarPause"),
  radarSpeed: document.getElementById("radarSpeed"),
  radarStamp: document.getElementById("radarStamp"),

  proximityLine: document.getElementById("proximityLine"),
  btnLocate: document.getElementById("btnLocate"),
  btnStopLocate: document.getElementById("btnStopLocate"),
  togPerf: document.getElementById("togPerf"),

  latest: {
    list: document.getElementById("latestList"),
    meta: document.getElementById("latestMeta"),
  },
  toasts: document.getElementById("toasts"),

  toggles: {
    radar: document.getElementById("togRadar"),
    alerts: document.getElementById("togAlerts"),
    spc: document.getElementById("togSPC"),
    metar: document.getElementById("togMETAR"),
    lightning: document.getElementById("togLightning"),
    satellite: document.getElementById("togSat"),
  },

  inspect: {
    panel: document.getElementById("inspectPanel"),
    body: document.getElementById("inspectBody"),
    close: document.getElementById("inspectClose"),
  }
};

if (ui.alertsList) lockScrollToSidebarList(ui.alertsList);

let localPointAlerts = []; // small set near map center
const refreshLocalPointAlerts = throttle(async () => {
  try {
    const c = map.getCenter();
    const fc = await fetchAlertsAtPoint(c.lat, c.lng);
    localPointAlerts = (fc?.features || []).slice(0, 12); // keep it small
  } catch (e) {
    console.warn("local point alerts failed", e);
    localPointAlerts = [];
  }
}, 1200);

function matchesSearch(feature, q) {
  if (!q) return true;
  const p = feature?.properties || {};
  const blob = `${p.event || ""} ${p.headline || ""} ${p.areaDesc || ""} ${p.description || ""} ${p.instruction || ""}`.toLowerCase();
  return blob.includes(q);
}

function filterAlertsAllDataset() {
  const types = state.filters.types || {};
  const q = (state.filters.search || "").trim().toLowerCase();

  return (state.alerts?.features || []).filter((f) => {
    const p = f?.properties || {};
    const kind = sidebar.classify(p.event || "");
    const effectiveKind = Object.prototype.hasOwnProperty.call(types, kind) ? kind : "other";
    if (types && types[effectiveKind] === false) return false;
    if (!matchesSearch(f, q)) return false;
    return true;
  });
}

// Map
let map = createMap("map", { perfMode: state.perfMode });
setTimeout(() => map.invalidateSize(true), 0);

// Layers
const radar = createRadarTimelineLayer(map);
const alertsLayer = createAlertsLayer(map);
const spcLayer = createSpcLayer(map);
const metarLayer = createMetarLayer(map);
const lightningLayer = createLightningLayer(map);
const satelliteLayer = createSatelliteLayer(map);

// Sidebar
const sidebar = createSidebar({
  container: ui.alertsList,
  onSelectAlert: async (alertFeature) => {
    await forceDrawSingleAlert(alertFeature);
    alertsLayer.focusAlert(alertFeature);
  },
});

// Toasts
const toast = ui.toasts ? createToasts(ui.toasts) : null;

// New alert detection (no toast spam on first load)
let prevAlertIds = null;
function computeNewAlerts(features) {
  const cur = new Set((features || []).map(f => f.id));
  if (prevAlertIds === null) {
    prevAlertIds = cur;
    return [];
  }
  const added = (features || []).filter(f => !prevAlertIds.has(f.id));
  prevAlertIds = cur;
  return added;
}

function applyLayerVisibility() {
  state.layersOn.radar ? radar.show() : radar.hide();
  state.layersOn.alerts ? alertsLayer.show() : alertsLayer.hide();
  state.layersOn.spc ? spcLayer.show() : spcLayer.hide();
  state.layersOn.metar ? metarLayer.show() : metarLayer.hide();
  state.layersOn.lightning ? lightningLayer.show() : lightningLayer.hide();
  state.layersOn.satellite ? satelliteLayer.show() : satelliteLayer.hide();
}

function refreshSeverityGraph() {
  renderSeverityGraph(ui.severityGraph, sidebar.computeSeverityCounts());
}

function refreshSidebarOnly() {
  // MUST be the full dataset, not the drawn subset
  sidebar.setAlerts(state.alerts?.features || []);
  sidebar.filter(state.filters.search, state.filters.types);

  if (ui.countShown) ui.countShown.textContent = String(sidebar.getShownCount());
  refreshSeverityGraph();

  if (ui.latest?.list && ui.latest?.meta) {
    renderLatest(
      { listEl: ui.latest.list, metaEl: ui.latest.meta },
      state.alerts?.features || [], // also full set
      { max: 6, onClick: (feat) => alertsLayer.focusAlert(feat) }
    );
  }
}

function applyFiltersToDraw(drawFeatures) {
  const types = state.filters.types || {};
  const q = (state.filters.search || "").trim().toLowerCase();

  return (drawFeatures || []).filter((f) => {
    const p = f?.properties || {};
    const event = p.event || "";
    const kind = sidebar.classify(event);

    // If kind isn't in types map, treat it as "other"
    const effectiveKind = Object.prototype.hasOwnProperty.call(types, kind) ? kind : "other";
    if (types && types[effectiveKind] === false) return false;

    if (q) {
      const blob = `${event} ${p.headline || ""} ${p.areaDesc || ""} ${p.description || ""} ${p.instruction || ""}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return !!f.geometry;
  });
}

let viewportSampleAlerts = [];
const refreshViewportSampleAlerts = throttle(async () => {
  try {
    viewportSampleAlerts = await fetchAlertsForViewportSamples(map);
  } catch (e) {
    console.warn("viewport sample alerts failed", e);
    viewportSampleAlerts = [];
  }
}, 1200);

const updateAlertsDrawDebounced = debounce(async () => {
  if (!state.layersOn.alerts) return;
  if (!state.alerts?.features?.length) return;

  const q = (state.filters.search || "").trim().toLowerCase();
  const inSearch = q.length > 0;

  // ---- Always: draw what's already drawable in/near viewport (real geometry + small zone slice)
  const viewportBase = await buildAlertDrawFeaturesOptimized(state.alerts.features, map, {
    maxZonesPerAlert: state.perfMode ? 10 : 30,
    viewportPad: 0.55,
    mode: "viewport",
    noZoneSlice: false, // IMPORTANT: don't brute scan national list
  });

  let viewportFiltered = applyFiltersToDraw(viewportBase);

  // inside updateAlertsDrawDebounced, after you build viewportFiltered...
if (!inSearch) {
  // Boost only the alerts proven to affect the current viewport (center+corners)
  if (viewportSampleAlerts.length) {
    const boostDraw = await buildAlertDrawFeaturesOptimized(viewportSampleAlerts, map, {
      mode: "viewport",
      viewportPad: 0.55,
      noZoneSlice: true,                 // safe: small set
      maxTotalZones: state.perfMode ? 260 : 700,
      batchSize: 24,
    });

    const boostFiltered = applyFiltersToDraw(boostDraw);

    const seen = new Set(viewportFiltered.map(f => f.id));
    for (const f of boostFiltered) {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        viewportFiltered.push(f);
      }
    }
  }

  state.alertsDraw = { type: "FeatureCollection", features: viewportFiltered };
  alertsLayer.setAlerts(state.alertsDraw);
  return;
}

  // Build the matching alert set from the FULL dataset (not drawn subset)
  const types = state.filters.types || {};
  const matchesSearch = (f) => {
    const p = f?.properties || {};
    const blob = `${p.event || ""} ${p.headline || ""} ${p.areaDesc || ""} ${p.description || ""} ${p.instruction || ""}`.toLowerCase();
    return blob.includes(q);
  };

  const matchingAlerts = (state.alerts.features || []).filter((f) => {
    const p = f?.properties || {};
    const kind = sidebar.classify(p.event || "");
    const effectiveKind = Object.prototype.hasOwnProperty.call(types, kind) ? kind : "other";

    // search should still respect type chips (change to override if you want)
    if (types && types[effectiveKind] === false) return false;

    return matchesSearch(f);
  });

  // SAFETY: only boost a limited number of matching alerts
  // sort newest first so the important ones get boosted
  const boosted = matchingAlerts
    .slice()
    .sort((a, b) => (b.properties?.sent ? Date.parse(b.properties.sent) : 0) - (a.properties?.sent ? Date.parse(a.properties.sent) : 0))
    .slice(0, 80);

  // 🔥 Boost draw: noZoneSlice avoids the "wrong zone not in first N" issue
  // Still viewport mode, so we only draw zones that intersect your current view.
  const boostedDraw = await buildAlertDrawFeaturesOptimized(boosted, map, {
    mode: "viewport",
    viewportPad: 0.55,
    noZoneSlice: true,
    maxTotalZones: state.perfMode ? 220 : 520, // global cap during search
    batchSize: 24,
  });

  const boostedFiltered = applyFiltersToDraw(boostedDraw);

  // Merge (viewport first, then boosted extras)
  const merged = viewportFiltered.slice();
  const seen = new Set(merged.map(f => f.id));
  for (const f of boostedFiltered) {
    if (!seen.has(f.id)) {
      seen.add(f.id);
      merged.push(f);
    }
  }

  state.alertsDraw = { type: "FeatureCollection", features: merged };
  alertsLayer.setAlerts(state.alertsDraw);
}, 250);

async function refreshAlerts() {
  const data = await fetchActiveAlerts();
  state.alerts = data;

  if (ui.lastUpdate) ui.lastUpdate.textContent = fmtTime(Date.now());

  // Sidebar updates immediately (fast)
  refreshSidebarOnly();

  // Toast for NEW alerts only
  const added = computeNewAlerts(data.features || []);
  if (toast) {
    for (const f of added.slice(0, 3)) {
      toast.pushAlertToast(f, { onZoom: (feat) => alertsLayer.focusAlert(feat) });
    }
  }

  // Draw immediate: alerts that already have geometry
  const immediate = {
    type: "FeatureCollection",
    features: applyFiltersToDraw((data.features || []).filter(f => !!f.geometry)),
  };
  state.alertsDraw = immediate;
  alertsLayer.setAlerts(immediate);

  // Then build optimized zone fallback after settle
  updateAlertsDrawDebounced();
}

async function refreshRadar() {
  state.radarFrames = buildRadarFrames({ minutesBack: 90, stepMinutes: 5 });

  if (ui.radarScrub) {
    ui.radarScrub.max = String(Math.max(0, state.radarFrames.length - 1));
    state.radarIndex = Math.min(state.radarIndex, Math.max(0, state.radarFrames.length - 1));
    ui.radarScrub.value = String(state.radarIndex);
  }

  setRadarFrame(state.radarIndex);
}

function setRadarFrame(idx) {
  const frame = state.radarFrames[idx];
  if (!frame) return;
  radar.setFrame(frame);
  if (ui.radarStamp) ui.radarStamp.textContent = `Frame: ${frame.label}`;
}

function stopRadarPlayback() {
  state.radarPlaying = false;
  if (state.radarTimer) clearInterval(state.radarTimer);
  state.radarTimer = null;
}

function startRadarPlayback() {
  stopRadarPlayback();
  state.radarPlaying = true;

  const tickMs = Number(ui.radarSpeed?.value || 700);

  state.radarTimer = setInterval(() => {
    if (!state.radarFrames.length) return;
    state.radarIndex = (state.radarIndex + 1) % state.radarFrames.length;
    if (ui.radarScrub) ui.radarScrub.value = String(state.radarIndex);
    setRadarFrame(state.radarIndex);
  }, tickMs);
}

async function refreshSPC() {
  const fc = await fetchSpcDay1CategoricalGeoJSON();
  spcLayer.setGeoJSON(fc);
}

async function refreshObsNow() {
  const z = map.getZoom();
  if (z < 7) {
    metarLayer.setMetars([]);
    return;
  }

  const fc = await fetchStationsInBBox(map.getBounds(), { limit: 30 });

  const stations = (fc.features || [])
    .filter(f => f?.properties?.stationIdentifier && f?.geometry?.coordinates?.length >= 2)
    .slice(0, 20);

  const results = await Promise.allSettled(
    stations.map(async (s) => {
      const id = s.properties.stationIdentifier;
      const obs = await fetchLatestObservation(id);
      return { station: s, obs };
    })
  );

  const ok = results.filter(r => r.status === "fulfilled").map(r => r.value);
  metarLayer.setMetars(ok);
}

const refreshObsThrottled = throttle(async () => {
  if (!state.layersOn.metar) return;
  await refreshObsNow();
}, 1500);

function setProximityText(text) {
  if (ui.proximityLine) ui.proximityLine.textContent = `Proximity: ${text}`;
}

function computeProximity(latlng) {
  if (!state.alertsDraw?.features?.length) return "—";
  const pt = turf.point([latlng.lng, latlng.lat]);

  let insideCount = 0;
  let nearestMi = Infinity;

  for (const f of state.alertsDraw.features) {
    try {
      if (turf.booleanPointInPolygon(pt, f)) insideCount++;
      const d = turf.distance(pt, turf.centroid(f), { units: "miles" });
      if (Number.isFinite(d)) nearestMi = Math.min(nearestMi, d);
    } catch {}
  }

  if (insideCount > 0) return `INSIDE (${insideCount})`;
  if (Number.isFinite(nearestMi)) return nearestMi <= 25 ? `NEAR (~${nearestMi.toFixed(1)} mi)` : `FAR (~${nearestMi.toFixed(1)} mi)`;
  return "—";
}

function stopFollow() {
  state.follow.on = false;
  if (state.follow.watchId != null) navigator.geolocation.clearWatch(state.follow.watchId);
  state.follow.watchId = null;
}

function startFollow() {
  if (!navigator.geolocation) { setStatus("Geolocation not supported", "err"); return; }
  stopFollow();

  state.follow.on = true;

  state.follow.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
      state.follow.lastLatLng = latlng;

      if (!state.follow.marker) {
        state.follow.marker = L.circleMarker(latlng, { radius: 7, weight: 2, opacity: 1, fillOpacity: 0.25 }).addTo(map);
      } else {
        state.follow.marker.setLatLng(latlng);
      }

      map.setView(latlng, Math.max(map.getZoom(), 10), { animate: true, duration: 0.35 });
      setProximityText(computeProximity(latlng));
    },
    () => {
      setStatus("Location denied", "warn");
      stopFollow();
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
  );
}

// Inspect panel close guard
if (ui.inspect?.close) {
  ui.inspect.close.addEventListener("click", () => {
    if (ui.inspect.panel) ui.inspect.panel.style.display = "none";
  });
}

// IMPORTANT: Inspect uses DRAWN features (includes zone fallback)
function baseAlertId(featureId) {
  if (!featureId) return "";
  const s = String(featureId);
  const i = s.indexOf("::zone::");
  return i >= 0 ? s.slice(0, i) : s;
}

async function showInspect(latlng) {
  if (!ui.inspect?.panel || !ui.inspect?.body) return;

  ui.inspect.body.innerHTML =
    `<div class="inspectItem"><div class="inspectItem__t">Loading…</div><div class="inspectItem__m">Checking alerts for this point</div></div>`;
  ui.inspect.panel.style.display = "block";

  let fc;
  try {
    fc = await fetchAlertsAtPoint(latlng.lat, latlng.lng);
  } catch (e) {
    console.error(e);
    ui.inspect.body.innerHTML =
      `<div class="inspectItem"><div class="inspectItem__t">Failed</div><div class="inspectItem__m">Couldn’t load alerts at this point.</div></div>`;
    return;
  }

  const hits = (fc.features || []).slice();

  // Render inspect list
  ui.inspect.body.innerHTML = hits.length
    ? hits.map(f => {
        const p = f.properties || {};
        return `
          <div class="inspectItem" style="cursor:pointer" data-id="${String(f.id)}">
            <div class="inspectItem__t">${p.event || "Alert"}</div>
            <div class="inspectItem__m">${p.severity || "Unknown"} • ${p.areaDesc || ""}</div>
          </div>
        `;
      }).join("")
    : `<div class="inspectItem"><div class="inspectItem__t">No alerts at this point</div><div class="inspectItem__m">—</div></div>`;


  // click-to-focus (zoom + popup)
  ui.inspect.body.querySelectorAll(".inspectItem[data-id]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-id");
      const f = (state.alerts?.features || []).find(x => x.id === id) || hits.find(x => x.id === id);
      if (f) alertsLayer.focusAlert(f);
    });
  });
}

map.on("click", (e) => showInspect(e.latlng));

map.on("moveend zoomend", () => {
  refreshViewportSampleAlerts();
  updateAlertsDrawDebounced();
});

function renderTypeUI() {
  renderTypeChips(ui.typeFilters, state.filters.types, (key) => {
    state.filters.types[key] = !state.filters.types[key];
    renderTypeUI();
    refreshSidebarOnly();
    updateAlertsDrawDebounced();
  });
}
renderTypeUI();

if (ui.searchInput) {
  ui.searchInput.addEventListener("input", (e) => {
    state.filters.search = e.target.value || "";
    refreshSidebarOnly();        // filters full list
    updateAlertsDrawDebounced(); // optional: if you want map to reflect filters too
  });
}

async function forceDrawSingleAlert(alertFeature) {
  // If it already has geometry, nothing to fetch
  if (alertFeature?.geometry) return;

  const zones = alertFeature?.properties?.affectedZones || [];
  if (!zones.length) return;

  // Fetch a few zones just to get a bounds to zoom to (fast)
  const take = zones.slice(0, 6);
  const results = await Promise.allSettled(
    take.map((u) => fetch(u, { headers: { Accept: "application/geo+json" } }).then(r => r.ok ? r.json() : null))
  );

  const feats = results
    .filter(r => r.status === "fulfilled" && r.value?.geometry)
    .map(r => ({ type: "Feature", geometry: r.value.geometry, properties: alertFeature.properties }));

  if (!feats.length) return;

  const fg = L.geoJSON({ type: "FeatureCollection", features: feats });
  map.fitBounds(fg.getBounds().pad(0.25), { animate: true, duration: 0.45 });

  // After moving, your debounced viewport builder will pull the rest naturally
  updateAlertsDrawDebounced();
}

for (const [k, el] of Object.entries(ui.toggles)) {
  if (!el) continue;
  el.addEventListener("change", async () => {
    state.layersOn[k] = el.checked;
    applyLayerVisibility();

    if (k === "metar") {
      if (el.checked) await refreshObsNow();
      else metarLayer.setMetars([]);
    }

    if (k === "spc" && el.checked) await refreshSPC();

    if (k === "alerts") {
      if (el.checked) updateAlertsDrawDebounced();
      else alertsLayer.setAlerts({ type: "FeatureCollection", features: [] });
    }
  });
}

if (ui.radarScrub) {
  ui.radarScrub.addEventListener("input", (e) => {
    stopRadarPlayback();
    state.radarIndex = Number(e.target.value || 0);
    setRadarFrame(state.radarIndex);
  });
}
if (ui.radarPlay) ui.radarPlay.addEventListener("click", () => startRadarPlayback());
if (ui.radarPause) ui.radarPause.addEventListener("click", () => stopRadarPlayback());
if (ui.radarSpeed) ui.radarSpeed.addEventListener("change", () => { if (state.radarPlaying) startRadarPlayback(); });

if (ui.btnLocate) ui.btnLocate.addEventListener("click", () => startFollow());
if (ui.btnStopLocate) ui.btnStopLocate.addEventListener("click", () => stopFollow());

if (ui.togPerf) {
  ui.togPerf.addEventListener("change", () => {
    state.perfMode = ui.togPerf.checked;
    location.reload();
  });
}

if (ui.btnRefresh) {
  ui.btnRefresh.addEventListener("click", async () => {
    setStatus("Refreshing…");
    await Promise.allSettled([
      refreshRadar(),
      refreshAlerts(),
      state.layersOn.spc ? refreshSPC() : Promise.resolve(),
      state.layersOn.metar ? refreshObsNow() : Promise.resolve(),
    ]);
    setStatus("Updated", "ok");
  });
}

(async function init() {
  try {
    setStatus("Loading radar…");
    await refreshRadar();

    setStatus("Loading alerts…");
    await refreshAlerts();

    applyLayerVisibility();
    setStatus("Ready", "ok");

    setInterval(() => refreshRadar().catch(console.warn), REFRESH_RADAR_MS);
    setInterval(() => refreshAlerts().catch(console.warn), REFRESH_ALERTS_MS);
    setInterval(() => { if (state.layersOn.spc) refreshSPC().catch(console.warn); }, REFRESH_SPC_MS);
  } catch (e) {
    console.error(e);
    setStatus("Failed to initialize (check console)", "err");
  }
})();