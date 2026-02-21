// js/services/nws.js
const NWS = "https://api.weather.gov";

export async function fetchActiveAlerts() {
  const url = `${NWS}/alerts/active`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/geo+json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NWS alerts failed ${res.status}: ${text.slice(0, 200)}`);
  }

  return await res.json();
}