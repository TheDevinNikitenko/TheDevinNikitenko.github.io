// js/map/radarTimeline.js
export function createRadarTimelineLayer(map) {
  // IEM NEXRAD WMS-T endpoint (time-enabled radar)
  const WMS_URL = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi";

  // If this specific layer name ever changes, the app still loads;
  // you’d just see no radar until we swap the layer name.
  const layer = L.tileLayer.wms(WMS_URL, {
    layers: "nexrad-n0q-wmst",
    format: "image/png",
    transparent: true,
    opacity: 0.65,
    version: "1.3.0",
    zIndex: 300,
  }).addTo(map);

  function setFrame(frame) {
    if (!frame?.timeISO) return;
    layer.setParams({ time: frame.timeISO }, false);
  }

  return {
    setFrame,
    show() { if (!map.hasLayer(layer)) map.addLayer(layer); },
    hide() { if (map.hasLayer(layer)) map.removeLayer(layer); },
  };
}