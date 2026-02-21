// NOAA MapServer: outlooks/SPC_wx_outlks
// Layer ids are in the service JSON; Day 1 Categorical Outlook is id=1. :contentReference[oaicite:10]{index=10}
const SPC_BASE = "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer";

export async function fetchSpcDay1CategoricalGeoJSON() {
  const layerId = 1;

  const params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    f: "geojson",
  });

  const url = `${SPC_BASE}/${layerId}/query?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SPC failed: ${res.status}`);
  return await res.json();
}