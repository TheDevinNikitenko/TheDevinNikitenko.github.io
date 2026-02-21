// js/map/alertsLayer.js
import { buildAlertPopupHtml } from "../ui/popup.js";

function severityColors(sev) {
  switch ((sev || "").toLowerCase()) {
    case "extreme": return { stroke: "#a855f7", fill: "#a855f7" };
    case "severe":  return { stroke: "#ef4444", fill: "#ef4444" };
    case "moderate":return { stroke: "#f59e0b", fill: "#f59e0b" };
    case "minor":   return { stroke: "#60a5fa", fill: "#60a5fa" };
    default:        return { stroke: "#94a3b8", fill: "#94a3b8" };
  }
}

function styleAlert(feature) {
  const p = feature?.properties || {};
  const sev = p.severity || "Unknown";
  const { stroke, fill } = severityColors(sev);
  const isZone = p._geometrySource === "affectedZone";

  return {
    color: stroke,
    weight: isZone ? 1.5 : 2.25,
    opacity: isZone ? 0.70 : 0.92,
    fillColor: fill,
    fillOpacity: isZone ? 0.06 : 0.12,
    lineCap: "round",
    lineJoin: "round",
  };
}

function baseAlertId(id) {
  if (!id) return "";
  const s = String(id);
  const i = s.indexOf("::zone::");
  return i >= 0 ? s.slice(0, i) : s;
}

export function createAlertsLayer(map) {
  const renderer = L.canvas({ padding: 0.5 });

  // ✅ ONE persistent popup owned by the map (won’t die on layer redraw)
  const persistentPopup = L.popup({
    autoClose: false,
    closeOnClick: false,
    closeButton: true,
    className: "weather-popup",
    maxWidth: 360,
  });

  // track layers by base id so menu clicks can find something to anchor to
  const layerIndex = new Map(); // baseId -> first layer we saw

  function openPersistentPopupFor(feature, latlng) {
    if (!feature) return;
    const html = buildAlertPopupHtml(feature);

    // If no anchor, use current map center
    const anchor = latlng || map.getCenter();

    persistentPopup
      .setLatLng(anchor)
      .setContent(html)
      .openOn(map);
  }

  const layer = L.geoJSON([], {
    renderer,
    style: styleAlert,
    smoothFactor: 1.0,

    // Ensure paths are clickable even on canvas
    interactive: true,

    onEachFeature: (feature, lyr) => {
      // Index by base id (so focusAlert can find a layer)
      const bid = baseAlertId(feature?.id);
      if (bid && !layerIndex.has(bid)) layerIndex.set(bid, lyr);

      // Hover
      lyr.on("mouseover", () => lyr.setStyle({ weight: 3.25, fillOpacity: 0.16 }));
      lyr.on("mouseout",  () => layer.resetStyle(lyr));

      // Click on map geometry
      lyr.on("click", (e) => {
        // ✅ Stop map click handlers from firing
        if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);

        // Anchor popup:
        // - Prefer click location
        // - Fallback to bounds center
        const anchor =
          e?.latlng ||
          (lyr.getBounds ? lyr.getBounds().getCenter() : map.getCenter());

        openPersistentPopupFor(feature, anchor);
      });
    },
  }).addTo(map);

  function setAlerts(featureCollection) {
    layer.clearLayers();
    layerIndex.clear();

    if (featureCollection?.features?.length) layer.addData(featureCollection);
    // NOTE: popup stays open because it’s owned by the map.
  }

  function focusAlert(alertFeature) {
    if (!alertFeature) return;

    const bid = baseAlertId(alertFeature.id);
    const lyr = bid ? layerIndex.get(bid) : null;

    if (lyr) {
      // zoom to it if we can
      if (lyr.getBounds) {
        map.fitBounds(lyr.getBounds().pad(0.18), { animate: true, duration: 0.45 });
        // open at its center (not dependent on click)
        const center = lyr.getBounds().getCenter();
        openPersistentPopupFor(alertFeature, center);
        return;
      }
    }

    // If it isn’t currently drawn, still open the popup (at map center)
    openPersistentPopupFor(alertFeature, map.getCenter());
  }

  return {
    setAlerts,
    focusAlert,
    show() { if (!map.hasLayer(layer)) layer.addTo(map); },
    hide() { if (map.hasLayer(layer)) map.removeLayer(layer); },
  };
}