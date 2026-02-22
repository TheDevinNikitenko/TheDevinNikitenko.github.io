// Uses Turf.js globals from CDN: turf.booleanPointInPolygon, turf.point

export function layerContainsLatLng(layer, latlng) {
  try {
    if (!layer) return false;

    // Leaflet GeoJSON layer: iterate sublayers
    if (layer.eachLayer) {
      let hit = false;
      layer.eachLayer((sub) => {
        if (hit) return;
        if (sub.getLatLng) {
          // point layer
          const ll = sub.getLatLng();
          if (ll && ll.distanceTo(latlng) < 20) hit = true; // ~20m
        } else if (sub.getBounds) {
          // polygon bounds quick check
          if (sub.getBounds().contains(latlng)) {
            // precise check via turf if possible
            const gj = sub.toGeoJSON?.();
            if (gj?.geometry && (gj.geometry.type === "Polygon" || gj.geometry.type === "MultiPolygon")) {
              const pt = turf.point([latlng.lng, latlng.lat]);
              if (turf.booleanPointInPolygon(pt, gj)) hit = true;
            } else {
              hit = true;
            }
          }
        }
      });
      return hit;
    }

    // Fallback
    if (layer.getBounds) return layer.getBounds().contains(latlng);
    return false;
  } catch {
    return false;
  }
}