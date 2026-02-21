// js/services/nwsZones.js
const RAW_ZONE_CACHE = new Map(); // url -> Feature|null
const SIMP_CACHE = new Map();     // `${url}::tol:${tol}::z:${zoom}` -> Feature|null

function bboxIntersects(a, b) {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

function featureBBox(feature) {
  const g = feature?.geometry;
  if (!g) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  function walk(coords) {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const x = coords[0], y = coords[1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      return;
    }
    for (const c of coords) walk(c);
  }

  walk(g.coordinates);
  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

async function fetchZone(url) {
  if (!url || typeof url !== "string") return null;
  if (RAW_ZONE_CACHE.has(url)) return RAW_ZONE_CACHE.get(url);

  const res = await fetch(url, { headers: { "Accept": "application/geo+json" } });
  if (!res.ok) {
    RAW_ZONE_CACHE.set(url, null);
    return null;
  }

  const data = await res.json().catch(() => null);
  const feature = (data && data.type === "Feature") ? data : null;
  RAW_ZONE_CACHE.set(url, feature);
  return feature;
}

function toleranceForZoom(z) {
  if (z >= 11) return 0.6;
  if (z >= 9)  return 1.0;
  if (z >= 7)  return 1.8;
  return 3.0;
}

function simplifyRingToLngLat(ringLngLat, map, tolPx, zoom) {
  if (!Array.isArray(ringLngLat) || ringLngLat.length < 4) return ringLngLat;

  const pts = ringLngLat.map(([lng, lat]) => map.project([lat, lng], zoom));
  const simp = L.LineUtil.simplify(pts, tolPx);

  // SAFETY: don't collapse small rings into nothing
  if (!simp || simp.length < 4) return ringLngLat;

  const out = simp.map((p) => {
    const ll = map.unproject(p, zoom);
    return [ll.lng, ll.lat];
  });

  // ensure closed ring
  const a = out[0], b = out[out.length - 1];
  if (a && b && (a[0] !== b[0] || a[1] !== b[1])) out.push([a[0], a[1]]);
  return out;
}

function simplifyFeature(feature, map, tolPx, zoom) {
  if (!feature?.geometry) return null;

  const geom = feature.geometry;
  const type = geom.type;

  function simplifyPolygon(polyCoords) {
    return polyCoords.map(ring => simplifyRingToLngLat(ring, map, tolPx, zoom));
  }

  let outCoords = null;

  if (type === "Polygon") {
    outCoords = simplifyPolygon(geom.coordinates);
  } else if (type === "MultiPolygon") {
    outCoords = geom.coordinates.map(poly => simplifyPolygon(poly));
  } else {
    return feature;
  }

  return {
    type: "Feature",
    id: feature.id,
    properties: feature.properties || {},
    geometry: { type, coordinates: outCoords },
  };
}

/**
 * mode:
 *  - "viewport": only draw zones intersecting viewport bbox (fast)
 *  - "all": draw zones regardless of viewport (expensive)
 *
 * noZoneSlice:
 *  - false (default): take first maxZonesPerAlert
 *  - true: consider ALL affectedZones (still limited by maxTotalZones)
 */
export async function buildAlertDrawFeaturesOptimized(alertFeatures, map, {
  maxZonesPerAlert = 30,
  viewportPad = 0.55,
  mode = "viewport",
  noZoneSlice = false,
  maxTotalZones = 600,
  batchSize = 24,
} = {}) {
  const draw = [];

  const zoom = map.getZoom();
  const tolPx = toleranceForZoom(zoom);

  let viewportBBox = null;
  if (mode === "viewport") {
    const b = map.getBounds().pad(viewportPad);
    viewportBBox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }

  // 1) Keep real alert geometry
  for (const a of alertFeatures || []) {
    if (a?.geometry) draw.push(a);
  }

  // 2) Resolve zones for missing geometry
  const missing = (alertFeatures || []).filter(
    a => !a?.geometry && Array.isArray(a?.properties?.affectedZones) && a.properties.affectedZones.length
  );

  let totalZonesConsidered = 0;

  for (const alert of missing) {
    const allZones = alert.properties.affectedZones || [];
    const zones = noZoneSlice ? allZones : allZones.slice(0, maxZonesPerAlert);

    for (let i = 0; i < zones.length; i += batchSize) {
      if (totalZonesConsidered >= maxTotalZones) break;

      const chunk = zones.slice(i, i + batchSize);
      totalZonesConsidered += chunk.length;

      const results = await Promise.allSettled(chunk.map(fetchZone));

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status !== "fulfilled") continue;

        const zoneFeature = r.value;
        if (!zoneFeature?.geometry) continue;

        if (mode === "viewport" && viewportBBox) {
          const zbb = featureBBox(zoneFeature);
          if (zbb && !bboxIntersects(zbb, viewportBBox)) continue;
        }

        const url = chunk[j];
        const simpKey = `${url}::tol:${tolPx}::z:${zoom}`;

        let simp = SIMP_CACHE.get(simpKey);
        if (simp === undefined) {
          simp = simplifyFeature(zoneFeature, map, tolPx, zoom) || null;
          SIMP_CACHE.set(simpKey, simp);
        }
        if (!simp?.geometry) continue;

        draw.push({
          type: "Feature",
          id: `${alert.id}::zone::${simp.id || simp.properties?.id || Math.random().toString(36).slice(2)}`,
          geometry: simp.geometry,
          properties: {
            ...alert.properties,
            _geometrySource: "affectedZone",
            _zoneName: simp.properties?.name || simp.properties?.id || "",
          },
        });
      }
    }

    if (totalZonesConsidered >= maxTotalZones) break;
  }

  return draw;
}