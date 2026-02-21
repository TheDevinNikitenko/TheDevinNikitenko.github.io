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

export function createAlertsLayer(map) {
  const renderer = L.canvas({ padding: 0.5 });

  const layer = L.geoJSON([], {
    renderer,
    style: styleAlert,
    smoothFactor: 1.0,
    onEachFeature: (feature, lyr) => {
      lyr.on("mouseover", () => lyr.setStyle({ weight: 3.25, fillOpacity: 0.16 }));
      lyr.on("mouseout", () => layer.resetStyle(lyr));
      lyr.on("click", () => {
        lyr.bindPopup(buildAlertPopupHtml(feature), {
          className: "weather-popup",
          closeButton: true,
          autoPan: true,
          maxWidth: 360,
        }).openPopup();
      });
    },
  }).addTo(map);

  function setAlerts(featureCollection) {
    layer.clearLayers();
    if (featureCollection?.features?.length) layer.addData(featureCollection);
  }

  function focusAlert(alertFeature) {
    const id = alertFeature?.id || "";
    const matching = [];

    layer.eachLayer((lyr) => {
      const fid = lyr?.feature?.id || "";
      if (fid === id || fid.startsWith(`${id}::zone::`)) matching.push(lyr);
    });

    if (matching.length) {
      const fg = L.featureGroup(matching);
      map.fitBounds(fg.getBounds().pad(0.18), { animate: true, duration: 0.45 });
      matching[0].fire("click");
      return;
    }

    L.popup({ className: "weather-popup", maxWidth: 360 })
      .setLatLng(map.getCenter())
      .setContent(buildAlertPopupHtml(alertFeature))
      .openOn(map);
  }

  return {
    setAlerts,
    focusAlert,
    show() { if (!map.hasLayer(layer)) layer.addTo(map); },
    hide() { if (map.hasLayer(layer)) map.removeLayer(layer); },
  };
}