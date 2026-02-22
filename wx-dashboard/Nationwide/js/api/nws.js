const NWS = "https://api.weather.gov";

async function nwsFetch(url) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/geo+json",
      // NWS requests a User-Agent with contact info in production. Replace with yours.
      "User-Agent": "NWS-Alerts-Dashboard (example@example.com)"
    }
  });
  if (!res.ok) throw new Error(`NWS ${res.status}: ${await res.text()}`);
  return res.json();
}

// Normalize into app-friendly shape
export function normalizeAlert(feature) {
  const p = feature.properties || {};
  return {
    id: feature.id || p.id || crypto.randomUUID(),
    name: p.event || "Alert",
    headline: p.headline || "",
    description: p.description || "",
    instruction: p.instruction || "",
    severity: p.severity || "Unknown",
    urgency: p.urgency || "Unknown",
    certainty: p.certainty || "Unknown",
    areaDesc: p.areaDesc || "",
    sent: p.sent || null,
    effective: p.effective || null,
    onset: p.onset || null,
    expires: p.expires || null,
    ends: p.ends || null,
    status: p.status || "",
    messageType: p.messageType || "",
    category: p.category || "",
    senderName: p.senderName || "",
    response: p.response || "",
    web: p.web || "",
    affectedZones: Array.isArray(p.affectedZones) ? p.affectedZones : [],
    geometry: feature.geometry || null,
    raw: feature
  };
}

// NWS active alerts (ALL)
export async function fetchActiveAlertsGeoJSON() {
  return nwsFetch(`${NWS}/alerts/active`);
}

// Zone geometry fallback (affectedZones gives URLs)
export async function fetchZoneFeature(zoneUrl) {
  // zoneUrl already full NWS URL, ex: https://api.weather.gov/zones/county/NYC...
  const zone = await nwsFetch(zoneUrl);
  // Zone response is GeoJSON feature
  return zone;
}