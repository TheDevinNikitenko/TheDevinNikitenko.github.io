// js/services/metar.js
const NWS = "https://api.weather.gov";

export async function fetchStationsInBBox(bounds, { limit = 60 } = {}) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;

  const url = `${NWS}/stations?bbox=${encodeURIComponent(bbox)}&limit=${limit}`;

  const res = await fetch(url, {
    headers: { "Accept": "application/geo+json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NWS stations failed ${res.status}: ${text.slice(0, 200)}`);
  }

  return await res.json();
}

export async function fetchLatestObservation(stationId) {
  const url = `${NWS}/stations/${encodeURIComponent(stationId)}/observations/latest`;

  const res = await fetch(url, {
    headers: { "Accept": "application/geo+json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Obs latest failed ${stationId} ${res.status}: ${text.slice(0, 200)}`);
  }

  return await res.json();
}