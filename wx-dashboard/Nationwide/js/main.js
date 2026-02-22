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
const REFRESH_RADAR_MS = state.refresh.radarMs;

// RainViewer public endpoint restriction (per their error message)
const RAINVIEWER_MAX_NATIVE_ZOOM = 7;

/* ---------------------------
   Status
---------------------------- */
function setStatus(text, kind = "info") {
  state.ui.statusText = text;
  state.ui.statusKind = kind;
  renderStatus(state);
}

/* ---------------------------
   Popup (custom X inside HTML)
---------------------------- */
function openPopupAt(latlng, alertObj) {
  const html = state.alertsRenderer?._buildPopupHtml
    ? state.alertsRenderer._buildPopupHtml(alertObj)
    : `<div class="wxpop"><div class="wxpopTitle">${alertObj?.name || "Alert"}</div></div>`;

  const popup = L.popup({
    autoClose: false,
    closeOnClick: false,
    closeOnEscapeKey: false,
    className: "nwsPopup",
    closeButton: false, // we use the custom X
    maxWidth: 360
  })
    .setLatLng(latlng)
    .setContent(html)
    .openOn(state.map);

  // Bind the X to close THIS popup instance
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
    x.addEventListener("pointerup", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      state.map.closePopup(popup);
    }, { passive: false });
  }, 0);

  return popup;
}

/* ---------------------------
   Inspect sheet (desktop + iPad)
---------------------------- */
function bindInspectSheetOnce() {
  const sheet = document.querySelector("#inspectSheet");
  const closeBtn = document.querySelector("#inspectCloseBtn");

  if (sheet && !sheet.dataset.bound) {
    sheet.dataset.bound = "1";

    // Leaflet-safe: blocks click-through to map WITHOUT breaking buttons
    L.DomEvent.disableClickPropagation(sheet);
    L.DomEvent.disableScrollPropagation(sheet);

    // Helps iPad Safari
    sheet.style.touchAction = "manipulation";
  }

  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";

    const closeInspect = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const s = document.querySelector("#inspectSheet");
      const list = document.querySelector("#inspectList");
      if (s) s.classList.add("hidden");
      if (list) list.innerHTML = "";
    };

    // Works on desktop + iPad
    closeBtn.addEventListener("pointerup", closeInspect, { passive: false });
    closeBtn.addEventListener("click", closeInspect, { passive: false });
  }
}

function showInspectFromAlertIds(alertIds) {
  const sheet = document.querySelector("#inspectSheet");
  const list = document.querySelector("#inspectList");
  const sub = document.querySelector("#inspectSubtitle");

  if (!sheet || !list) return;

  const alerts = (alertIds || [])
    .map((id) => state.alertsById.get(id))
    .filter(Boolean)
    .sort((a, b) => (b.sent || "").localeCompare(a.sent || ""));

  if (!alerts.length) return;

  sheet.classList.remove("hidden");
  list.innerHTML = "";

  if (sub) {
    sub.textContent =
      alerts.length === 1
        ? "1 alert at this point. Tap to open."
        : `${alerts.length} alerts overlap here. Tap one to open.`;
  }

  const sevClass = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "extreme" || s === "severe") return "bad";
    if (s === "moderate") return "warn";
    if (s === "minor") return "ok";
    return "";
  };

  const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

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

    const open = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      sheet.classList.add("hidden");
      list.innerHTML = "";
      openAlertFromId(a.id);
    };

    // Desktop + iPad
    item.addEventListener("pointerup", open, { passive: false });
    item.addEventListener("click", open, { passive: false });

    list.appendChild(item);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------------------
   Bounds + movement
---------------------------- */
function getAlertBounds(alertId) {
  const r = state.alertsRenderer;
  if (!r) return null;

  let bounds = null;

  // Geometry alerts
  r.geometryLayer.eachLayer((layer) => {
    if (layer?._alertId !== alertId) return;
    const b = layer.getBounds?.();
    if (b?.isValid?.()) bounds = bounds ? bounds.extend(b) : b;
  });
  if (bounds?.isValid?.()) return bounds;

  // Zone-based alerts
  r.zoneLayer.eachLayer((layer) => {
    const ids = layer?._alertIds || [];
    if (!ids.includes(alertId)) return;
    const b = layer.getBounds?.();
    if (b?.isValid?.()) bounds = bounds ? bounds.extend(b) : b;
  });

  return bounds?.isValid?.() ? bounds : null;
}

function flyToAlert(alertId) {
  const b = getAlertBounds(alertId);
  if (!b) return null;

  const center = b.getCenter();

  // Use bounds zoom, but force a minimum so it "zooms in closer" even if already visible
  const fitZoom = state.map.getBoundsZoom(b.pad(0.20), false, [20, 20]);
  const minZoom = 9;
  const maxZoom = 12;
  const targetZoom = Math.max(minZoom, Math.min(maxZoom, fitZoom));

  state.map.flyTo(center, targetZoom, { animate: true, duration: 0.45 });
  return { center };
}

function openAlertFromId(alertId) {
  const a = state.alertsById.get(alertId);
  if (!a) return;

  const move = flyToAlert(alertId);
  const latlng = move?.center || state.map.getCenter();

  // open popup after movement ends (one-time)
  const onDone = () => {
    state.map.off("moveend", onDone);
    openPopupAt(latlng, a);
  };
  state.map.on("moveend", onDone);
}

/* ---------------------------
   Recent
---------------------------- */
function updateRecent(alerts) {
  for (const a of alerts) {
    if (!state.recent.seenIds.has(a.id)) {
      state.recent.seenIds.add(a.id);
      state.recent.items.unshift({ id: a.id, name: a.name, sent: a.sent, severity: a.severity });
      if (state.recent.items.length > state.recent.max) state.recent.items.pop();
    }
  }
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

  const TRANSPARENT_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Z3n0AAAAASUVORK5CYII=";

  state.radar.tileLayer = L.tileLayer(rainviewerTileUrl(ts), {
    opacity: state.radar.opacity,
    zIndex: 450,

    // Prevent ORB spam + disappearing tiles
    maxNativeZoom: RAINVIEWER_MAX_NATIVE_ZOOM,
    maxZoom: 18,
    errorTileUrl: TRANSPARENT_PNG,

    updateWhenZooming: false,
    updateWhenIdle: true,
    keepBuffer: 2,
    crossOrigin: "anonymous",
    referrerPolicy: "no-referrer"
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
   Alerts
---------------------------- */
async function refreshAlerts() {
  setStatus("Loading NWS alerts…");

  const gj = await fetchActiveAlertsGeoJSON();
  const normalized = (gj.features || []).map(normalizeAlert);

  state.alerts = normalized;
  state.alertsById = new Map(normalized.map((a) => [a.id, a]));
  updateRecent(normalized);

  setStatus(`Rendering ${normalized.length} alerts…`);
  await state.alertsRenderer.update(normalized);

  state.refresh.lastFetchIso = new Date().toISOString();
  setStatus(`Ready • ${normalized.length} alerts`, normalized.length ? "warn" : "ok");
}

/* ---------------------------
   UI render
---------------------------- */
function renderAllUI() {
  renderStatus(state);

  renderSidebar(state, {
    onSelectAlert: (id) => openAlertFromId(id)
  });

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
  // Ensure UI flags exist
  if (state.ui.rightPanelOpen == null) state.ui.rightPanelOpen = true;

  // Map
  state.map = createMap({
    tap: true // iPad Safari: better tap behavior for Leaflet
  });

  // Alerts renderer (deduped zones, canvas vectors, point inspect)
  state.alertsRenderer = createAlertsRenderer(state.map, state, {
    onOpenInspect: (ids) => showInspectFromAlertIds(ids),
    onStatus: (t) => setStatus(t)
  });

  // Bind inspect DOM handlers (desktop + iPad)
  bindInspectSheetOnce();

  // Map click ALWAYS opens/updates inspect (even if already open)
  state.map.on("click", (e) => {
    const ids = state.alertsRenderer.getAlertIdsAtLatLng(e.latlng);

    const sheet = document.querySelector("#inspectSheet");
    const list = document.querySelector("#inspectList");

    if (!ids.length) {
      if (sheet && list) { sheet.classList.add("hidden"); list.innerHTML = ""; }
      return;
    }

    showInspectFromAlertIds(ids);
  });

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
  setInterval(() => refreshRadar().then(renderAllUI).catch(console.warn), REFRESH_RADAR_MS);
}

init();