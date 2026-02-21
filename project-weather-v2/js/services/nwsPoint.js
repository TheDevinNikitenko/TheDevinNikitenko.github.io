// js/services/nwsPoint.js
const NWS = "https://api.weather.gov";

export async function fetchAlertsAtPoint(lat, lon) {
  const url = `${NWS}/alerts/active?point=${encodeURIComponent(`${lat},${lon}`)}`;
  const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
  if (!res.ok) throw new Error(`alerts at point failed ${res.status}`);
  return await res.json();
}

// Sample center + corners of viewport, merge unique alerts by id.
// This is the key to "show ALL alerts in viewport deterministically".
export async function fetchAlertsForViewportSamples(map) {
  const b = map.getBounds();
  const pts = [
    map.getCenter(),
    b.getNorthWest(),
    b.getNorthEast(),
    b.getSouthWest(),
    b.getSouthEast(),
  ];

  const results = await Promise.allSettled(
    pts.map(p => fetchAlertsAtPoint(p.lat, p.lng))
  );

  const byId = new Map();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const f of (r.value?.features || [])) {
      if (f?.id) byId.set(f.id, f);
    }
  }
  return Array.from(byId.values());
}