export function createSpcLayer(map) {
  const geo = L.geoJSON([], {
    style: (f) => {
      const cat = (f?.properties?.LABEL || f?.properties?.label || "").toUpperCase();
      // simple style mapping
      const colors = {
        "TSTM": "#60a5fa",
        "MRGL": "#22c55e",
        "SLGT": "#f59e0b",
        "ENH": "#f97316",
        "MDT": "#ef4444",
        "HIGH": "#a78bfa",
      };
      const c = colors[cat] || "#93c5fd";
      return { color: c, weight: 2, opacity: 0.9, fillColor: c, fillOpacity: 0.12 };
    },
    onEachFeature: (f, layer) => {
      const cat = (f?.properties?.LABEL || f?.properties?.label || "SPC").toUpperCase();
      layer.bindTooltip(`SPC Day 1: ${cat}`, { sticky: true });
    }
  });

  return {
    setGeoJSON(fc) {
      geo.clearLayers();
      geo.addData(fc);
    },
    show() { if (!map.hasLayer(geo)) geo.addTo(map); },
    hide() { if (map.hasLayer(geo)) map.removeLayer(geo); },
  };
}