// js/map/metarLayer.js
export function createMetarLayer(map) {
  // Canvas renderer = much faster and cleaner for lots of circles
  const renderer = L.canvas({ padding: 0.5 });

  const group = L.layerGroup();
  let enabled = false;

  function clear() {
    group.clearLayers();
  }

  function setMetars(items) {
    clear();

    if (!enabled) return;

    for (const it of items || []) {
      const station = it?.station;
      const obs = it?.obs;

      const coords = station?.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;

      const lon = coords[0];
      const lat = coords[1];

      const sid = station?.properties?.stationIdentifier || "Station";
      const name = station?.properties?.name || sid;

      const p = obs?.properties || {};
      const tempC = p.temperature?.value;
      const windMS = p.windSpeed?.value;
      const windDir = p.windDirection?.value;
      const text = p.textDescription || "";
      const ts = p.timestamp ? new Date(p.timestamp).toLocaleString() : "—";

      // Professional styling: subtle outlined dot with soft fill
      const marker = L.circleMarker([lat, lon], {
        renderer,
        radius: 4,
        weight: 2,
        opacity: 0.95,
        fillOpacity: 0.20,
        // Leaflet will use default stroke/fill colors; keep it minimal
      });

      marker.bindTooltip(`${sid}`, { direction: "top", offset: [0, -6], opacity: 0.85 });

      marker.bindPopup(
        `<div class="popup">
          <div class="popup__top">
            <div class="popup__title">${sid} — ${name}</div>
            <div class="popup__tag">OBS</div>
          </div>
          <div class="popup__meta">
            <div><span style="color:rgba(255,255,255,0.65)">Time:</span> ${ts}</div>
            <div><span style="color:rgba(255,255,255,0.65)">Temp:</span> ${Number.isFinite(tempC) ? tempC.toFixed(1)+"°C" : "—"}</div>
            <div><span style="color:rgba(255,255,255,0.65)">Wind:</span> ${Number.isFinite(windDir) ? Math.round(windDir)+"°" : "—"} ${Number.isFinite(windMS) ? (windMS.toFixed(1)+" m/s") : ""}</div>
          </div>
          <div class="popup__desc">${String(text)}</div>
        </div>`,
        { className: "weather-popup", maxWidth: 360 }
      );

      group.addLayer(marker);
    }
  }

  return {
    setMetars,

    show() {
      enabled = true;
      if (!map.hasLayer(group)) map.addLayer(group);
    },

    hide() {
      enabled = false;
      clear(); // IMPORTANT: remove speckles immediately
      if (map.hasLayer(group)) map.removeLayer(group);
    },
  };
}