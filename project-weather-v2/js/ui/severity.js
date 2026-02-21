export function severityColor(sev) {
  switch ((sev || "").toLowerCase()) {
    case "extreme": return "#ef4444";
    case "severe":  return "#f97316";
    case "moderate":return "#f59e0b";
    case "minor":   return "#60a5fa";
    default:        return "#a78bfa";
  }
}

export function severityStyle(feature) {
  const sev = feature?.properties?.severity || "Unknown";
  const c = severityColor(sev);
  return {
    color: c,
    weight: 2,
    opacity: 0.85,
    fillColor: c,
    fillOpacity: 0.18,
  };
}