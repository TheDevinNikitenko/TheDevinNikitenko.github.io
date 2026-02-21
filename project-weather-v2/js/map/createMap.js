export function createMap(domId, { perfMode = true } = {}) {
  const map = L.map(domId, {
    zoomControl: true,
    preferCanvas: perfMode,
    renderer: perfMode ? L.canvas() : undefined,
    closePopupOnClick: false
  });

  // right after const map = L.map(...)
  window.__leafletMap = map;

  // Dark basemap (no key)
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }
  ).addTo(map);

  map.setView([40.72, -73.5], 9);
  return map;
}