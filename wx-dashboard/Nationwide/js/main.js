// js/main.js

import { state } from "./state.js";
import { createMap } from "./map/map.js";

import { fetchActiveAlertsGeoJSON, normalizeAlert } from "./api/nws.js";
import { fetchRadarTimestamps, rainviewerTileUrl } from "./api/radar.js";

import { createAlertsRenderer } from "./map/alertsRenderer.js";

import { renderStatus } from "./ui/status.js";
import { renderSidebar } from "./ui/sidebar.js";
import { renderRightPanel } from "./ui/rightpanel.js";

const REFRESH_ALERTS_MS = state.refresh.alertsMs;
const REFRESH_RADAR_MS  = state.refresh.radarMs;

/* ---------------------------
   Small helpers
---------------------------- */

function setStatus(text, kind = "info") {
  state.ui.statusText = text;
  state.ui.statusKind = kind;
  renderStatus(state);
}

function flyToAlert(alertId) {
  const b = getAlertBounds(alertId);
  if (!b) return null;

  const center = b.getCenter();

  // Compute a reasonable zoom target from the bounds, then enforce a minimum
  const fitZoom = state.map.getBoundsZoom(b.pad(0.20), false, [20, 20]);
  const minZoom = 9;          // always zoom in at least this much
  const maxZoom = 12;
  const targetZoom = Math.max(minZoom, Math.min(maxZoom, fitZoom));

  // ✅ one animation only
  state.map.flyTo(center, targetZoom, {
    animate: true,
    duration: 0.45
  });

  return { center, targetZoom };
}

function openAlertFromId(alertId) {
  const a = state.alertsById.get(alertId);
  if (!a) return;

  const move = flyToAlert(alertId);
  const latlng = move?.center || state.map.getCenter();

  // ✅ open popup after movement finishes (one-time)
  const onDone = () => {
    state.map.off("moveend", onDone);
    openPopupAt(latlng, a);
  };
  state.map.on("moveend", onDone);
}

function updateRecent(alerts) {
  for (const a of alerts) {
    if (!state.recent.seenIds.has(a.id)) {
      state.recent.seenIds.add(a.id);
      state.recent.items.unshift({ id: a.id, name: a.name, sent: a.sent, severity: a.severity });
      if (state.recent.items.length > state.recent.max) state.recent.items.pop();
    }
  }
}

function showInspectFromAlertIds(alertIds) {
  const sheet = document.querySelector("#inspectSheet");
  const list  = document.querySelector("#inspectList");
  const sub   = document.querySelector("#inspectSubtitle");
  const close = document.querySelector("#inspectCloseBtn");

  if (!sheet || !list) return;

  const alerts = (alertIds || [])
    .map(id => state.alertsById.get(id))
    .filter(Boolean)
    .sort((a,b) => (b.sent || "").localeCompare(a.sent || ""));

  if (!alerts.length) return;

  sheet.classList.remove("hidden");
  list.innerHTML = "";
  if (sub) {
  sub.textContent =
    alerts.length === 1
      ? "1 alert at this point. Tap to open."
      : `${alerts.length} alerts overlap here. Tap one to open.`;
}

  const fmtTime = (iso) => iso ? new Date(iso).toLocaleString() : "—";
  const sevClass = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "extreme" || s === "severe") return "bad";
    if (s === "moderate") return "warn";
    if (s === "minor") return "ok";
    return "";
  };

  for (const a of alerts) {
    const item = document.createElement("div");
    item.className = "alertItem";
    item.innerHTML = `
      <div class="top">
        <div class="name">${escapeHtml(a.name || "Alert")}</div>
        <div class="badge ${sevClass(a.severity)}">${escapeHtml(a.severity || "Unknown")}</div>
      </div>
      <div class="meta">Sent: ${escapeHtml(fmtTime(a.sent))} • ${escapeHtml(a.areaDesc || "")}</div>
    `;

    item.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        sheet.classList.add("hidden");
        list.innerHTML = "";
        openAlertFromId(a.id);
    });

    list.appendChild(item);
  }

  // Ensure close button works even if inspect.js isn't managing it
  if (close && !close.dataset.bound) {
    close.dataset.bound = "1";
    close.addEventListener("click", () => {
      sheet.classList.add("hidden");
      list.innerHTML = "";
    });
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

let floatingPopup = null;

function openPopupAt(latlng, alertObj) {
  const html = state.alertsRenderer?._buildPopupHtml
    ? state.alertsRenderer._buildPopupHtml(alertObj)
    : `<div class="wxpop"><div class="wxpopTitle">${alertObj.name || "Alert"}</div></div>`;

  const popup = L.popup({
    autoClose: false,
    closeOnClick: false,
    closeOnEscapeKey: false,
    className: "nwsPopup",
    closeButton: false,   // we use our own X
    maxWidth: 360
  })
    .setLatLng(latlng)
    .setContent(html)
    .openOn(state.map);

  // Bind X to close THIS popup instance
  setTimeout(() => {
    const el = popup.getElement?.();
    if (!el) return;

    const x = el.querySelector(".wxpopX");
    if (!x) return;

    x.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      state.map.closePopup(popup);
    });
  }, 0);

  return popup;
}

function getAlertBounds(alertId) {
  const r = state.alertsRenderer;
  if (!r) return null;

  let bounds = null;

  // 1) Geometry features
  r.geometryLayer.eachLayer((layer) => {
    if (layer?._alertId !== alertId) return;
    const b = layer.getBounds?.();
    if (b?.isValid?.()) bounds = bounds ? bounds.extend(b) : b;
  });
  if (bounds?.isValid?.()) return bounds;

  // 2) Zone features (deduped zones)
  r.zoneLayer.eachLayer((layer) => {
    const ids = layer?._alertIds || [];
    if (!ids.includes(alertId)) return;
    const b = layer.getBounds?.();
    if (b?.isValid?.()) bounds = bounds ? bounds.extend(b) : b;
  });

  return bounds?.isValid?.() ? bounds : null;
}

function zoomToAlert(alertId) {
  const b = getAlertBounds(alertId);
  if (!b) return null;

  const center = b.getCenter();

  // Force closer zoom even if it’s already in view:
  const current = state.map.getZoom();
  const targetZoom = Math.max(current, 9);     // ✅ “always closer”
  const maxZoom = 12;                          // cap so it doesn’t go insane

  // fitBounds chooses zoom based on size; setView forces a closer zoom
  state.map.fitBounds(b.pad(0.20), { maxZoom, animate: true, duration: 0.35 });

  // After fitBounds settles, force a minimum zoom
  setTimeout(() => {
    if (state.map.getZoom() < targetZoom) {
      state.map.setView(center, targetZoom, { animate: true, duration: 0.25 });
    }
  }, 250);

  return { bounds: b, center };
}

/* ---------------------------
   Radar
---------------------------- */

function applyRadarLayer() {
  if (state.radar.tileLayer) {
    try { state.map.removeLayer(state.radar.tileLayer); } catch {}
    state.radar.tileLayer = null;
  }

  if (!state.radar.enabled) return;
  const ts = state.radar.timestamps[state.radar.currentIndex];
  if (!ts) return;

  const RAINVIEWER_MAX_NATIVE_ZOOM = 7;

state.radar.tileLayer = L.tileLayer(rainviewerTileUrl(ts), {
  opacity: state.radar.opacity,
  zIndex: 450,

  // ✅ stop requesting unsupported tiles (fixes ORB spam + disappearing)
  maxNativeZoom: RAINVIEWER_MAX_NATIVE_ZOOM,
  maxZoom: 18,

  // optional smoothness
  updateWhenZooming: false,
  updateWhenIdle: true,
  keepBuffer: 2,

  // optional: reduce noisy broken-tile visuals if any slip through
  errorTileUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Z3n0AAAAASUVORK5CYII=",
}).addTo(state.map);
}

async function refreshRadar() {
  setStatus("Loading radar timestamps…");
  const ts = await fetchRadarTimestamps();
  state.radar.timestamps = ts || [];
  state.radar.currentIndex = Math.max(0, state.radar.timestamps.length - 1);
  applyRadarLayer();
}



/* ---------------------------
   Alerts (OPTIMIZED)
---------------------------- */

// simple concurrency limiter (no deps)
function pLimit(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => { active--; next(); });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

const zoneLimit = pLimit(10); // background zone fetch concurrency
let alertsAbort = null;

async function refreshAlerts() {
  setStatus("Loading NWS alerts…");

  const gj = await fetchActiveAlertsGeoJSON();
  const normalized = (gj.features || []).map(normalizeAlert);

  state.alerts = normalized;
  state.alertsById = new Map(normalized.map(a => [a.id, a]));
  updateRecent(normalized);

  setStatus(`Rendering ${normalized.length} alerts on map…`);
  await state.alertsRenderer.update(normalized);

  state.refresh.lastFetchIso = new Date().toISOString();
  setStatus(`Ready • ${normalized.length} alerts`, normalized.length ? "warn" : "ok");
}

/* ---------------------------
   UI render
---------------------------- */

function renderAllUI() {
  renderStatus(state);

    renderSidebar(state, { onSelectAlert: (id) => openAlertFromId(id) });

  renderRightPanel(state, {
    onToggleRadar: (enabled) => {
      state.radar.enabled = enabled;
      applyRadarLayer();
      renderAllUI();
    },
    onSetRadarIndex: (idx) => {
      state.radar.currentIndex = idx;
      applyRadarLayer();
      renderAllUI();
    },
    onSetRadarOpacity: (op) => {
      state.radar.opacity = op;
      if (state.radar.tileLayer) state.radar.tileLayer.setOpacity(op);
      renderAllUI();
    },
    onRefresh: async () => {
      await refreshAlerts();
      renderAllUI();
    },
    onSelectRecent: (id) => openAlertFromId(id),
  });
}

/* ---------------------------
   Init
---------------------------- */

async function init() {
  state.map = createMap();

  state.alertsRenderer = createAlertsRenderer(state.map, state, {
    onOpenInspect: (ids) => showInspectFromAlertIds(ids),
    onStatus: (t) => setStatus(t)
  });

  // Map click -> point inspect
  let lastInspectSig = "";
   state.map.on("click", (e) => {
  const ids = state.alertsRenderer.getAlertIdsAtLatLng(e.latlng);

  const sheet = document.querySelector("#inspectSheet");
  const list = document.querySelector("#inspectList");

  if (!ids.length) {
    lastInspectSig = "";
    if (sheet && list) { sheet.classList.add("hidden"); list.innerHTML = ""; }
    return;
  }

  ids.sort();
  const sig = ids.join("|");
  if (sig === lastInspectSig && sheet && !sheet.classList.contains("hidden")) return;

  lastInspectSig = sig;
  showInspectFromAlertIds(ids);
});

    function stopEvent(e){
        e.preventDefault();
        e.stopPropagation();
    }

// Prevent “click-through” to the map for the entire sheet
    const inspectSheet = document.querySelector("#inspectSheet");
    if (inspectSheet) {
        inspectSheet.addEventListener("click", stopEvent, { passive: false });
        inspectSheet.addEventListener("mousedown", stopEvent, { passive: false });
        inspectSheet.addEventListener("touchstart", stopEvent, { passive: false });
        inspectSheet.addEventListener("touchend", stopEvent, { passive: false });
    }

  renderAllUI();

  try {
    await refreshRadar();
    await refreshAlerts();
    renderAllUI();
  } catch (e) {
    console.error(e);
    setStatus(String(e?.message || e), "bad");
  }

  // Scheduled refresh
  setInterval(() => refreshAlerts().then(renderAllUI).catch(console.warn), REFRESH_ALERTS_MS);
  setInterval(() => refreshRadar().then(() => { renderAllUI(); }).catch(console.warn), REFRESH_RADAR_MS);
}

init();