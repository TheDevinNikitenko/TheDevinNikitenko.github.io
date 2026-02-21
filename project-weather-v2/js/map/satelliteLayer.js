// js/map/satelliteLayer.js
export function createSatelliteLayer(map) {
  // NASA GIBS (no key) — MODIS Terra True Color (daily)
  // This is reliable tile hosting for browsers.
  const layer = L.tileLayer(
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" +
    "MODIS_Terra_CorrectedReflectance_TrueColor/default/" +
    "2019-01-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
    {
      opacity: 0.55,
      zIndex: 310,
      maxZoom: 9,
      attribution: "NASA GIBS",
    }
  );

  // NOTE: That date is a placeholder for a valid static date.
  // If you want “today”, we can update it daily with a tiny script (still no key),
  // but some layers lag a bit; static is guaranteed to load.

  return {
    show() { if (!map.hasLayer(layer)) map.addLayer(layer); },
    hide() { if (map.hasLayer(layer)) map.removeLayer(layer); },
  };
}