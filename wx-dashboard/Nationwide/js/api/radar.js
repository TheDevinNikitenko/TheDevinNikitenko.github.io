// RainViewer public API for radar timestamps.
// Docs: https://www.rainviewer.com/api.html
const RV = "https://api.rainviewer.com/public/weather-maps.json";

export async function fetchRadarTimestamps() {
  const res = await fetch(RV);
  if (!res.ok) throw new Error(`Radar ${res.status}`);
  const data = await res.json();

  // Prefer "radar.past" + "radar.nowcast" if present
  const past = data?.radar?.past || [];
  const now = data?.radar?.nowcast || [];
  const all = [...past, ...now].map(x => x.time).filter(Boolean);

  return all;
}

export function rainviewerTileUrl(ts) {
  // scheme: https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/2/1_1.png
  return `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/2/1_1.png`;
}