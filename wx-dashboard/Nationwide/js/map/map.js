export function createMap() {
  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true,
    worldCopyJump: true
  }).setView([39.5, -98.35], 4);

  // Dark basemap (Carto Dark Matter)
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }
  ).addTo(map);

  return map;
}