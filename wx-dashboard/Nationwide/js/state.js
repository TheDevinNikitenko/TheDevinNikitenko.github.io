export const state = {
  map: null,

  // data
  alerts: [],                 // normalized alert objects
  alertsById: new Map(),       // id -> alert
  alertLayersById: new Map(),  // id -> L.LayerGroup or L.GeoJSON
  zonesCache: new Map(),       // zoneUrl -> zoneGeoJSON feature or null

  // radar
  radar: {
    timestamps: [],
    currentIndex: 0,
    tileLayer: null,
    opacity: 0.75,
    enabled: true,
  },

  // UI / filters
  ui: {
    statusText: "Booting…",
    statusKind: "info", // info|ok|warn|bad
    search: "",
    filterKinds: new Set(["Warning","Watch","Advisory","Statement","Other"]),
    severity: "Any", // Any|Extreme|Severe|Moderate|Minor|Unknown
  },

  // recently added
  recent: {
    max: 20,
    seenIds: new Set(),
    items: [], // {id, name, sent, severity}
  },

  // refresh
  refresh: {
    alertsMs: 60_000,
    radarMs: 2 * 60_000,
    lastFetchIso: null,
  }
};